'use client';

import { put } from '@vercel/blob/client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ClientPortalShell } from './ClientPortalShell';
import { BRIEF_BUILDER_TOOLTIP } from './BriefBuilderButton';
import {
  CATEGORY_LABELS,
  EFFORT_LABELS,
  BRIEF_CATEGORIES,
  BRIEF_EFFORTS,
  isRushBrief,
  type BriefAnswer,
  type BriefCategory,
  type BriefEffort,
  type BriefFollowUp,
  type BriefIntake,
  type FinalizedBrief,
} from '@/lib/brief-schema';
import {
  formatPortalDisplayName,
  portalAlertError,
  portalAlertSuccess,
  portalBody,
  portalBtnPrimary,
  portalBtnSecondary,
  portalEyebrow,
  portalInput,
  portalLabel,
  portalPageTitle,
  portalTaskCard,
} from './portal-ui';

type BriefBuilderProps = {
  slug: string;
  displayName: string;
};

type Stage = 'intake' | 'questions' | 'review' | 'done';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_QUESTION_ROUNDS = 2;

const attachBtn =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-lime px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-black transition hover:opacity-90 focus-lime';

function fileSummaryLabel(files: File[]): string {
  if (files.length === 0) return 'No file chosen';
  if (files.length === 1) return files[0].name;
  return `${files.length} files chosen`;
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
    throw new Error(tokenData.error ?? 'We could not attach those files.');
  }
  const blob = await put(pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    multipart: true,
  });
  return blob.url;
}

