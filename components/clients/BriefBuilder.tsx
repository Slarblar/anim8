'use client';

import { put } from '@vercel/blob/client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Quantum } from 'ldrs/react';
import 'ldrs/react/Quantum.css';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminDatePicker } from '@/components/admin/AdminDatePicker';
import { ClientPortalShell } from './ClientPortalShell';
import { BRIEF_BUILDER_TOOLTIP } from './BriefBuilderButton';
import { BriefQuestionVisual } from './BriefQuestionVisual';
import {
  CATEGORY_LABELS,
  BRIEF_CATEGORIES,
  dueWithin48Hours,
  assembleBriefSubtasks,
  PIECE_COUNT_MAX,
  PIECE_COUNT_MIN,
  type BriefAnswer,
  type BriefCategory,
  type BriefFollowUp,
  type BriefIntake,
  type ClientReviewBrief,
} from '@/lib/brief-schema';
import { formatPortalDisplayName, portalEyebrow } from './portal-ui';

type BriefBuilderProps = {
  slug: string;
  displayName: string;
};

type Step = 'project' | 'pieces' | 'timing' | 'inspo' | 'questions' | 'review' | 'sent';

const STEP_COPY: Record<Step, { kicker: string; title: string; blurb: string }> = {
  project: {
    kicker: 'Step 1',
    title: 'What are we making?',
    blurb: 'Give us the shape of it. Rough is fine — we’ll tighten it together.',
  },
  pieces: {
    kicker: 'Step 2',
    title: 'How many pieces?',
    blurb: 'Each one becomes its own task. Set the number and we’ll build the list.',
  },
  timing: {
    kicker: 'Step 2',
    title: 'When and what vibe',
    blurb: 'A date to work back from, plus how it should feel.',
  },
  inspo: {
    kicker: 'Step 3',
    title: 'Show us the inspo',
    blurb: 'Links or files. A reel you loved says more than a paragraph.',
  },
  questions: {
    kicker: 'Step 4',
    title: 'A couple things',
    blurb: 'Answer what you know. Skip whatever you want us to call.',
  },
  review: {
    kicker: 'Step 5',
    title: 'Look this over',
    blurb: 'Change anything that doesn’t sound like you, then send it.',
  },
  sent: {
    kicker: 'Done',
    title: 'Brief’s in',
    blurb: 'The squad’s on it!',
  },
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_QUESTION_ROUNDS = 2;
const MAX_LINKS = 8;
const LINK_PLACEHOLDERS = ['Instagram link', 'TikTok link', 'Anything else that nails it'];

const fieldBase =
  'brief-field mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 min-[480px]:text-[0.9375rem]';
const labelBase = 'block text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 font-mono';
const helpBase = 'text-sm leading-relaxed text-white/50';

const btnPrimary =
  'relative inline-flex w-full min-[480px]:w-auto items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-brand-black disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'inline-flex w-full min-[480px]:w-auto items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/70 transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-brand-cyan/45 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_10px_28px_rgba(56,194,214,0.14)] disabled:opacity-40';

const pressSpring = { type: 'spring' as const, stiffness: 480, damping: 28, mass: 0.5 };
const pressVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.035, y: -3 },
  tap: { scale: 0.97, y: 0 },
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function fileSummaryLabel(files: File[]): string {
  if (files.length === 0) return 'Nothing added yet';
  if (files.length === 1) return files[0].name;
  return `${files.length} files added`;
}

async function readJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    return {} as T;
  }
}

function safeBlobPathname(slug: string, fileName: string): string {
  const base = fileName.replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `client-portal/${slug}/${Date.now()}-${base || 'file'}`;
}

async function uploadAttachment(slug: string, file: File): Promise<string> {
  const pathname = safeBlobPathname(slug, file.name);
  const tokenRes = await fetch(`/api/clients/${slug}/blob`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname, clientPayload: null, multipart: true },
    }),
  });
  const tokenData = await readJson<{ clientToken?: string; error?: string }>(tokenRes);
  if (!tokenRes.ok || !tokenData.clientToken) {
    throw new Error(tokenData.error ?? "Those files didn't go through. Try again, or skip them and paste a link.");
  }
  const blob = await put(pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    multipart: true,
  });
  return blob.url;
}