function parseLinks(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (/^https?:\/\//i.test(item) ? item : `https://${item}`))
    .filter((item) => {
      try {
        const url = new URL(item);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    })
    .slice(0, 10);
}

export function BriefBuilder({ slug, displayName }: BriefBuilderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUrlsRef = useRef<string[]>([]);
  const [stage, setStage] = useState<Stage>('intake');
  const [projectType, setProjectType] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [linksText, setLinksText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileSummary, setFileSummary] = useState('No file chosen');
  const [uploadUrls, setUploadUrls] = useState<string[]>([]);
  const [answers, setAnswers] = useState<BriefAnswer[]>([]);
  const [questions, setQuestions] = useState<BriefFollowUp[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [questionRound, setQuestionRound] = useState(0);
  const [brief, setBrief] = useState<FinalizedBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Working…');
  const [error, setError] = useState<string | null>(null);

  function intakeBody(): BriefIntake {
    return {
      project_type: projectType.trim(),
      description: description.trim(),
      due_date: dueDate,
      creative_direction: creativeDirection.trim(),
      reference_links: parseLinks(linksText),
      reference_uploads: uploadUrls,
    };
  }

  async function ensureUploads(): Promise<string[]> {
    if (uploadUrlsRef.current.length > 0 || files.length === 0) return uploadUrlsRef.current;
    if (files.length > MAX_FILES) throw new Error('Please attach up to 5 files.');
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      throw new Error('Each file must be 50 MB or smaller.');
    }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      throw new Error('Attachments are over 50 MB total. Paste a Drive link instead.');
    }
    const urls: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      setBusyLabel(`Uploading ${i + 1} of ${files.length}…`);
      urls.push(await uploadAttachment(slug, files[i]));
    }
    uploadUrlsRef.current = urls;
    setUploadUrls(urls);
    return urls;
  }

  async function postBrief(action: 'refine' | 'finalize' | 'submit', extra?: Record<string, unknown>) {
    const uploads = action === 'submit' ? uploadUrlsRef.current : await ensureUploads();
    const intake = { ...intakeBody(), reference_uploads: uploads };
    const res = await fetch(`/api/clients/${slug}/brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, intake, answers, ...extra }),
    });
    const data = await readJson<Record<string, unknown>>(res);
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
    }
    return data;
  }

  async function goFinalize(nextAnswers: BriefAnswer[]) {
    setBusy(true);
    setBusyLabel('Writing the brief…');
    setError(null);
    try {
      const uploads = await ensureUploads();
      const intake = { ...intakeBody(), reference_uploads: uploads };
      const res = await fetch(`/api/clients/${slug}/brief`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', intake, answers: nextAnswers }),
      });
      const data = await readJson<{ brief?: FinalizedBrief; error?: string }>(res);
      if (!res.ok || !data.brief) {
        throw new Error(data.error ?? 'Could not write the brief.');
      }
      setAnswers(nextAnswers);
      setBrief(data.brief);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the brief.');
    } finally {
      setBusy(false);
    }
  }

  async function onIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBusyLabel('Reading your request…');
    setError(null);
    try {
      const data = await postBrief('refine');
      const ready = data.ready === true;
      const nextQuestions = Array.isArray(data.questions) ? (data.questions as BriefFollowUp[]) : [];
      if (ready || nextQuestions.length === 0) {
        await goFinalize(answers);
        return;
      }
      setQuestions(nextQuestions);
      setDraftAnswers({});
      setQuestionRound(1);
      setStage('questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.');
    } finally {
      setBusy(false);
    }
  }

  async function onAnswerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextAnswers = [
      ...answers,
      ...questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        answer: (draftAnswers[question.id] ?? '').trim(),
      })),
    ].filter((item) => item.answer);
    setAnswers(nextAnswers);

    if (questionRound >= MAX_QUESTION_ROUNDS) {
      await goFinalize(nextAnswers);
      return;
    }

    setBusy(true);
    setBusyLabel('Checking for gaps…');
    setError(null);
    try {
      const uploads = await ensureUploads();
      const intake = { ...intakeBody(), reference_uploads: uploads };
      const res = await fetch(`/api/clients/${slug}/brief`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'refine', intake, answers: nextAnswers }),
      });
      const data = await readJson<{ ready?: boolean; questions?: BriefFollowUp[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Could not continue.');
      if (data.ready || !data.questions?.length) {
        await goFinalize(nextAnswers);
        return;
      }
      setQuestions(data.questions);
      setDraftAnswers({});
      setQuestionRound((round) => round + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.');
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    if (!brief) return;
    setBusy(true);
    setBusyLabel('Sending to the team…');
    setError(null);
    try {
      await postBrief('submit', { brief });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the brief.');
    } finally {
      setBusy(false);
    }
  }

  const rush = brief ? isRushBrief(dueDate, brief.effort) : false;

  return (
    <ClientPortalShell slug={slug} backHref={`/clients/${slug}`} backLabel="← Portal">
      <header className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3`}>Brief builder</h1>
        <p className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl`}>
          {BRIEF_BUILDER_TOOLTIP} This one is for {formatPortalDisplayName(displayName)}.
        </p>
      </header>

      {error ? (
        <p className={`${portalAlertError} mt-6`} role="alert">
          {error}
        </p>
      ) : null}

      {stage === 'intake' ? (
        <form onSubmit={onIntakeSubmit} className={`${portalTaskCard} portal-form-card mt-6 min-[480px]:mt-8 space-y-5`}>
          <label className="block">
            <span className={portalLabel}>Project type</span>
            <input
              required
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className={portalInput}
              placeholder="e.g. 3 Instagram reels for the new drop"
            />
          </label>
          <label className="block">
            <span className={portalLabel}>Description</span>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${portalInput} min-h-[120px] resize-y`}
              placeholder="What you need, who it's for, and anything that has to be in it."
            />
          </label>
          <label className="block">
            <span className={portalLabel}>Due date</span>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${portalInput} w-full min-[480px]:max-w-xs`}
            />
          </label>
          <label className="block">
            <span className={portalLabel}>Creative direction (optional)</span>
            <textarea
              rows={3}
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
              className={`${portalInput} resize-y`}
              placeholder="Tone, must-haves, must-avoids, brand notes."
            />
          </label>
          <label className="block">
            <span className={portalLabel}>Reference links (optional)</span>
            <textarea
              rows={2}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              className={`${portalInput} resize-y`}
              placeholder="One URL per line."
            />
          </label>
          <div>
            <span className={portalLabel} id="brief-files-label">
              Reference files (optional)
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
                setUploadUrls([]);
                setFileSummary(fileSummaryLabel(next));
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className={attachBtn} onClick={() => fileInputRef.current?.click()}>
                Choose files
              </button>
              <span className="min-w-0 text-sm text-text-muted">{fileSummary}</span>
            </div>
            <p className={`${portalBody} mt-2`}>Up to 5 files, 50 MB total.</p>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 min-[480px]:flex-row">
            <button type="submit" disabled={busy} className={`${portalBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>
              {busy ? busyLabel : 'Continue'}
            </button>
            <Link
              href={`/clients/${slug}`}
              className="inline-flex w-full min-[480px]:w-auto items-center justify-center rounded-lg border-2 border-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted font-mono"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : null}

      {stage === 'questions' ? (
        <form onSubmit={onAnswerSubmit} className={`${portalTaskCard} mt-6 min-[480px]:mt-8 space-y-5`}>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">A few follow-ups</h2>
            <p className={`${portalBody} mt-2`}>
              Answer what you know. Blank answers are fine if you want us to decide.
            </p>
          </div>
          {questions.map((question) => (
            <label key={question.id} className="block">
              <span className={portalLabel}>{question.prompt}</span>
              <textarea
                rows={3}
                value={draftAnswers[question.id] ?? ''}
                onChange={(e) =>
                  setDraftAnswers((current) => ({ ...current, [question.id]: e.target.value }))
                }
                className={`${portalInput} resize-y`}
              />
            </label>
          ))}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 min-[480px]:flex-row">
            <button type="submit" disabled={busy} className={`${portalBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>
              {busy ? busyLabel : 'Continue'}
            </button>
            <button
              type="button"
              disabled={busy}
              className={portalBtnSecondary}
              onClick={() => {
                const nextAnswers = [
                  ...answers,
                  ...questions.map((question) => ({
                    id: question.id,
                    prompt: question.prompt,
                    answer: (draftAnswers[question.id] ?? '').trim(),
                  })),
                ].filter((item) => item.answer);
                void goFinalize(nextAnswers);
              }}
            >
              Write the brief
            </button>
          </div>
        </form>
      ) : null}

      {stage === 'review' && brief ? (
        <div className={`${portalTaskCard} mt-6 min-[480px]:mt-8 space-y-5`}>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Review the brief</h2>
            <p className={`${portalBody} mt-2`}>
              Edit anything that is off, then send it. This locks the brief for the team.
            </p>
          </div>
          {rush ? (
            <p className="rounded-[20px] border border-brand-pink/30 bg-brand-pink/10 px-5 py-4 text-sm text-red-100">
              This is due in under 48 hours and the effort is large, so a rush fee applies.
            </p>
          ) : null}
          <label className="block">
            <span className={portalLabel}>Title</span>
            <input
              value={brief.title}
              onChange={(e) => setBrief({ ...brief, title: e.target.value })}
              className={portalInput}
            />
          </label>
          <div className="grid gap-5 min-[480px]:grid-cols-2">
            <label className="block">
              <span className={portalLabel}>Category</span>
              <select
                value={brief.category}
                onChange={(e) => setBrief({ ...brief, category: e.target.value as BriefCategory })}
                className={portalInput}
              >
                {BRIEF_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={portalLabel}>Effort</span>
              <select
                value={brief.effort}
                onChange={(e) => setBrief({ ...brief, effort: e.target.value as BriefEffort })}
                className={portalInput}
              >
                {BRIEF_EFFORTS.map((effort) => (
                  <option key={effort} value={effort}>
                    {EFFORT_LABELS[effort]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={portalLabel}>Due date</span>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${portalInput} w-full min-[480px]:max-w-xs`}
            />
          </label>
          <label className="block">
            <span className={portalLabel}>Deliverables</span>
            <textarea
              rows={4}
              value={brief.deliverables.join('\n')}
              onChange={(e) =>
                setBrief({
                  ...brief,
                  deliverables: e.target.value.split('\n'),
                })
              }
              className={`${portalInput} resize-y`}
            />
            <p className={`${portalBody} mt-2`}>One deliverable per line.</p>
          </label>
          <label className="block">
            <span className={portalLabel}>Creative direction</span>
            <textarea
              rows={4}
              value={brief.creative_direction}
              onChange={(e) => setBrief({ ...brief, creative_direction: e.target.value })}
              className={`${portalInput} resize-y`}
            />
          </label>
          {brief.suggested_subtasks.length > 0 ? (
            <div>
              <span className={portalLabel}>Suggested steps</span>
              <ul className="mt-3 space-y-3">
                {brief.suggested_subtasks.map((subtask, index) => (
                  <li key={`${subtask.name}-${index}`} className="rounded-lg border border-white/10 px-3 py-3">
                    <input
                      value={subtask.name}
                      onChange={(e) => {
                        const next = brief.suggested_subtasks.slice();
                        next[index] = { ...subtask, name: e.target.value };
                        setBrief({ ...brief, suggested_subtasks: next });
                      }}
                      className={portalInput}
                    />
                    <p className={`${portalBody} mt-2`}>{subtask.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 min-[480px]:flex-row">
            <button
              type="button"
              disabled={busy || !brief.title.trim() || !brief.deliverables.some((line) => line.trim())}
              onClick={() => void onApprove()}
              className={`${portalBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {busy ? busyLabel : 'Send to the team'}
            </button>
            <button type="button" className={portalBtnSecondary} disabled={busy} onClick={() => setStage('intake')}>
              Start over
            </button>
          </div>
        </div>
      ) : null}

      {stage === 'done' ? (
        <div className={`${portalAlertSuccess} mt-6 min-[480px]:mt-8`}>
          <p>Brief sent. The team has it, and it is in the production queue.</p>
          <Link href={`/clients/${slug}`} className={`${portalBtnPrimary} mt-4`}>
            Back to portal
          </Link>
        </div>
      ) : null}
    </ClientPortalShell>
  );
}