function cleanLink(item: string): string | null {
  const trimmed = item.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return withProtocol;
  } catch {
    return null;
  }
}

const MotionLink = motion(Link);

/** Continue button — lime sweeping through brand green, white label, thin glint. */
function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const reduce = useReducedMotion();
  const live = !reduce && !disabled;
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-ready={!disabled ? 'true' : undefined}
      className={`${btnPrimary} brief-go !text-white`}
      initial="rest"
      whileHover={live ? 'hover' : undefined}
      whileTap={live ? 'tap' : undefined}
      variants={pressVariants}
      transition={pressSpring}
    >
      <span className="brief-go-fill pointer-events-none absolute inset-0" aria-hidden />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[14%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        variants={{
          rest: { x: '-180%', opacity: 0 },
          hover: { x: '720%', opacity: 0.55 },
          tap: { x: '720%', opacity: 0.2 },
        }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

function GhostButton({
  children,
  onClick,
  href,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const live = !reduce && !disabled;
  const shared = {
    className: btnGhost,
    initial: 'rest' as const,
    whileHover: live ? ('hover' as const) : undefined,
    whileTap: live ? ('tap' as const) : undefined,
    variants: {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.025, y: -2 },
      tap: { scale: 0.98, y: 0 },
    },
    transition: pressSpring,
  };
  if (href) {
    return (
      <MotionLink href={href} {...shared}>
        {children}
      </MotionLink>
    );
  }
  return (
    <motion.button type="button" disabled={disabled} onClick={onClick} {...shared}>
      {children}
    </motion.button>
  );
}

function PieceStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const reduce = useReducedMotion();
  function setCount(next: number) {
    if (!Number.isFinite(next)) return;
    onChange(Math.min(PIECE_COUNT_MAX, Math.max(PIECE_COUNT_MIN, Math.round(next))));
  }

  return (
    <div className="brief-stepper mt-2 flex w-full max-w-[11rem] items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
      <input
        inputMode="numeric"
        aria-label="How many pieces"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          if (!digits) {
            onChange(PIECE_COUNT_MIN);
            return;
          }
          setCount(Number(digits));
        }}
        className="w-full bg-transparent px-3 py-3 text-center text-lg font-bold text-white outline-none"
      />
      <div className="flex w-9 flex-col border-l border-white/10">
        <motion.button
          type="button"
          aria-label="More pieces"
          disabled={value >= PIECE_COUNT_MAX}
          onClick={() => setCount(value + 1)}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="flex flex-1 items-center justify-center text-[10px] text-brand-lime transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          ▲
        </motion.button>
        <motion.button
          type="button"
          aria-label="Fewer pieces"
          disabled={value <= PIECE_COUNT_MIN}
          onClick={() => setCount(value - 1)}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="flex flex-1 items-center justify-center border-t border-white/10 text-[10px] text-brand-lime transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          ▼
        </motion.button>
      </div>
    </div>
  );
}

function NudgeButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      whileHover={reduce ? undefined : { x: 4 }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      transition={pressSpring}
    >
      {children}
    </motion.button>
  );
}

function pieceCountApplies(projectType: string, description: string): boolean {
  const text = `${projectType} ${description}`;
  if (/\b(a|one|single)\s+(podcast|poster|logo|deck|video|edit)\b/i.test(text) && !/\b\d{1,2}\s+\w/.test(text)) {
    return false;
  }
  return /\b(\d{1,2}\s+)?(reels|shorts|shortform|videos|cutdowns|episodes|posts|stories|carousels|assets|clips|pieces|deliverables|series|weekly|batch|campaign)\b/i.test(
    text
  );
}

function suggestedPieceCount(projectType: string, description: string): number | null {
  const match = `${projectType} ${description}`.match(
    /\b(\d{1,2})\s+(?:\w+\s+){0,4}(reels?|shorts?|shortform|videos?|cutdowns?|episodes?|posts?|pieces?|assets?|clips?)\b/i
  );
  if (!match) return null;
  const count = Number(match[1]);
  if (count < PIECE_COUNT_MIN || count > PIECE_COUNT_MAX) return null;
  return count;
}

function briefPath(pieces: boolean, questionRounds: number): string[] {
  const path = ['project'];
  if (pieces) path.push('pieces');
  path.push('timing', 'inspo');
  for (let round = 1; round <= questionRounds; round += 1) path.push(`questions-${round}`);
  path.push('review');
  return path;
}

function briefActiveKey(step: Step, questionRound: number): string {
  if (step === 'questions') return `questions-${Math.max(questionRound, 1)}`;
  if (step === 'sent') return 'sent';
  return step;
}

function ProgressRail({
  path,
  activeKey,
  kicker,
}: {
  path: string[];
  activeKey: string;
  kicker: string;
}) {
  const active = activeKey === 'sent' ? path.length : Math.max(0, path.indexOf(activeKey));
  const pct = activeKey === 'sent' ? 100 : Math.round(((active + 1) / path.length) * 100);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AnimatePresence initial={false}>
            {path.map((key, index) => {
              const state = activeKey === 'sent' || index < active ? 'done' : index === active ? 'current' : 'todo';
              return (
                <motion.span
                  key={key}
                  className="relative grid h-3.5 w-3.5 place-items-center"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                >
                  {state === 'current' ? (
                    <motion.span
                      layoutId="brief-step-current"
                      className="h-2.5 w-2.5 rounded-full bg-brand-lime shadow-[0_0_0_4px_rgba(124,193,66,0.16)]"
                      transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                    />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${state === 'done' ? 'bg-brand-cyan' : 'bg-white/20'}`} />
                  )}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          {kicker}
        </span>
      </div>
      <div className="portal-progress-track mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="portal-progress-fill"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.7 }}
        />
      </div>
    </div>
  );
}

/** Covers the card while a model call runs. Quantum is a stand-in until we draw our own. */
function BusyVeil({ label, progress }: { label: string; progress: number | null }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-[24px] bg-[#07080d]/90 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      role="status"
      aria-live="polite"
    >
      <div className="relative grid place-items-center">
        <span className="brief-loader-glow" aria-hidden />
        <Quantum size={84} speed={reduce ? 0 : 1.35} color="#7cc142" />
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-white">{label}</p>
      {progress != null ? (
        <div className="portal-progress-track relative h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="portal-progress-fill"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

export function BriefBuilder({ slug, displayName }: BriefBuilderProps) {
  const reduce = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUrlsRef = useRef<string[]>([]);
  const aliveRef = useRef(true);
  const submitTimerRef = useRef<number | null>(null);

  const [step, setStep] = useState<Step>('project');
  const [direction, setDirection] = useState(1);

  const [projectType, setProjectType] = useState('');
  const [pieceCount, setPieceCount] = useState(1);
  const [askPieces, setAskPieces] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [links, setLinks] = useState(['', '', '']);
  const [files, setFiles] = useState<File[]>([]);
  const [fileSummary, setFileSummary] = useState('Nothing added yet');

  const [answers, setAnswers] = useState<BriefAnswer[]>([]);
  const [questions, setQuestions] = useState<BriefFollowUp[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [questionRound, setQuestionRound] = useState(0);
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);

  const [brief, setBrief] = useState<ClientReviewBrief | null>(null);
  const [effortToken, setEffortToken] = useState('');
  const [largeJob, setLargeJob] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Working');
  const [busyProgress, setBusyProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (submitTimerRef.current != null) window.clearInterval(submitTimerRef.current);
    };
  }, []);

  function continueFromProject() {
    const applies = pieceCountApplies(projectType, description);
    setAskPieces(applies);
    if (!applies) {
      goTo('timing', 1);
      return;
    }
    const suggested = suggestedPieceCount(projectType, description);
    if (suggested) setPieceCount(suggested);
    goTo('pieces', 1);
  }

  function goTo(next: Step, dir: number) {
    setDirection(dir);
    setError(null);
    setStep(next);
  }

  function stopSubmitTimer() {
    if (submitTimerRef.current == null) return;
    window.clearInterval(submitTimerRef.current);
    submitTimerRef.current = null;
  }

  function changePieceCount(next: number) {
    const count = Math.min(PIECE_COUNT_MAX, Math.max(PIECE_COUNT_MIN, Math.round(next)));
    setPieceCount(count);
    setBrief((current) =>
      current
        ? {
            ...current,
            suggested_subtasks: assembleBriefSubtasks(
              current.deliverables,
              current.suggested_subtasks,
              count,
              projectType
            ),
          }
        : current
    );
  }

  function intakeBody(uploads: string[]): BriefIntake {
    return {
      project_type: projectType.trim(),
      description: description.trim(),
      due_date: dueDate,
      creative_direction: creativeDirection.trim(),
      piece_count: askPieces ? pieceCount : undefined,
      reference_links: links.map(cleanLink).filter((item): item is string => !!item).slice(0, MAX_LINKS),
      reference_uploads: uploads,
    };
  }

  async function ensureUploads(): Promise<string[]> {
    if (uploadUrlsRef.current.length > 0 || files.length === 0) return uploadUrlsRef.current;
    if (files.length > MAX_FILES) throw new Error('Five files is the max.');
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      throw new Error('Each file needs to be 50 MB or smaller.');
    }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      throw new Error("That's over 50 MB altogether. Pull a couple, or paste a Drive link.");
    }

    const urls: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      setBusyLabel(`Uploading ${i + 1} of ${files.length}`);
      setBusyProgress(Math.round((i / files.length) * 100));
      urls.push(await uploadAttachment(slug, files[i]));
    }
    setBusyProgress(null);
    uploadUrlsRef.current = urls;
    return urls;
  }

  async function callBrief<T>(action: 'refine' | 'finalize' | 'submit', body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`/api/clients/${slug}/brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await readJson<Record<string, unknown>>(res);
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Something hiccuped. Try again.');
    }
    return data as T;
  }

  function collectAnswers(): BriefAnswer[] {
    return [
      ...answers,
      ...questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        answer: (draftAnswers[question.id] ?? '').trim(),
      })),
    ].filter((item) => item.answer);
  }

  async function runFinalize(nextAnswers: BriefAnswer[]) {
    setBusy(true);
    setBusyLabel('Writing it up');
    setBusyProgress(null);
    setError(null);
    try {
      const uploads = await ensureUploads();
      const data = await callBrief<{
        brief?: ClientReviewBrief;
        effortToken?: string;
        largeJob?: boolean;
      }>('finalize', { intake: intakeBody(uploads), answers: nextAnswers });

      if (!data.brief || !data.effortToken) {
        throw new Error("We couldn't write that up. Give it another try.");
      }
      setAnswers(nextAnswers);
      setBrief(data.brief);
      setEffortToken(data.effortToken);
      setLargeJob(data.largeJob === true);
      goTo('review', 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't write that up. Give it another try.");
    } finally {
      setBusy(false);
      setBusyProgress(null);
    }
  }

  async function runRefine(nextAnswers: BriefAnswer[], round: number) {
    setBusy(true);
    setBusyLabel(round === 0 ? 'Reading this' : 'One more look');
    setBusyProgress(null);
    setError(null);
    try {
      const uploads = await ensureUploads();
      const data = await callBrief<{ ready?: boolean; questions?: BriefFollowUp[] }>('refine', {
        intake: intakeBody(uploads),
        answers: nextAnswers,
      });

      if (data.ready || !data.questions?.length) {
        await runFinalize(nextAnswers);
        return;
      }
      setAnswers(nextAnswers);
      setQuestions(data.questions);
      setDraftAnswers({});
      setQuestionRound(round + 1);
      goTo('questions', 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!brief || !effortToken || busy) return;
    setBusy(true);
    setBusyLabel('Sending it over');
    setBusyProgress(6);
    setError(null);

    const started = Date.now();
    stopSubmitTimer();
    submitTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setBusyProgress(Math.min(92, 6 + 86 * (1 - Math.exp(-elapsed / 3000))));
    }, 100);

    try {
      await callBrief('submit', {
        intake: intakeBody(uploadUrlsRef.current),
        answers,
        brief,
        effortToken,
      });
      stopSubmitTimer();
      if (!aliveRef.current) return;
      setBusyProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      if (!aliveRef.current) return;
      goTo('sent', 1);
    } catch (err) {
      stopSubmitTimer();
      if (!aliveRef.current) return;
      setError(err instanceof Error ? err.message : "We couldn't send that. Try again in a second.");
    } finally {
      if (aliveRef.current) {
        setBusy(false);
        setBusyProgress(null);
      }
    }
  }

  const canLeaveProject = projectType.trim().length > 0 && description.trim().length > 0;
  const canLeaveTiming = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const rush = largeJob && dueWithin48Hours(dueDate);

  const slide = {
    enter: (dir: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 32 : -32, filter: 'blur(8px)' },
    center: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: reduce
        ? { duration: 0.2 }
        : {
            x: { type: 'spring' as const, stiffness: 280, damping: 30, mass: 0.75 },
            opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
            filter: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
            staggerChildren: 0.055,
            delayChildren: 0.02,
          },
    },
    exit: (dir: number) =>
      reduce
        ? { opacity: 0, transition: { duration: 0.15 } }
        : {
            opacity: 0,
            x: dir > 0 ? -22 : 22,
            filter: 'blur(6px)',
            transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
          },
  };

  const rise = {
    enter: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    center: {
      opacity: 1,
      y: 0,
      transition: reduce
        ? { duration: 0.2 }
        : { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.6 },
    },
  };

  const railPath = briefPath(
    step === 'project' ? pieceCountApplies(projectType, description) : askPieces,
    step === 'questions' ? Math.max(questionRound, 1) : questionRound
  );
  const railKey = briefActiveKey(step, questionRound);
  const railStep = railPath.indexOf(railKey);

  return (
    <ClientPortalShell slug={slug} backHref={`/clients/${slug}`} backLabel="← Portal">
      <header className="pb-2 pt-1 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className="mt-2 text-[clamp(1.75rem,5vw,2.75rem)] font-black uppercase leading-[1.05] tracking-tight text-white">
          Brief builder
        </h1>
        <p className={`${helpBase} mt-3 max-w-2xl`}>
          {BRIEF_BUILDER_TOOLTIP} This one’s for {formatPortalDisplayName(displayName)}.
        </p>
        <ProgressRail
          path={railPath}
          activeKey={railKey}
          kicker={step === 'sent' ? 'Done' : `Step ${railStep + 1}`}
        />
      </header>

      <div className="relative mt-6 min-[480px]:mt-8">
        <span className="brief-aurora" aria-hidden />

        <AnimatePresence>
          {error ? (
            <motion.p
              className="mb-4 rounded-2xl border border-brand-pink/35 bg-brand-pink/10 px-5 py-4 text-sm text-red-100"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="alert"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <motion.div
          layout
          className="brief-card relative overflow-hidden p-5 min-[480px]:p-7 md:p-8"
          transition={{ layout: { type: 'spring', stiffness: 260, damping: 32 } }}
        >
          <AnimatePresence>{busy ? <BusyVeil label={busyLabel} progress={busyProgress} /> : null}</AnimatePresence>

          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.h2
                variants={rise}
                className={`text-xl font-black uppercase tracking-tight text-white min-[480px]:text-2xl ${
                  step === 'sent' ? 'text-center' : ''
                }`}
              >
                {STEP_COPY[step].title}
              </motion.h2>
              <motion.p variants={rise} className={`${helpBase} mt-2 ${step === 'sent' ? 'text-center' : ''}`}>
                {STEP_COPY[step].blurb}
              </motion.p>

              {step === 'project' ? (
                <motion.div variants={rise} className="mt-6 space-y-5">
                  <label className="block">
                    <span className={labelBase}>The project</span>
                    <input
                      autoFocus
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className={fieldBase}
                      placeholder="Short videos for the series, a podcast cut, a poster…"
                    />
                  </label>
                  <label className="block">
                    <span className={labelBase}>The gist</span>
                    <textarea
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`${fieldBase} resize-y`}
                      placeholder="Who it’s for, what it needs to do, and anything that’s non-negotiable."
                    />
                  </label>
                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton disabled={!canLeaveProject} onClick={continueFromProject}>
                      Next
                    </PrimaryButton>
                    <GhostButton href={`/clients/${slug}`}>Cancel</GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'pieces' ? (
                <motion.div variants={rise} className="mt-6 space-y-5">
                  <div>
                    <span className={labelBase}>How many pieces</span>
                    <PieceStepper value={pieceCount} onChange={changePieceCount} />
                    <p className={`${helpBase} mt-2 text-xs`}>
                      Ten short videos means ten tasks. One-off projects skip this.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton onClick={() => goTo('timing', 1)}>Next</PrimaryButton>
                    <GhostButton onClick={() => goTo('project', -1)}>Back</GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'timing' ? (
                <motion.div variants={rise} className="mt-6 space-y-5">
                  <div>
                    <span className={labelBase}>Need it by</span>
                    <AdminDatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      min={todayIso()}
                      placeholder="Pick a date"
                      aria-label="Need it by"
                      triggerClassName={fieldBase}
                    />
                  </div>
                  <label className="block">
                    <span className={labelBase}>The vibe</span>
                    <textarea
                      rows={5}
                      value={creativeDirection}
                      onChange={(e) => setCreativeDirection(e.target.value)}
                      className={`${fieldBase} resize-y`}
                      placeholder="Tone, things to lean into, things to stay away from."
                    />
                  </label>
                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton disabled={!canLeaveTiming} onClick={() => goTo('inspo', 1)}>
                      Next
                    </PrimaryButton>
                    <GhostButton onClick={() => goTo(askPieces ? 'pieces' : 'project', -1)}>Back</GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'inspo' ? (
                <motion.div variants={rise} className="mt-6 space-y-5">
                  <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {links.map((value, index) => (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={pressSpring}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={value}
                          onChange={(e) =>
                            setLinks((current) =>
                              current.map((item, itemIndex) => (itemIndex === index ? e.target.value : item))
                            )
                          }
                          className={`${fieldBase} !mt-0`}
                          placeholder={LINK_PLACEHOLDERS[index] ?? 'Another link'}
                          inputMode="url"
                          aria-label={LINK_PLACEHOLDERS[index] ?? `Link ${index + 1}`}
                        />
                        {links.length > 3 ? (
                          <NudgeButton
                            className="shrink-0 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white"
                            onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
                          >
                            Remove
                          </NudgeButton>
                        ) : null}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  </div>

                  {links.length < MAX_LINKS ? (
                    <NudgeButton
                      className="text-xs font-bold uppercase tracking-wider text-brand-lime hover:text-white"
                      onClick={() => setLinks((current) => [...current, ''])}
                    >
                      + Add another
                    </NudgeButton>
                  ) : null}

                  <div className="rounded-2xl border border-dashed border-white/12 p-4">
                    <span className={labelBase} id="brief-files-label">
                      Or drop in files
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="sr-only"
                      aria-labelledby="brief-files-label"
                      onChange={(e) => {
                        const next = Array.from(e.target.files ?? []).filter((file) => file.size > 0);
                        setFiles(next);
                        uploadUrlsRef.current = [];
                        setFileSummary(fileSummaryLabel(next));
                      }}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <motion.button
                        type="button"
                        className="rounded-lg bg-brand-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-black"
                        onClick={() => fileInputRef.current?.click()}
                        initial="rest"
                        whileHover={reduce ? undefined : 'hover'}
                        whileTap={reduce ? undefined : 'tap'}
                        variants={pressVariants}
                        transition={pressSpring}
                      >
                        Add files
                      </motion.button>
                      <span className="min-w-0 text-sm text-white/45">{fileSummary}</span>
                    </div>
                    <p className={`${helpBase} mt-2 text-xs`}>Up to 5 files, 50 MB altogether.</p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton onClick={() => void runRefine(answers, 0)}>Build my brief</PrimaryButton>
                    <GhostButton onClick={() => goTo('timing', -1)}>Back</GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'questions' ? (
                <motion.div variants={rise} className="mt-6 space-y-6">
                  {questions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 min-[480px]:gap-x-4"
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...pressSpring, delay: index * 0.05 }}
                    >
                      <p className="col-span-2 text-sm leading-snug text-white min-[480px]:text-base">
                        {question.prompt}
                      </p>
                      <BriefQuestionVisual prompt={question.prompt} active={focusedQuestion === question.id} />
                      <textarea
                        rows={3}
                        value={draftAnswers[question.id] ?? ''}
                        onChange={(e) =>
                          setDraftAnswers((current) => ({ ...current, [question.id]: e.target.value }))
                        }
                        onFocus={() => setFocusedQuestion(question.id)}
                        aria-label={question.prompt}
                        className={`${fieldBase} !mt-0 resize-y`}
                      />
                    </motion.div>
                  ))}
                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton
                      onClick={() => {
                        const next = collectAnswers();
                        if (questionRound >= MAX_QUESTION_ROUNDS) void runFinalize(next);
                        else void runRefine(next, questionRound);
                      }}
                    >
                      Keep going
                    </PrimaryButton>
                    <GhostButton onClick={() => void runFinalize(collectAnswers())}>
                      That’s enough, write it up
                    </GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'review' && brief ? (
                <motion.div variants={rise} className="mt-6 space-y-5">
                  {rush ? (
                    <p className="rounded-2xl border border-brand-pink/35 bg-brand-pink/10 px-5 py-4 text-sm text-red-100">
                      That date is pretty tight, so a rush fee applies.
                    </p>
                  ) : null}

                  <label className="block">
                    <span className={labelBase}>What we’ll call it</span>
                    <input
                      value={brief.title}
                      onChange={(e) => setBrief({ ...brief, title: e.target.value })}
                      className={fieldBase}
                    />
                  </label>

                  <div className="grid gap-5 min-[480px]:grid-cols-2">
                    <label className="block">
                      <span className={labelBase}>Kind of work</span>
                      <select
                        value={brief.category}
                        onChange={(e) => setBrief({ ...brief, category: e.target.value as BriefCategory })}
                        className={fieldBase}
                      >
                        {BRIEF_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {CATEGORY_LABELS[category]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span className={labelBase}>Needed by</span>
                      <AdminDatePicker
                        value={dueDate}
                        onChange={setDueDate}
                        min={todayIso()}
                        placeholder="Pick a date"
                        aria-label="Needed by"
                        triggerClassName={fieldBase}
                      />
                    </div>
                  </div>

                  {askPieces ? (
                    <div>
                      <span className={labelBase}>How many pieces</span>
                      <PieceStepper value={pieceCount} onChange={changePieceCount} />
                      <p className={`${helpBase} mt-2 text-xs`}>This is the number of subtasks we open for the pieces.</p>
                    </div>
                  ) : null}

                  <label className="block">
                    <span className={labelBase}>What you’ll get</span>
                    <textarea
                      rows={4}
                      value={brief.deliverables.join('\n')}
                      onChange={(e) => setBrief({ ...brief, deliverables: e.target.value.split('\n') })}
                      className={`${fieldBase} resize-y`}
                    />
                    <span className={`${helpBase} mt-2 block text-xs`}>One thing per line.</span>
                  </label>

                  <label className="block">
                    <span className={labelBase}>Direction</span>
                    <textarea
                      rows={4}
                      value={brief.creative_direction}
                      onChange={(e) => setBrief({ ...brief, creative_direction: e.target.value })}
                      className={`${fieldBase} resize-y`}
                    />
                  </label>

                  {brief.suggested_subtasks.length > 0 ? (
                    <div>
                      <span className={labelBase}>How we’d tackle it</span>
                      <ul className="brief-plan mt-4">
                        {brief.suggested_subtasks.map((subtask, index) => (
                          <motion.li
                            key={`${subtask.name}-${index}`}
                            className="brief-plan-step"
                            data-tone={index % 3}
                            style={{ animationDelay: `${index * 0.45}s` }}
                            initial={reduce ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <span className="brief-plan-index" aria-hidden>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">{subtask.name}</p>
                              {subtask.description ? (
                                <p className={`${helpBase} mt-1 text-xs`}>{subtask.description}</p>
                              ) : null}
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 pt-2 min-[480px]:flex-row">
                    <PrimaryButton
                      disabled={!brief.title.trim() || !brief.deliverables.some((line) => line.trim())}
                      onClick={() => void onSend()}
                    >
                      Send it over
                    </PrimaryButton>
                    <GhostButton
                      onClick={() => {
                        setBrief(null);
                        setEffortToken('');
                        setAnswers([]);
                        setQuestions([]);
                        setQuestionRound(0);
                        goTo('project', -1);
                      }}
                    >
                      Start fresh
                    </GhostButton>
                  </div>
                </motion.div>
              ) : null}

              {step === 'sent' ? (
                <motion.div variants={rise} className="mt-6 text-center">
                  <motion.div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-lime to-brand-cyan"
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  >
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#0f0f0f" strokeWidth="3">
                      <motion.path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
                      />
                    </svg>
                  </motion.div>
                  <p className={`${helpBase} mx-auto mt-5 max-w-sm`}>
                    We’ll be in touch if anything needs a second pass.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <GhostButton href={`/clients/${slug}`}>Back to your portal</GhostButton>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </ClientPortalShell>
  );
}
