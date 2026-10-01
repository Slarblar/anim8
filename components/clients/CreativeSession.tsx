'use client';

import { put } from '@vercel/blob/client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiAperture,
  FiArrowRight,
  FiArrowUpRight,
  FiBox,
  FiCheck,
  FiEdit3,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiHardDrive,
  FiLink,
  FiMessageCircle,
  FiMinus,
  FiPlus,
  FiRepeat,
  FiVideo,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { BriefQuestionVisual } from './BriefQuestionVisual';
import { ClientPortalShell } from './ClientPortalShell';
import { formatPortalDisplayName, portalAlertError } from './portal-ui';
import { portalMotionEase } from './portal-motion';
import {
  BUDGETS,
  CATEGORIES,
  DEMO_PROFILES,
  GOALS,
  QUEUE,
  SERVICES,
  VIBES,
  applyAnswer,
  assembleBrief,
  briefCount,
  briefHeadline,
  categoryLabel,
  coveredCategory,
  coveredService,
  emptyRequest,
  engagementLabel,
  engagementLabelFor,
  fieldValue,
  formatBriefDate,
  focusedService,
  formatsFor,
  getCategory,
  hasHiddenCategories,
  hasSeparateScope,
  isSeparateScope,
  needsBudget,
  openTopics,
  requestTitle,
  resolveProfile,
  scopeLabel,
  serviceById,
  serviceLabel,
  serviceRequest,
  servicesForPicker,
  visibleQuestions,
  type ClientProfile,
  type ServiceId,
  type ServiceRequest,
  type SessionSnapshot,
  type SessionStep,
} from '@/lib/creative-session';
import {
  PLACEHOLDER_INSPO,
  gumletIdFromUrl,
  mixSeed,
  pieceCaption,
  pieceStill,
  piecesForRequest,
  piecesForTags,
  workTagLabel,
  type InspoPiece,
} from '@/lib/work-bank';

type CreativeSessionProps = {
  slug: string;
  displayName: string;
  driveFolderUrl?: string;
  /** Admin-assigned engagement. Missing means a new project. */
  engagement?: string;
  /** Local-only profile switcher. The live option uses the assigned engagement. */
  allowPreview?: boolean;
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;

const press = { type: 'spring' as const, stiffness: 480, damping: 28, mass: 0.5 };
const stepEase = { duration: 0.45, ease: portalMotionEase };

const SERVICE_ICONS: Record<ServiceId, typeof FiVideo> = {
  video: FiVideo,
  animation: FiBox,
  graphic: FiEdit3,
  brand: FiAperture,
  ip: FiGlobe,
};

const fieldClass =
  'brief-field mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/35';

function profileForClient(displayName: string, engagement?: string): ClientProfile {
  const base = resolveProfile(engagement);
  if (base.id === 'new') {
    return {
      id: 'live',
      name: displayName,
      kind: 'new',
      scope: null,
      note: `A new request for ${displayName}. A rough idea is enough. We'll shape the scope together.`,
    };
  }
  return { ...base, name: displayName };
}

function soleScopedService(profile: ClientProfile): ServiceId | null {
  if (profile.kind === 'new' || !profile.scope) return null;
  const ids = (Object.keys(profile.scope) as ServiceId[]).filter((id) => SERVICES.some((service) => service.id === id));
  return ids.length === 1 ? ids[0] : null;
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function projectNoun(id: ServiceId): string {
  if (id === 'video') return 'edit';
  if (id === 'graphic') return 'design';
  return 'project';
}

function safeBlobPathname(slug: string, fileName: string): string {
  const base = fileName.replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `client-portal/${slug}/${Date.now()}-${base || 'file'}`;
}

async function readJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    return {} as T;
  }
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
    throw new Error(tokenData.error ?? 'Those files did not go through. Try again, or skip them and paste a link.');
  }
  const blob = await put(pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    multipart: true,
  });
  return blob.url;
}

function validateAttachments(files: File[]): string | null {
  if (files.length > MAX_FILES) return 'Choose up to 5 files, 50 MB in total.';
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return 'Each file must be 50 MB or smaller.';
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) return 'Choose up to 5 files, 50 MB in total.';
  return null;
}

const MAX_PASTED = 5;
const MAX_PASTE_BYTES = 12 * 1024 * 1024;

type PastedInspo = {
  id: string;
  name: string;
  file: File;
  url: string;
};

type CollageFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  z: number;
};

/** Skip pieces the client dismissed, then keep the next ones from the same shuffle. */
function freshPieces(pieces: InspoPiece[], dismissed: string[], limit: number): InspoPiece[] {
  const hidden = dismissed.length ? new Set(dismissed) : null;
  const fresh = hidden ? pieces.filter((piece) => !hidden.has(piece.id)) : pieces;
  return fresh.slice(0, Math.max(0, limit));
}

function imageFilesFromTransfer(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromItems = Array.from(data.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  if (fromItems.length) return fromItems;
  return Array.from(data.files).filter((file) => file.type.startsWith('image/'));
}

const COLLAGE_TILT = [-2.2, 1.8, -1.4, 2.4, -1.8, 1.2, -2, 1.6];

function collageRowSize(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

/** Rows that fill the width, then grow a little when more pieces arrive. Portrait rows get extra height. */
function packCollage(ratios: number[], canvasW: number, canvasH: number): CollageFrame[] {
  const count = ratios.length;
  if (!count || canvasW < 8 || canvasH < 8) return [];
  const padX = canvasW * 0.035;
  const padY = canvasH * 0.04;
  const gap = Math.min(canvasW, canvasH) * 0.04;
  const innerW = canvasW - padX * 2;
  const innerH = canvasH - padY * 2;
  const perRow = collageRowSize(count);
  const rows: number[][] = [];
  for (let index = 0; index < count; index += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, count - index) }, (_, offset) => index + offset));
  }

  const rowWidth = (row: number[], height: number) =>
    row.reduce((sum, index) => sum + height * ratios[index], 0) + gap * (row.length - 1);

  let heights = rows.map((row) => {
    const sum = row.reduce((total, index) => total + ratios[index], 0);
    const justified = (innerW - gap * (row.length - 1)) / Math.max(sum, 0.01);
    const portraitRow = row.every((index) => ratios[index] < 0.85);
    return Math.min(justified, innerH * (portraitRow ? 0.78 : 0.56));
  });

  const gapTotal = gap * Math.max(0, rows.length - 1);
  let used = heights.reduce((sum, height) => sum + height, 0);
  if (used + gapTotal > innerH) {
    const fit = (innerH - gapTotal) / used;
    heights = heights.map((height) => height * fit);
  } else {
    let extra = innerH - used - gapTotal;
    rows.forEach((row, index) => {
      if (extra <= 0 || !row.every((item) => ratios[item] < 0.85)) return;
      const cap = innerH * 0.78;
      const add = Math.min(extra, Math.max(0, cap - heights[index]));
      heights[index] += add;
      extra -= add;
    });
  }

  heights = heights.map((height, index) => {
    const fitted = (innerW - gap * (rows[index].length - 1)) / Math.max(
      rows[index].reduce((sum, item) => sum + ratios[item], 0),
      0.01
    );
    return Math.min(height, fitted);
  });

  used = heights.reduce((sum, height) => sum + height, 0);
  const frames: CollageFrame[] = new Array(count);
  let y = padY + Math.max(0, innerH - used - gapTotal) / 2;
  rows.forEach((row, rowIndex) => {
    const height = heights[rowIndex];
    const width = rowWidth(row, height);
    let x = padX + Math.max(0, (innerW - width) / 2);
    row.forEach((index) => {
      const itemWidth = height * ratios[index];
      frames[index] = {
        left: (x / canvasW) * 100,
        top: (y / canvasH) * 100,
        width: (itemWidth / canvasW) * 100,
        height: (height / canvasH) * 100,
        rotate: COLLAGE_TILT[index % COLLAGE_TILT.length],
        z: index + 1,
      };
      x += itemWidth + gap;
    });
    y += height + gap;
  });
  return frames;
}

function Photo({
  piece,
  className = '',
  onRatio,
}: {
  piece: InspoPiece;
  className?: string;
  onRatio?: (ratio: number) => void;
}) {
  const src = pieceStill(piece);
  if (!src) return <div className={`absolute inset-0 bg-white/5 ${className}`} />;
  return (
    // Blob stills and Gumlet thumbnails are not in the next/image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={piece.title}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      style={piece.position ? { objectPosition: piece.position } : undefined}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) onRatio?.(naturalWidth / naturalHeight);
      }}
    />
  );
}

function ChoiceTag({
  pressed,
  onClick,
  children,
  reduce,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  reduce: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
        pressed
          ? 'border-brand-lime/80 bg-brand-lime/15 text-brand-lime'
          : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-white/25 hover:bg-white/[0.07]'
      }`}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={press}
    >
      {children}
    </motion.button>
  );
}

function GoButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const live = !reduce && !disabled;
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-ready={!disabled ? 'true' : undefined}
      className="brief-go relative inline-flex min-h-11 items-center justify-center gap-3 overflow-hidden rounded-md px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
      initial="rest"
      whileHover={live ? { scale: 1.03, y: -2 } : undefined}
      whileTap={live ? { scale: 0.98 } : undefined}
      transition={press}
    >
      <span className="brief-go-fill pointer-events-none absolute inset-0" aria-hidden />
      <span className="relative z-10 inline-flex items-center gap-3">{children}</span>
    </motion.button>
  );
}

export function CreativeSession({
  slug,
  displayName,
  driveFolderUrl,
  engagement,
  allowPreview = false,
}: CreativeSessionProps) {
  const router = useRouter();
  const reduce = !!useReducedMotion();
  const [previewId, setPreviewId] = useState('');
  const [step, setStep] = useState<SessionStep>(0);
  const [selected, setSelected] = useState<ServiceId[]>(() => {
    const only = soleScopedService(profileForClient(formatPortalDisplayName(displayName), engagement));
    return only ? [only] : [];
  });
  const [last, setLast] = useState<ServiceId | null>(() =>
    soleScopedService(profileForClient(formatPortalDisplayName(displayName), engagement))
  );
  const [active, setActive] = useState<ServiceId | null>(null);
  const [unsure, setUnsure] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showOther, setShowOther] = useState<Partial<Record<ServiceId, boolean>>>({});
  const [requests, setRequests] = useState<Partial<Record<ServiceId, ServiceRequest>>>({});
  const [idea, setIdea] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [borrow, setBorrow] = useState<Partial<Record<string, string[]>>>({});
  const [pasted, setPasted] = useState<PastedInspo[]>([]);
  const pastedRef = useRef(pasted);
  pastedRef.current = pasted;
  const [bank, setBank] = useState<InspoPiece[] | null>(null);
  const [seed, setSeed] = useState(1);
  const [link, setLink] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState<string>(BUDGETS[0]);
  const [priority, setPriority] = useState<string>(QUEUE[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileMessage, setFileMessage] = useState('');
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Sending…');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clientName = formatPortalDisplayName(displayName);
  const profile = useMemo(
    () => (allowPreview && previewId ? resolveProfile(previewId) : profileForClient(clientName, engagement)),
    [allowPreview, previewId, clientName, engagement]
  );
  const catalog = useMemo(() => (bank && bank.length ? bank : PLACEHOLDER_INSPO), [bank]);

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 1_000_000_000) || 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${encodeURIComponent(slug)}/inspo`)
      .then(async (res) => {
        if (!res.ok) return [] as InspoPiece[];
        const data = (await res.json()) as { pieces?: InspoPiece[] };
        return Array.isArray(data.pieces) ? data.pieces : [];
      })
      .then((pieces) => {
        if (!cancelled) setBank(pieces);
      })
      .catch(() => {
        if (!cancelled) setBank([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const ids = new Set(catalog.map((piece) => piece.id));
    setPins((current) => {
      const next = current.filter((id) => ids.has(id));
      return next.length === current.length ? current : next;
    });
    setBorrow((current) => {
      const next: Partial<Record<string, string[]>> = {};
      for (const id of Object.keys(current)) {
        if (ids.has(id)) next[id] = current[id];
      }
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [catalog]);

  const collage = useMemo(
    () => freshPieces(piecesForTags(catalog, [], 3 + dismissed.length, seed), dismissed, 3),
    [catalog, seed, dismissed]
  );
  const studioBoard = useMemo(() => {
    const ids = selected.length ? selected : last ? [last] : [];
    if (!ids.length) return collage;
    const seen = new Set<string>();
    const merged: InspoPiece[] = [];
    for (const id of ids) {
      const category = requests[id]?.category ?? '';
      for (const piece of freshPieces(
        piecesForRequest(catalog, id, category, 2 + dismissed.length, mixSeed(seed, `board:${id}:${category}`)),
        dismissed,
        2
      )) {
        if (seen.has(piece.id)) continue;
        seen.add(piece.id);
        merged.push(piece);
      }
    }
    return (merged.length ? merged : collage).slice(0, 3);
  }, [catalog, selected, last, requests, seed, collage, dismissed]);
  const featurePiece = useMemo(() => {
    if (!last) return null;
    const category = requests[last]?.category ?? '';
    return (
      freshPieces(
        piecesForRequest(catalog, last, category, 1 + dismissed.length, mixSeed(seed, `feature:${last}:${category}`)),
        dismissed,
        1
      )[0] ?? null
    );
  }, [catalog, last, requests, seed, dismissed]);
  const gallery = useMemo(() => {
    const picked = selected.flatMap((id) => {
      const category = requests[id]?.category ?? '';
      return freshPieces(
        piecesForRequest(catalog, id, category, 3 + dismissed.length, mixSeed(seed, `gallery:${id}:${category}`)),
        dismissed,
        3
      );
    });
    const pool = picked.length ? picked : freshPieces(piecesForTags(catalog, [], 6 + dismissed.length, seed), dismissed, 6);
    const pinned = pins
      .map((id) => catalog.find((piece) => piece.id === id))
      .filter((piece): piece is InspoPiece => Boolean(piece));
    const seen = new Set<string>();
    const merged: InspoPiece[] = [];
    for (const piece of [...pinned, ...pool]) {
      if (seen.has(piece.id)) continue;
      seen.add(piece.id);
      merged.push(piece);
    }
    return merged.slice(0, 6);
  }, [catalog, selected, requests, pins, seed, dismissed]);

  const snapshot: SessionSnapshot = {
    profile,
    selected,
    requests,
    idea,
    vibes,
    pins,
    borrow,
    inspo: catalog,
    link,
    goal,
    audience,
    date,
    budget,
    priority,
    fileNames: files.map((file) => file.name),
    pastedNames: pasted.map((item) => item.name),
  };

  const activeId = active && selected.includes(active) ? active : selected[0] ?? null;
  const requestPiece = useMemo(() => {
    if (!activeId) return featurePiece;
    const category = requests[activeId]?.category ?? '';
    return (
      freshPieces(
        piecesForRequest(catalog, activeId, category, 1 + dismissed.length, mixSeed(seed, `request:${activeId}:${category}`)),
        dismissed,
        1
      )[0] ?? null
    );
  }, [catalog, activeId, requests, seed, featurePiece, dismissed]);
  const accentPiece = catalog.find((piece) => piece.id === pins[0]) ?? requestPiece ?? collage[0] ?? null;
  const generated = assembleBrief(snapshot);
  const draft = customDraft ?? generated;
  const count = briefCount(snapshot);
  const names = selected.map((id) => serviceLabel(profile, id));

  function resetForProfile(next: ClientProfile) {
    const kept = selected.filter((id) => coveredService(next, id));
    const scoped = (Object.keys(next.scope ?? {}) as ServiceId[]).filter((id) =>
      SERVICES.some((service) => service.id === id)
    );
    const nextSelected = kept.length ? kept : scoped.length === 1 ? [scoped[0]] : [];
    const nextRequests: Partial<Record<ServiceId, ServiceRequest>> = {};
    for (const id of nextSelected) {
      const request = requests[id];
      if (!request) continue;
      if (!coveredCategory(next, id, request.category)) continue;
      nextRequests[id] = request;
    }
    setSelected(nextSelected);
    setRequests(nextRequests);
    setShowExtras(false);
    setShowOther({});
    setActive(nextSelected[0] ?? null);
    setLast(nextSelected[0] ?? null);
    setStep(0);
    setUnsure(false);
    setBudget(BUDGETS[0]);
    setPriority(QUEUE[0]);
    setCustomDraft(null);
    setEditing(false);
  }

  function chooseFormat(serviceId: ServiceId, categoryId: string) {
    setSelected([serviceId]);
    setLast(serviceId);
    setActive(serviceId);
    setUnsure(categoryId === 'unsure');
    setRequests((current) => {
      const request = current[serviceId] ?? emptyRequest();
      if (request.category === categoryId) return { ...current, [serviceId]: request };
      return { ...current, [serviceId]: { category: categoryId, answers: {}, outputs: [] } };
    });
  }

  function toggleService(id: ServiceId) {
    const on = selected.includes(id);
    const nextSelected = on ? selected.filter((item) => item !== id) : [...selected, id];
    setSelected(nextSelected);
    if (on) {
      setRequests((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    const focus = on ? nextSelected[nextSelected.length - 1] ?? null : id;
    setLast(focus);
    setActive(focus);
  }

  function chooseCategory(serviceId: ServiceId, categoryId: string) {
    if (!selected.includes(serviceId)) return;
    if (categoryId !== 'unsure' && !CATEGORIES[serviceId].some((category) => category.id === categoryId)) return;
    setRequests((current) => {
      const request = current[serviceId] ?? emptyRequest();
      if (request.category === categoryId) return current;
      return { ...current, [serviceId]: { category: categoryId, answers: {}, outputs: [] } };
    });
    setActive(serviceId);
  }

  function updateAnswer(serviceId: ServiceId, fieldId: string, value: string) {
    setRequests((current) => {
      const request = current[serviceId];
      if (!request) return current;
      return { ...current, [serviceId]: applyAnswer(serviceId, request, fieldId, value) };
    });
  }

  const addPasted = useCallback((incoming: File[]) => {
    setPasted((current) => {
      const room = MAX_PASTED - current.length;
      if (room <= 0) return current;
      const accepted = incoming
        .filter((file) => file.type.startsWith('image/') && file.size > 0 && file.size <= MAX_PASTE_BYTES)
        .slice(0, room);
      if (!accepted.length) return current;
      return [
        ...current,
        ...accepted.map((file) => ({
          id: `paste-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name || 'Pasted image',
          file,
          url: URL.createObjectURL(file),
        })),
      ];
    });
  }, []);

  const removePasted = useCallback((id: string) => {
    setPasted((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  useEffect(() => {
    return () => {
      pastedRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  function dismissStudio(id: string) {
    setDismissed((current) => (current.includes(id) ? current : [...current, id]));
    setPins((current) => current.filter((pin) => pin !== id));
    setBorrow((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function togglePin(id: string) {
    const on = pins.includes(id);
    setPins(toggleValue(pins, id));
    if (on) {
      setBorrow((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  function goNext() {
    if (step === 4) {
      void submit();
      return;
    }
    if (step === 0) {
      setStep(1);
      setActive(selected[0] ?? null);
      return;
    }
    if (step === 1) {
      const index = activeId ? selected.indexOf(activeId) : -1;
      if (index >= 0 && index < selected.length - 1) {
        setActive(selected[index + 1]);
        return;
      }
      const missing = selected.find((id) => !serviceRequest(snapshot, id).category);
      if (missing) {
        setActive(missing);
        return;
      }
      setStep(2);
      return;
    }
    setStep((current) => (current + 1) as SessionStep);
  }

  function goBack() {
    const index = activeId ? selected.indexOf(activeId) : -1;
    if (step === 1 && index > 0) {
      setActive(selected[index - 1]);
      return;
    }
    const previous = Math.max(0, step - 1) as SessionStep;
    setStep(previous);
    if (previous === 1) setActive(selected[selected.length - 1] ?? null);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitLabel('Sending…');
    const outgoing = [...pasted.map((item) => item.file), ...files];
    const attachError = validateAttachments(outgoing);
    if (attachError) {
      setSubmitError(attachError);
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set('name', requestTitle(snapshot));
    formData.set('brief', draft.trim());
    if (link.trim()) formData.set('referenceLinks', link.trim());
    if (date) formData.set('dueOn', date);

    try {
      if (outgoing.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < outgoing.length; i += 1) {
          setSubmitLabel(`Uploading ${i + 1} of ${outgoing.length}…`);
          urls.push(await uploadAttachment(slug, outgoing[i]));
        }
        formData.set('attachmentUrls', JSON.stringify(urls));
      }
      setSubmitLabel('Sending…');
      const res = await fetch(`/api/clients/${slug}`, { method: 'POST', body: formData });
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        setSubmitError(data.error ?? 'Submission failed. Please try again.');
        return;
      }
      router.push(`/clients/${slug}?submitted=1`);
    } catch (err) {
      const fallback = driveFolderUrl
        ? 'We could not attach those files. Remove them and send, or use Your Drive.'
        : 'We could not attach those files. Remove them and send, or paste a link.';
      const message = err instanceof Error ? err.message : fallback;
      setSubmitError(/vercel blob|client token|could not attach|file uploads are temporarily/i.test(message) ? fallback : message);
    } finally {
      setSubmitting(false);
    }
  }

  const focus = focusedService(profile);
  const nextIndex = activeId ? selected.indexOf(activeId) : -1;
  let nextLabel = ['Shape the request', 'Find your direction', 'Shape the details', 'Build my brief', 'Send brief'][step];
  if (step === 1 && nextIndex >= 0 && nextIndex < selected.length - 1) {
    nextLabel = `Next: ${serviceLabel(profile, selected[nextIndex + 1])}`;
  }
  const focusCategory = focus ? (requests[focus]?.category ?? '') : '';
  const nextDisabled =
    submitting ||
    (step === 0 && Boolean(focus) && !focusCategory) ||
    (step === 0 && !focus && !selected.length && !unsure && !idea.trim()) ||
    (step === 1 && Boolean(activeId) && !serviceRequest(snapshot, activeId as ServiceId).category);

  const footerTitle = [
    'Your idea, taking shape.',
    'The right questions for your request.',
    'A shared visual language.',
    'The useful details.',
    'Your creative starting point.',
  ][step];
  const footerSub =
    [names.join(' + '), pasted.length || pins.length ? `${pasted.length + pins.length} on the canvas` : engagementLabel(snapshot)]
      .filter(Boolean)
      .join(' · ') || "Start anywhere. We'll connect the dots.";

  const contextIcon = profile.kind === 'new' ? FiZap : profile.kind === 'retainer' ? FiRepeat : FiFolder;
  const ContextIcon = contextIcon;
  const sessionLabel =
    profile.kind === 'retainer' ? 'Your ongoing creative team' : profile.kind === 'project' ? "Let's keep building" : 'Your creative starting point';

  return (
    <ClientPortalShell slug={slug} backHref={`/clients/${slug}`} backLabel="← Portal" session>
      <div className="relative mt-2">
        <span className="brief-aurora" aria-hidden />
        <div className="brief-card relative">
        {allowPreview ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-2.5 sm:px-8">
            <label className="flex items-center gap-2 text-[11px] text-white/50" htmlFor="session-profile">
              Preview client profile
              <select
                id="session-profile"
                className="max-w-[16rem] rounded-md border border-white/15 bg-[#12141c] px-2 py-1.5 text-[11px] text-white"
                value={previewId || 'live'}
                onChange={(event) => {
                  const value = event.target.value;
                  const nextId = value === 'live' ? '' : value;
                  setPreviewId(nextId);
                  resetForProfile(nextId ? resolveProfile(nextId) : profileForClient(clientName, engagement));
                }}
              >
                <option value="live">
                  {clientName} · {engagementLabelFor(engagement)}
                </option>
                {Object.values(DEMO_PROFILES).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.previewLabel ?? item.name} · example
                  </option>
                ))}
              </select>
            </label>
            <span className="hidden text-[10px] text-white/40 sm:inline">Example profiles. Not a live agreement.</span>
          </div>
        ) : null}

        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
            <motion.span
              aria-hidden
              className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-lime align-middle"
              animate={reduce ? undefined : { opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {sessionLabel}
          </p>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="inline-flex items-center gap-2 text-xs text-white/80 hover:text-white"
          >
            <FiFileText aria-hidden />
            Your brief
            <motion.span
              key={count}
              className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-lime/20 px-1.5 text-[11px] font-semibold text-brand-lime"
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={press}
            >
              {count}
            </motion.span>
          </button>
        </header>

        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3 sm:px-8">
          <ContextIcon className="shrink-0 text-brand-lime" aria-hidden />
          <div className="min-w-0">
            <strong className="block text-xs font-medium text-white">{profile.name}</strong>
            <p className="mt-0.5 text-[11px] text-white/50">{profile.note}</p>
          </div>
        </div>

        <nav className="flex items-center border-b border-white/10 px-4 py-4 sm:px-8" aria-label="Your creative session">
          {['The idea', 'The request', 'The direction', 'The details', 'Your brief'].map((label, index) => {
            const current = step === index;
            return (
              <div key={label} className="flex min-w-0 flex-1 items-start">
                <button
                  type="button"
                  className={`flex min-h-8 flex-col items-center gap-1 bg-transparent text-[10px] sm:text-xs min-[720px]:flex-row min-[720px]:gap-2 ${
                    current ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setStep(index as SessionStep)}
                >
                  <span className="relative grid h-6 w-6 shrink-0 place-items-center text-[10px]">
                    {current ? (
                      <motion.span
                        layoutId={reduce ? undefined : 'session-step-fill'}
                        className="absolute inset-0 rounded-full bg-brand-lime"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-full border border-white/15" />
                    )}
                    <span className={`relative ${current ? 'font-bold text-brand-black' : ''}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="max-w-[4.5rem] text-center text-[9px] leading-tight min-[720px]:max-w-none min-[720px]:text-left min-[720px]:text-xs">
                    {label}
                  </span>
                </button>
                {index < 4 ? <span className="mx-1.5 mt-3 h-px min-w-2 flex-1 bg-white/10 sm:mx-3" /> : null}
              </div>
            );
          })}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className={`grid gap-8 px-5 py-7 sm:px-8 lg:grid-cols-2 lg:gap-10 ${
              step === 4 ? 'lg:grid-cols-[0.82fr_1.18fr]' : ''
            }`}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={stepEase}
          >
            {step === 0 ? (
              <IdeaStep
                profile={profile}
                selected={selected}
                unsure={unsure}
                showExtras={showExtras}
                idea={idea}
                last={last}
                pins={pins}
                studio={studioBoard}
                pasted={pasted}
                reduce={reduce}
                onToggle={toggleService}
                onUnsure={() => setUnsure((value) => !value)}
                onExtras={() => setShowExtras((value) => !value)}
                onIdea={setIdea}
                onPin={togglePin}
                onDismiss={dismissStudio}
                onAddPasted={addPasted}
                onRemovePasted={removePasted}
                formatId={focus ? (requests[focus]?.category ?? '') : ''}
                onFormat={(categoryId) => {
                  if (focus) chooseFormat(focus, categoryId);
                }}
              />
            ) : null}
            {step === 1 ? (
              <RequestStep
                snapshot={snapshot}
                activeId={activeId}
                showOther={showOther}
                studio={studioBoard}
                pasted={pasted}
                requestPiece={requestPiece}
                reduce={reduce}
                onPin={togglePin}
                onDismiss={dismissStudio}
                onAddPasted={addPasted}
                onRemovePasted={removePasted}
                onBranch={setActive}
                onCategory={chooseCategory}
                onAnswer={updateAnswer}
                onOther={(id) => setShowOther((current) => ({ ...current, [id]: !current[id] }))}
                onEditServices={() => setStep(0)}
              />
            ) : null}
            {step === 2 ? (
              <DirectionStep
                snapshot={snapshot}
                gallery={gallery}
                reduce={reduce}
                onVibe={(value) => setVibes((current) => toggleValue(current, value))}
                onLink={setLink}
                onPin={togglePin}
                onBorrow={(id, tag) =>
                  setBorrow((current) => ({ ...current, [id]: toggleValue(current[id] ?? [], tag) }))
                }
              />
            ) : null}
            {step === 3 ? (
              <DetailsStep
                snapshot={snapshot}
                driveFolderUrl={driveFolderUrl}
                fileMessage={fileMessage}
                files={files}
                accent={accentPiece}
                reduce={reduce}
                onGoal={(value) => setGoal((current) => (current === value ? '' : value))}
                onAudience={setAudience}
                onDate={setDate}
                onBudget={setBudget}
                onPriority={setPriority}
                onOutput={(id, output) => {
                  const category = getCategory(id, serviceRequest(snapshot, id).category);
                  if (!category?.outputs.includes(output)) return;
                  setRequests((current) => {
                    const request = current[id] ?? emptyRequest();
                    return {
                      ...current,
                      [id]: {
                        ...request,
                        outputs: toggleValue(request.outputs, output),
                      },
                    };
                  });
                }}
                onChoose={(id) => {
                  setActive(id);
                  setStep(1);
                }}
                onFiles={(next, message, accepted) => {
                  setFileMessage(message);
                  if (accepted) setFiles(next);
                }}
              />
            ) : null}
            {step === 4 ? (
              <ReviewStep
                snapshot={snapshot}
                pasted={pasted}
                draft={draft}
                customDraft={customDraft}
                editing={editing}
                reduce={reduce}
                onEdit={() => {
                  if (!editing && customDraft === null) setCustomDraft(generated);
                  setEditing((value) => !value);
                }}
                onDraft={setCustomDraft}
                onRewrite={() => {
                  setCustomDraft(null);
                  setEditing(false);
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-lime/15 text-brand-lime">
              <FiZap aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white">{footerTitle}</div>
              <div className="mt-0.5 text-[11px] text-white/45" aria-live="polite">
                {footerSub}
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <button
              type="button"
              onClick={goBack}
              className={`min-h-11 px-2 text-xs text-white/50 hover:text-white ${step === 0 ? 'invisible' : ''}`}
            >
              Back
            </button>
            <GoButton disabled={nextDisabled} onClick={goNext}>
              <span>{submitting ? submitLabel : nextLabel}</span>
              <FiArrowRight aria-hidden />
            </GoButton>
          </div>
        </footer>
        <AnimatePresence>
          {submitError ? (
            <motion.p
              className={`${portalAlertError} mx-5 mb-4 sm:mx-8`}
              role="alert"
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
            >
              {submitError}
            </motion.p>
          ) : null}
        </AnimatePresence>
        <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35 sm:px-8">
          <span>A creative session with Anim8</span>
          <span className="hidden sm:inline">Human ideas. A clearer brief.</span>
        </div>
      </div>
      </div>
    </ClientPortalShell>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-lime">
      <span className="h-px w-4 bg-current" aria-hidden />
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-4 max-w-[18rem] font-heading text-[clamp(2.15rem,4.4vw,3.35rem)] font-medium leading-[1.02] tracking-[-0.045em] text-white">
      {children}
    </h1>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <em className="font-medium not-italic text-brand-lime">{children}</em>;
}

function IdeaStep({
  profile,
  selected,
  unsure,
  showExtras,
  idea,
  last,
  pins,
  studio,
  pasted,
  reduce,
  onToggle,
  onUnsure,
  onExtras,
  onIdea,
  onPin,
  onDismiss,
  onAddPasted,
  onRemovePasted,
  formatId,
  onFormat,
}: {
  profile: ClientProfile;
  selected: ServiceId[];
  unsure: boolean;
  showExtras: boolean;
  idea: string;
  last: ServiceId | null;
  pins: string[];
  studio: InspoPiece[];
  pasted: PastedInspo[];
  reduce: boolean;
  onToggle: (id: ServiceId) => void;
  onUnsure: () => void;
  onExtras: () => void;
  onIdea: (value: string) => void;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
  onAddPasted: (files: File[]) => void;
  onRemovePasted: (id: string) => void;
  formatId: string;
  onFormat: (categoryId: string) => void;
}) {
  const focused = focusedService(profile);
  const formats = focused ? formatsFor(profile, focused) : [];
  const available = servicesForPicker(profile, showExtras, selected);
  return (
    <>
      <section>
        <Eyebrow>01 / {focused ? serviceLabel(profile, focused) : profile.kind === 'new' ? 'A blank canvas, together' : 'Your next creative request'}</Eyebrow>
        <Title>
          What are we
          <br />
          bringing <Em>to life?</Em>
        </Title>
        <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
          {focused
            ? "Pick the request. We'll ask just what this one needs."
            : profile.kind === 'new'
              ? "A rough idea is all you need. Pick a starting point, and we'll figure out the shape of it together."
              : `Start with the services in your ${profile.kind === 'retainer' ? 'retainer' : 'project'}. We'll ask just what this request needs.`}
        </p>
        {focused ? (
          <motion.div
            className="mb-3 grid grid-cols-2 gap-2"
            initial={reduce ? false : 'hidden'}
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {formats.map((format) => {
              const on = formatId === format.id;
              return (
                <motion.button
                  key={format.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFormat(format.id)}
                  className={`relative flex min-h-[76px] items-center rounded-lg border px-3 py-3 text-left ${
                    on ? 'border-brand-lime/70 bg-brand-lime/15' : 'border-white/10 bg-white/[0.04]'
                  }`}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: stepEase } }}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                >
                  <span className="min-w-0 pr-4">
                    <strong className="block text-[13px] font-medium leading-snug">{format.name}</strong>
                    <small className="mt-1 block text-[10px] text-white/45">{format.note}</small>
                  </span>
                  <AnimatePresence>
                    {on ? (
                      <motion.span
                        className="absolute right-1.5 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-brand-lime text-[9px] font-bold text-brand-black"
                        initial={reduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={reduce ? undefined : { scale: 0 }}
                      >
                        ✓
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.button>
              );
            })}
            <motion.button
              type="button"
              aria-pressed={formatId === 'unsure'}
              onClick={() => onFormat('unsure')}
              className={`flex min-h-[76px] items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 text-left ${
                formatId === 'unsure' ? 'border-brand-lime/70 bg-brand-lime/10' : 'border-white/15 bg-transparent'
              }`}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: stepEase } }}
              whileHover={reduce ? undefined : { y: -3 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
            >
              <FiZap className="shrink-0 text-white/40" aria-hidden />
              <span>
                <strong className="block text-[13px] font-medium">Let&apos;s Figure it Out</strong>
                <small className="mt-1 block text-[10px] text-white/45">I have an idea, though.</small>
              </span>
            </motion.button>
          </motion.div>
        ) : (
        <motion.div
          className="mb-3 grid grid-cols-2 gap-2"
          initial={reduce ? false : 'hidden'}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {available.map((service) => {
            const on = selected.includes(service.id);
            const Icon = SERVICE_ICONS[service.id];
            const covered = coveredService(profile, service.id);
            return (
              <motion.button
                key={service.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(service.id)}
                className={`relative flex min-h-[76px] items-center gap-2.5 rounded-lg border px-3 py-3 text-left ${
                  on ? 'border-brand-lime/70 bg-brand-lime/15' : 'border-white/10 bg-white/[0.04]'
                }`}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: stepEase } }}
                whileHover={reduce ? undefined : { y: -3 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
              >
                <Icon className={`shrink-0 ${on ? 'text-brand-lime' : 'text-white/40'}`} aria-hidden />
                <span className="min-w-0 pr-3">
                  <strong className="block text-[13px] font-medium leading-snug">{service.name}</strong>
                  {profile.kind === 'new' ? (
                    <small className="mt-1 block text-[10px] text-white/45">{service.detail}</small>
                  ) : (
                    <small
                      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] ${
                        covered ? 'bg-brand-lime/15 text-brand-lime' : 'bg-[#3b3021] text-[#e9c78d]'
                      }`}
                    >
                      {covered ? `In your ${profile.kind === 'retainer' ? 'retainer' : 'project'}` : 'Separate scope'}
                    </small>
                  )}
                </span>
                <AnimatePresence>
                  {on ? (
                    <motion.span
                      className="absolute right-1.5 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-brand-lime text-[9px] font-bold text-brand-black"
                      initial={reduce ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={reduce ? undefined : { scale: 0 }}
                    >
                      ✓
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            );
          })}
          <motion.button
            type="button"
            aria-pressed={unsure}
            onClick={onUnsure}
            className={`flex min-h-[76px] items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 text-left ${
              unsure ? 'border-brand-lime/70 bg-brand-lime/10' : 'border-white/15 bg-transparent'
            }`}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: stepEase } }}
            whileHover={reduce ? undefined : { y: -3 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            <FiZap className="shrink-0 text-white/40" aria-hidden />
            <span>
              <strong className="block text-[13px] font-medium">Let&apos;s Figure it Out</strong>
              <small className="mt-1 block text-[10px] text-white/45">I have an idea, though.</small>
            </span>
          </motion.button>
        </motion.div>
        )}
        {focused ? null : (
          <>
        <p className="flex items-center gap-1.5 text-[11px] text-white/45">
          <FiPlus aria-hidden /> More than one? Great. Pick a mix.
        </p>
        {profile.kind !== 'new' ? (
          <button type="button" onClick={onExtras} className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white">
            {showExtras ? 'Hide unselected extra services' : 'Need another service? Explore the studio'}
            {showExtras ? <FiMinus aria-hidden /> : <FiArrowUpRight aria-hidden />}
          </button>
        ) : null}
          </>
        )}
        <label className="mt-5 block text-xs" htmlFor="session-idea">
          Got a spark? Tell us in a sentence. <span className="text-white/40">Optional</span>
          <textarea
            id="session-idea"
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="We're launching something new and want to make some noise…"
            value={idea}
            onChange={(event) => onIdea(event.target.value)}
          />
        </label>
      </section>
      <InspoCanvas
        label={last ? serviceLabel(profile, last) : ''}
        studio={studio}
        pasted={pasted}
        pins={pins}
        reduce={reduce}
        onPin={onPin}
        onDismiss={onDismiss}
        onAdd={onAddPasted}
        onRemove={onRemovePasted}
      />
    </>
  );
}

type CanvasPreview =
  | { kind: 'image'; src: string; title: string; caption: string; stat: string }
  | { kind: 'video'; id: string; title: string; caption: string; stat: string };

function StatBadge({ stat, className = '' }: { stat?: string; className?: string }) {
  if (!stat) return null;
  return (
    <span
      className={`pointer-events-none inline-block rounded-full bg-brand-lime px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-brand-black ${className}`}
    >
      {stat}
    </span>
  );
}

function previewForPrint(print: {
  piece: InspoPiece | null;
  pasted: PastedInspo | null;
}): CanvasPreview | null {
  if (print.piece) {
    const caption = pieceCaption(print.piece);
    const stat = print.piece.stat ?? '';
    const videoId = gumletIdFromUrl(print.piece.gumletUrl);
    if (videoId) return { kind: 'video', id: videoId, title: print.piece.title, caption, stat };
    const src = pieceStill(print.piece);
    return src ? { kind: 'image', src, title: print.piece.title, caption, stat } : null;
  }
  if (print.pasted) {
    return { kind: 'image', src: print.pasted.url, title: 'Yours', caption: print.pasted.name, stat: '' };
  }
  return null;
}

function useGumletAspect(id: string | null): number | null {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setRatio(null);
    fetch(`/api/gumlet-playback?id=${encodeURIComponent(id)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as { aspect?: string | null }) : null))
      .then((data) => {
        if (cancelled) return;
        const parts = typeof data?.aspect === 'string' ? data.aspect.split(':') : [];
        const width = Number(parts[0]);
        const height = Number(parts[1]);
        setRatio(width > 0 && height > 0 ? width / height : 16 / 9);
      })
      .catch(() => {
        if (!cancelled) setRatio(16 / 9);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return ratio;
}

function InspoPreview({ preview, onClose }: { preview: CanvasPreview; onClose: () => void }) {
  const titleId = useId();
  const videoRatio = useGumletAspect(preview.kind === 'video' ? preview.id : null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#f7f8ef] text-lg text-[#18220f]"
        >
          <FiX aria-hidden />
        </button>
        <div className="flex items-center justify-center overflow-hidden bg-black">
          {preview.kind === 'video' ? (
            videoRatio ? (
              <iframe
                src={`https://play.gumlet.io/embed/${preview.id}?autoplay=true&loop=false&primary_color=7cc142&start_high_res=true`}
                title={preview.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
                className="border-0 bg-black"
                style={{
                  aspectRatio: videoRatio,
                  width: videoRatio >= 1 ? '100%' : `min(100%, calc(78vh * ${videoRatio}))`,
                  maxHeight: '78vh',
                  backgroundColor: '#000',
                }}
              />
            ) : (
              <div className="aspect-video w-full bg-black" />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.src} alt="" className="max-h-[78vh] w-full bg-black object-contain" />
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-4 pr-2 text-white">
          <h2 id={titleId} className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
            <span className="truncate">{preview.title}</span>
            {preview.stat ? (
              <span className="shrink-0 rounded-full bg-brand-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-brand-black">
                {preview.stat}
              </span>
            ) : null}
          </h2>
          {preview.caption ? (
            <p className="truncate font-mono text-[10px] uppercase tracking-wide text-white/50">{preview.caption}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function InspoCanvas({
  label,
  studio,
  pasted,
  pins,
  reduce,
  onPin,
  onDismiss,
  onAdd,
  onRemove,
}: {
  label: string;
  studio: InspoPiece[];
  pasted: PastedInspo[];
  pins: string[];
  reduce: boolean;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const prints = [
    ...studio.map((piece) => ({ kind: 'studio' as const, id: piece.id, piece, pasted: null as PastedInspo | null })),
    ...pasted.map((item) => ({ kind: 'yours' as const, id: item.id, piece: null as InspoPiece | null, pasted: item })),
  ];
  const boardRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState({ w: 0, h: 0 });
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const noteRatio = useCallback((id: string, ratio: number) => {
    setRatios((current) => (Math.abs((current[id] ?? 0) - ratio) < 0.01 ? current : { ...current, [id]: ratio }));
  }, []);
  const frames = packCollage(
    prints.map((print) => ratios[print.id] ?? 1.2),
    board.w,
    board.h
  );
  const [preview, setPreview] = useState<CanvasPreview | null>(null);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) return;
    const measure = () => setBoard({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    function onWindowPaste(event: ClipboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const images = imageFilesFromTransfer(event.clipboardData);
      if (!images.length) return;
      event.preventDefault();
      onAdd(images);
    }
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [onAdd]);

  function take(data: DataTransfer | null) {
    const images = imageFilesFromTransfer(data);
    if (images.length) onAdd(images);
  }

  return (
    <aside className="min-w-0">
      <StageHead left={label ? `A starting point for ${label}` : 'A few possibilities'} right="Paste an image" />
      <div
        ref={boardRef}
        className="relative outline-none"
        style={{ height: prints.length > 4 ? 'clamp(26rem, 78vh, 42rem)' : 'clamp(22rem, 68vh, 32rem)' }}
        tabIndex={0}
        role="region"
        aria-label="Inspiration canvas. Paste or drop an image to add it."
        onPaste={(event) => {
          const images = imageFilesFromTransfer(event.clipboardData);
          if (!images.length) return;
          event.preventDefault();
          onAdd(images);
        }}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          take(event.dataTransfer);
        }}
      >
        {prints.map((print, index) => {
          const frame = frames[index];
          if (!frame) return null;
          const caption = print.piece
            ? [print.piece.title, print.piece.client].filter(Boolean).join(' / ')
            : 'Yours';
          const pinned = print.piece ? pins.includes(print.piece.id) : false;
          const place = {
            left: `${frame.left}%`,
            top: `${frame.top}%`,
            width: `${frame.width}%`,
            height: `${frame.height}%`,
            rotate: frame.rotate,
          };
          return (
            <motion.figure
              key={print.id}
              className="absolute overflow-hidden shadow-[0_18px_36px_rgba(0,0,0,0.38)]"
              style={{ zIndex: frame.z }}
              initial={reduce ? false : { opacity: 0, scale: 0.98, ...place }}
              animate={reduce ? { opacity: 1, ...place } : { opacity: 1, scale: 1, y: [0, -4, 0], ...place }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : {
                      opacity: stepEase,
                      left: { duration: 0.55, ease: portalMotionEase },
                      top: { duration: 0.55, ease: portalMotionEase },
                      width: { duration: 0.55, ease: portalMotionEase },
                      height: { duration: 0.55, ease: portalMotionEase },
                      rotate: { duration: 0.55, ease: portalMotionEase },
                      y: { duration: 6.4 + index * 0.4, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
            >
              {print.piece ? <Photo piece={print.piece} onRatio={(ratio) => noteRatio(print.id, ratio)} /> : null}
              {print.piece?.stat ? <StatBadge stat={print.piece.stat} className="absolute left-2 top-2 z-[1]" /> : null}
              {print.pasted ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={print.pasted.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth > 0 && naturalHeight > 0) noteRatio(print.id, naturalWidth / naturalHeight);
                  }}
                />
              ) : null}
              <figcaption className="pointer-events-none absolute bottom-2 left-2 z-[1] max-w-[80%] truncate font-mono text-[9px] uppercase tracking-wide text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
                {caption}
              </figcaption>
              {previewForPrint(print) ? (
                <button
                  type="button"
                  aria-label={`Open ${caption}`}
                  onClick={() => setPreview(previewForPrint(print))}
                  className="absolute inset-0 cursor-zoom-in"
                />
              ) : null}
              {print.piece ? (
                <div className="absolute right-2 top-2 z-[2] flex gap-1.5">
                  <button
                    type="button"
                    aria-label={`Remove ${print.piece.title}`}
                    onClick={() => onDismiss(print.piece!.id)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#f7f8ef]/90 text-sm text-[#18220f]"
                  >
                    <FiX aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`${pinned ? 'Unpin' : 'Pin'} ${print.piece.title}`}
                    onClick={() => onPin(print.piece!.id)}
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm ${
                      pinned ? 'bg-brand-lime text-brand-black' : 'bg-[#f7f8ef]/90 text-[#18220f]'
                    }`}
                  >
                    {pinned ? <FiCheck aria-hidden /> : <FiPlus aria-hidden />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${print.pasted?.name ?? 'pasted image'}`}
                  onClick={() => onRemove(print.id)}
                  className="absolute right-2 top-2 z-[2] grid h-7 w-7 place-items-center rounded-full bg-[#182012]/80 text-xs text-white"
                >
                  ×
                </button>
              )}
            </motion.figure>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-white/40">
        {pasted.length
          ? 'Click a piece to open it. Your images sit with the studio work for this request.'
          : 'Click a piece to open it. Paste or drop an image and it lands with the studio work.'}
      </p>
      {preview ? <InspoPreview preview={preview} onClose={closePreview} /> : null}
    </aside>
  );
}

function StageHead({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function RequestStep({
  snapshot,
  activeId,
  showOther,
  studio,
  pasted,
  requestPiece,
  reduce,
  onPin,
  onDismiss,
  onAddPasted,
  onRemovePasted,
  onBranch,
  onCategory,
  onAnswer,
  onOther,
  onEditServices,
}: {
  snapshot: SessionSnapshot;
  activeId: ServiceId | null;
  showOther: Partial<Record<ServiceId, boolean>>;
  studio: InspoPiece[];
  pasted: PastedInspo[];
  requestPiece: InspoPiece | null;
  reduce: boolean;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
  onAddPasted: (files: File[]) => void;
  onRemovePasted: (id: string) => void;
  onBranch: (id: ServiceId) => void;
  onCategory: (id: ServiceId, categoryId: string) => void;
  onAnswer: (id: ServiceId, fieldId: string, value: string) => void;
  onOther: (id: ServiceId) => void;
  onEditServices: () => void;
}) {
  if (!activeId) {
    return (
      <>
        <section>
          <Eyebrow>02 / Room to explore</Eyebrow>
          <Title>
            We&apos;ll find
            <br />
            <Em>the right shape.</Em>
          </Title>
          <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
            No need to pick a production category yet. Bring your idea and a few visual references; we&apos;ll recommend an approach.
          </p>
          <button type="button" onClick={onEditServices} className="border-b border-white text-xs">
            Choose a service ↗
          </button>
          <p className="mt-4 rounded-lg bg-brand-lime/15 px-4 py-3 text-xs leading-relaxed text-brand-lime">
            {snapshot.profile.kind === 'new'
              ? "We'll define the scope together."
              : 'Your team will confirm whether this fits the existing scope.'}
          </p>
        </section>
        <InspoCanvas
          label=""
          studio={studio}
          pasted={pasted}
          pins={snapshot.pins}
          reduce={reduce}
          onPin={onPin}
          onDismiss={onDismiss}
          onAdd={onAddPasted}
          onRemove={onRemovePasted}
        />
      </>
    );
  }

  const focused = focusedService(snapshot.profile) === activeId;
  const service = serviceById(activeId);
  const request = serviceRequest(snapshot, activeId);
  const category = getCategory(activeId, request.category);
  const list = formatsFor(snapshot.profile, activeId, Boolean(showOther[activeId]));
  const picked =
    request.category === 'unsure'
      ? "Let's Figure it Out"
      : categoryLabel(snapshot.profile, activeId, request.category);
  const title: [string, string] = focused
    ? [serviceLabel(snapshot.profile, activeId), picked || 'your request.']
    : service.title;
  const extra = isSeparateScope(snapshot.profile, activeId, request);
  const questions = visibleQuestions(activeId, request);

  return (
    <>
      <section>
        <Eyebrow>02 / A little more specific</Eyebrow>
        {snapshot.selected.length > 1 ? (
          <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Services in this request">
            {snapshot.selected.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === activeId}
                onClick={() => onBranch(id)}
                className={`min-h-9 rounded-md border px-2.5 text-[11px] ${
                  id === activeId
                    ? 'border-brand-lime/70 bg-brand-lime/15 text-brand-lime'
                    : 'border-white/10 bg-white/[0.04] text-white/55'
                }`}
              >
                {serviceLabel(snapshot.profile, id)}
                {serviceRequest(snapshot, id).category ? ' ✓' : ''}
              </button>
            ))}
          </div>
        ) : null}
        <h1 className="mb-4 font-heading text-[clamp(2rem,4vw,2.8rem)] font-medium leading-[1.05] tracking-[-0.04em]">
          {title[0]}
          <br />
          <Em>{title[1]}</Em>
        </h1>
        <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
          Pick the closest fit. We&apos;ll shape the questions around what you&apos;re actually making.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {list.map((item) => {
            const on = request.category === item.id;
            const separate = !coveredCategory(snapshot.profile, activeId, item.id);
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => onCategory(activeId, item.id)}
                className={`min-h-[82px] rounded-lg border px-3 py-3 text-left ${
                  on ? 'border-brand-lime/70 bg-brand-lime/15' : 'border-white/10 bg-white/[0.04]'
                }`}
                whileHover={reduce ? undefined : { y: -2 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
              >
                <strong className="block text-xs font-medium">
                  {categoryLabel(snapshot.profile, activeId, item.id) || item.name}
                  {on ? ' ✓' : ''}
                </strong>
                <small className="mt-1 block text-[10px] text-white/45">{item.note}</small>
                {separate ? (
                  <span className="mt-1.5 inline-block rounded bg-[#3b3021] px-1.5 py-0.5 text-[9px] text-[#e9c78d]">
                    Separate scope
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
        {hasHiddenCategories(snapshot.profile, activeId) && focusedService(snapshot.profile) !== 'video' ? (
          <button type="button" onClick={() => onOther(activeId)} className="inline-flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white">
            {showOther[activeId] ? 'Hide unselected extra categories' : `Explore other ${service.name.toLowerCase()} requests`}
            {showOther[activeId] ? <FiMinus aria-hidden /> : <FiPlus aria-hidden />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onCategory(activeId, 'unsure')}
          className="mt-1 block text-left text-[11px] text-white/50 hover:text-white"
        >
          {request.category === 'unsure' ? "✓ Let's Figure it Out" : "Let's Figure it Out"}
        </button>
        {category || request.category === 'unsure' ? (
          <div className={`mt-3 rounded-md px-3 py-3 text-[11px] leading-relaxed ${extra ? 'bg-[#3b3021] text-[#e9c78d]' : 'bg-brand-lime/15 text-brand-lime'}`}>
            <strong className="mb-0.5 block text-xs font-medium">{scopeLabel(snapshot, activeId)}</strong>
            {extra
              ? "We'll prepare this part for a separate scope review before any work starts."
              : snapshot.profile.kind === 'new'
                ? 'This helps us build the right proposal.'
                : !category
                  ? 'Your team will confirm how this fits your engagement.'
                  : `This fits the example ${snapshot.profile.kind === 'retainer' ? 'retainer' : 'project'} categories. Your team will confirm effort and scheduling.`}
          </div>
        ) : null}
      </section>
      <aside>
        <StageHead left={category ? 'Just the useful questions' : 'Inspiration along the way'} right={category ? categoryLabel(snapshot.profile, activeId, category.id) || category.name : serviceLabel(snapshot.profile, service.id)} />
        <div className="relative mb-4 h-44 overflow-hidden rounded-lg">
          {requestPiece ? <Photo piece={requestPiece} /> : null}
          {requestPiece?.stat ? <StatBadge stat={requestPiece.stat} className="absolute left-3 top-3" /> : null}
          <span className="absolute bottom-3 left-3 rounded bg-[#182012]/90 px-2 py-1 text-[10px] text-[#f3f5e9]">
            {requestPiece ? `${requestPiece.title} · studio work` : 'Studio work'}
          </span>
        </div>
        {category ? (
          <div className="rounded-lg bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <BriefQuestionVisual prompt={`${category.name} ${category.note}`} active />
              <div>
                <h2 className="font-heading text-xl font-medium tracking-tight">A little about your {projectNoun(activeId)}.</h2>
                <p className="mt-1 text-[11px] text-white/45">Leave anything open that you&apos;d like to discuss.</p>
              </div>
            </div>
            {questions.map((field) => (
              <QuestionField key={field.id} serviceId={activeId} request={request} fieldId={field.id} reduce={reduce} onAnswer={onAnswer} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white/[0.04] px-5 py-8">
            <h2 className="font-heading text-xl font-medium tracking-tight">One choice opens the right conversation.</h2>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              {request.category === 'unsure'
                ? "We'll help choose the format. Continue to your visual direction."
                : 'Choose a request type to see the details that matter for it.'}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

function QuestionField({
  serviceId,
  request,
  fieldId,
  reduce,
  onAnswer,
}: {
  serviceId: ServiceId;
  request: ServiceRequest;
  fieldId: string;
  reduce: boolean;
  onAnswer: (id: ServiceId, fieldId: string, value: string) => void;
}) {
  const field = visibleQuestions(serviceId, request).find((item) => item.id === fieldId);
  if (!field) return null;
  const value = fieldValue(request, field);
  const selected = Array.isArray(value) ? value : [value];
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs">
        {field.label}
        {field.multi ? <span className="text-white/40"> · Pick any</span> : null}
      </p>
      {field.options ? (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((option) => (
            <ChoiceTag
              key={option}
              pressed={selected.includes(option)}
              reduce={reduce}
              onClick={() => onAnswer(serviceId, field.id, option)}
            >
              {option}
            </ChoiceTag>
          ))}
        </div>
      ) : (
        <input
          className={fieldClass}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder || 'A little context…'}
          onChange={(event) => onAnswer(serviceId, field.id, event.target.value)}
        />
      )}
    </div>
  );
}

function DirectionStep({
  snapshot,
  gallery,
  reduce,
  onVibe,
  onLink,
  onPin,
  onBorrow,
}: {
  snapshot: SessionSnapshot;
  gallery: InspoPiece[];
  reduce: boolean;
  onVibe: (value: string) => void;
  onLink: (value: string) => void;
  onPin: (id: string) => void;
  onBorrow: (id: string, tag: string) => void;
}) {
  return (
    <>
      <section>
        <Eyebrow>03 / Follow your instincts</Eyebrow>
        <Title>
          A little more
          <br />
          <Em>your kind</Em> of good.
        </Title>
        <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
          You don&apos;t have to speak &quot;creative.&quot; Pin what catches your eye, then tell us what you like about it.
        </p>
        <p className="mb-2 text-xs">What should it feel like?</p>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {VIBES.map((vibe) => (
            <ChoiceTag key={vibe} pressed={snapshot.vibes.includes(vibe)} reduce={reduce} onClick={() => onVibe(vibe)}>
              {vibe}
            </ChoiceTag>
          ))}
        </div>
        <label className="mb-4 block text-xs" htmlFor="session-link">
          Or bring something you love
          <span className="mt-2 flex items-center gap-2 border-b border-white/15">
            <FiLink className="text-white/40" aria-hidden />
            <input
              id="session-link"
              type="url"
              className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-white/35"
              placeholder="Paste a reference link"
              value={snapshot.link}
              onChange={(event) => onLink(event.target.value)}
            />
          </span>
        </label>
        <div className="rounded-lg bg-brand-lime/15 px-4 py-3 text-xs leading-relaxed text-brand-lime">
          <strong className="mb-1 block font-medium">Borrow the feeling. Make it yours.</strong>
          You might love one project&apos;s color and another&apos;s character. Mix them. That&apos;s where it gets interesting.
        </div>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-white/45">
          {snapshot.pins.map((id) => {
            const piece = snapshot.inspo.find((item) => item.id === id);
            if (!piece) return null;
            return (
              <span key={id} className="relative h-9 w-9 overflow-hidden rounded">
                <Photo piece={piece} />
              </span>
            );
          })}
          <span>{snapshot.pins.length ? `${snapshot.pins.length} references on your board` : 'Your reference board starts here →'}</span>
        </div>
      </section>
      <aside>
        <StageHead left="Explore the possibilities" right="Pin with +" />
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((piece) => {
            const pinned = snapshot.pins.includes(piece.id);
            const caption = pieceCaption(piece);
            return (
              <article key={piece.id} className={`overflow-hidden rounded-lg border bg-white/[0.03] ${pinned ? 'border-brand-lime/70' : 'border-white/10'}`}>
                <div className="relative h-40">
                  <Photo piece={piece} />
                  <motion.button
                    type="button"
                    aria-pressed={pinned}
                    aria-label={`${pinned ? 'Unpin' : 'Pin'} ${piece.title}`}
                    onClick={() => onPin(piece.id)}
                    className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-lg ${
                      pinned ? 'bg-brand-lime text-brand-black' : 'bg-[#f7f8ef] text-[#18220f]'
                    }`}
                    whileTap={reduce ? undefined : { scale: 0.9 }}
                  >
                    {pinned ? '✓' : '+'}
                  </motion.button>
                </div>
                <div className="px-3 py-2.5">
                  <strong className="block text-xs font-medium">{piece.title}</strong>
                  <small className="mt-0.5 block text-[10px] text-white/45">{caption || 'Studio work'}</small>
                  {piece.stat ? <StatBadge stat={piece.stat} className="mt-1.5" /> : null}
                </div>
                {pinned && piece.tags.length ? (
                  <div className="flex flex-wrap gap-1 px-3 pb-3">
                    <p className="mb-1 w-full text-[10px] text-white/45">What should we borrow?</p>
                    {piece.tags.map((tag) => {
                      const label = workTagLabel(tag);
                      return (
                        <ChoiceTag
                          key={tag}
                          pressed={(snapshot.borrow[piece.id] ?? []).includes(label)}
                          reduce={reduce}
                          onClick={() => onBorrow(piece.id, label)}
                        >
                          {label}
                        </ChoiceTag>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-white/40">Visual explorations · inspiration, not a template</p>
      </aside>
    </>
  );
}

function DetailsStep({
  snapshot,
  driveFolderUrl,
  fileMessage,
  files,
  accent,
  reduce,
  onGoal,
  onAudience,
  onDate,
  onBudget,
  onPriority,
  onOutput,
  onChoose,
  onFiles,
}: {
  snapshot: SessionSnapshot;
  driveFolderUrl?: string;
  fileMessage: string;
  files: File[];
  accent: InspoPiece | null;
  reduce: boolean;
  onGoal: (value: string) => void;
  onAudience: (value: string) => void;
  onDate: (value: string) => void;
  onBudget: (value: string) => void;
  onPriority: (value: string) => void;
  onOutput: (id: ServiceId, output: string) => void;
  onChoose: (id: ServiceId) => void;
  onFiles: (files: File[], message: string, accepted: boolean) => void;
}) {
  const budget = needsBudget(snapshot);
  const extras = hasSeparateScope(snapshot);
  const graphicPackaging = snapshot.selected.includes('graphic') && serviceRequest(snapshot, 'graphic').category === 'packaging';
  const uploadHint = snapshot.selected.includes('video')
    ? 'Reference files or a source-footage link in your notes.'
    : graphicPackaging
      ? 'Dielines, approved copy and brand assets.'
      : 'Brand guidelines, source files, a napkin sketch.';

  return (
    <>
      <section>
        <Eyebrow>04 / Give the idea a purpose</Eyebrow>
        <Title>
          What does
          <br />
          <Em>great</Em> look like?
        </Title>
        <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
          A little context helps us make the right thing. Leave anything open that you&apos;d like to figure out with us.
        </p>
        <p className="mb-2 text-xs">The big goal</p>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {GOALS.map((item) => (
            <ChoiceTag key={item} pressed={snapshot.goal === item} reduce={reduce} onClick={() => onGoal(item)}>
              {item}
            </ChoiceTag>
          ))}
        </div>
        <label className="mb-4 block text-xs" htmlFor="session-audience">
          Who&apos;s it for, and what should they feel or do?
          <textarea
            id="session-audience"
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="Our audience, the message, anything we should know…"
            value={snapshot.audience}
            onChange={(event) => onAudience(event.target.value)}
          />
        </label>
        <p className="mb-2 text-xs">What should we deliver?</p>
        {snapshot.selected.length ? (
          snapshot.selected.map((id) => {
            const category = getCategory(id, serviceRequest(snapshot, id).category);
            const request = serviceRequest(snapshot, id);
            return (
              <div key={id} className="mb-4 border-b border-white/10 pb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <strong className="text-xs font-medium">
                    {serviceLabel(snapshot.profile, id)}
                    {category ? ` / ${category.name}` : ''}
                  </strong>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] ${isSeparateScope(snapshot.profile, id, request) ? 'bg-[#3b3021] text-[#e9c78d]' : 'bg-brand-lime/15 text-brand-lime'}`}>
                    {scopeLabel(snapshot, id)}
                  </span>
                </div>
                {category ? (
                  <div className="flex flex-wrap gap-1.5">
                    {category.outputs.map((output) => (
                      <ChoiceTag
                        key={output}
                        pressed={request.outputs.includes(output)}
                        reduce={reduce}
                        onClick={() => onOutput(id, output)}
                      >
                        {output}
                      </ChoiceTag>
                    ))}
                  </div>
                ) : (
                  <button type="button" onClick={() => onChoose(id)} className="text-[11px] text-white/50 hover:text-white">
                    Choose a request type to tailor deliverables ↗
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-[11px] text-white/45">We&apos;ll recommend deliverables once we&apos;ve explored your idea.</p>
        )}
      </section>
      <aside>
        <StageHead left="Give it a little shape" right="Flexible is fine" />
        <div className="rounded-xl bg-white/[0.04] p-5">
          <h3 className="mb-4 font-heading text-xl font-medium tracking-tight">The practical bits.</h3>
          {snapshot.profile.kind !== 'new' ? (
            <div className={`mb-4 rounded-md px-3 py-3 text-[11px] leading-relaxed ${extras ? 'bg-[#3b3021] text-[#e9c78d]' : 'bg-brand-lime/15 text-brand-lime'}`}>
              <strong className="mb-0.5 block text-xs font-medium">{engagementLabel(snapshot)}</strong>
              {extras
                ? 'The additional scope will need its own estimate. Work within the existing engagement stays identified separately.'
                : "We'll confirm this request against your agreement and available production capacity."}
            </div>
          ) : null}
          <label className="mb-4 block text-xs" htmlFor="session-date">
            Requested delivery date <span className="text-white/40">· Optional</span>
            <input id="session-date" type="date" className={fieldClass} value={snapshot.date} onChange={(event) => onDate(event.target.value)} />
          </label>
          {snapshot.profile.kind === 'retainer' ? (
            <label className="mb-4 block text-xs" htmlFor="session-priority">
              Where should this sit in your queue?
              <select id="session-priority" className={fieldClass} value={snapshot.priority} onChange={(event) => onPriority(event.target.value)}>
                {QUEUE.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : null}
          {budget ? (
            <label className="mb-4 block text-xs" htmlFor="session-budget">
              {extras ? 'Budget for the additional scope' : 'Budget comfort zone'}
              <select id="session-budget" className={fieldClass} value={snapshot.budget} onChange={(event) => onBudget(event.target.value)}>
                {BUDGETS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-[11px] text-white/50">
            {uploadHint}
            <input
              className="mt-2 block w-full text-[11px] text-white/70"
              type="file"
              multiple
              onChange={(event) => {
                const next = Array.from(event.target.files ?? []);
                const message = validateAttachments(next);
                if (message) {
                  event.target.value = '';
                  onFiles(files, message, false);
                  return;
                }
                onFiles(next, next.length ? 'Added to this request.' : '', true);
              }}
            />
            {files.length ? <span className="mt-2 block text-brand-lime">{files.map((file) => file.name).join(' · ')}</span> : null}
          </label>
          {driveFolderUrl ? (
            <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-[11px] text-brand-cyan hover:text-brand-lime">
              <FiHardDrive aria-hidden />
              Bigger files? Use your Drive folder.
            </a>
          ) : null}
          <p className="mt-2 min-h-4 text-[11px] text-brand-lime" aria-live="polite">
            {fileMessage}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 p-3">
          <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded">
            {accent ? <Photo piece={accent} /> : null}
          </span>
          <div>
            <strong className="block text-xs font-medium">{namesLabel(snapshot) || 'An idea with potential'}</strong>
            <p className="mt-1 text-[11px] text-white/45">{snapshot.vibes.join(' · ') || 'Room to explore together'}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/40">We&apos;ll confirm scope and timing with you.</p>
      </aside>
    </>
  );
}

function namesLabel(snapshot: SessionSnapshot): string {
  return snapshot.selected.map((id) => serviceLabel(snapshot.profile, id)).join(' + ');
}

function ReviewStep({
  snapshot,
  pasted,
  draft,
  customDraft,
  editing,
  reduce,
  onEdit,
  onDraft,
  onRewrite,
}: {
  snapshot: SessionSnapshot;
  pasted: PastedInspo[];
  draft: string;
  customDraft: string | null;
  editing: boolean;
  reduce: boolean;
  onEdit: () => void;
  onDraft: (value: string) => void;
  onRewrite: () => void;
}) {
  const missing = openTopics(snapshot);
  const extras = hasSeparateScope(snapshot);
  const budget = needsBudget(snapshot);
  const direction =
    snapshot.selected
      .map((id) => categoryLabel(snapshot.profile, id, serviceRequest(snapshot, id).category) || serviceLabel(snapshot.profile, id))
      .join(' + ') ||
    "Let's figure it out together";

  return (
    <>
      <section className="max-lg:order-2">
        <Eyebrow>05 / A shared starting point</Eyebrow>
        <Title>
          Your idea.
          <br />
          <Em>Coming together.</Em>
        </Title>
        <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-white/50">
          Here&apos;s the shape of it. Your engagement, each service, and the details that matter, in one place.
        </p>
        <ul className="mb-5 grid gap-3">
          <ReviewRow icon={FiFolder} title={snapshot.profile.name} detail={engagementLabel(snapshot)} />
          <ReviewRow icon={FiCheck} title="Your creative direction" detail={direction} />
          <ReviewRow
            icon={FiCheck}
            title="Your visual language"
            detail={`${snapshot.pins.length + pasted.length} references · ${snapshot.vibes.join(', ') || 'Open to exploration'}`}
          />
          <ReviewRow
            icon={FiMessageCircle}
            title={missing.length ? 'Still open for a conversation' : 'Ready for a scope conversation'}
            detail={missing.join(' · ') || 'Our team will confirm the plan with you.'}
          />
        </ul>
        <button type="button" onClick={onEdit} className="border-b border-white text-xs">
          {editing ? 'Done editing' : 'Make an edit'} ↗
        </button>
        {customDraft !== null ? (
          <button type="button" onClick={onRewrite} className="ml-4 border-b border-white/30 text-xs text-white/60">
            Rewrite from your answers
          </button>
        ) : null}
        <div className="mt-4 rounded-lg bg-brand-lime/15 px-4 py-3 text-xs leading-relaxed text-brand-lime">
          <strong className="mb-1 block font-medium">
            {extras ? 'A clear path for additional scope.' : 'Great work starts with alignment.'}
          </strong>
          {extras
            ? 'Your team can review the extra work separately from the existing agreement.'
            : 'The request is ready for your team to review, estimate where needed, and schedule.'}
        </div>
      </section>
      <aside className="max-lg:order-1">
        <StageHead left="Your project, on one page" right="Draft / 01" />
        <motion.article
          className="relative overflow-hidden rounded-sm bg-[#fffef7] px-6 py-7 text-[#28321b] shadow-[0_16px_40px_rgba(0,0,0,0.28)] sm:px-8"
          initial={reduce ? false : { opacity: 0, y: 16, rotate: -0.4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={stepEase}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#b3bca0] pb-4">
            <img src="/images/logos/anim-8-completewordmark-ink.svg" alt="Anim8" className="h-7 w-auto" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#616d50]">Creative brief</span>
          </div>
          <h2 className="my-4 font-heading text-[1.7rem] font-medium leading-tight tracking-tight">{briefHeadline(snapshot.goal)}</h2>
          {editing ? (
            <label className="block text-xs" htmlFor="session-editor">
              Refine your brief
              <textarea
                id="session-editor"
                className="mt-2 min-h-60 w-full rounded border border-[#9eac8a] bg-[#fffef7] p-3 text-xs leading-relaxed text-[#28321b]"
                value={draft}
                onChange={(event) => onDraft(event.target.value)}
              />
            </label>
          ) : (
            <div className="whitespace-pre-line text-xs leading-7">{draft}</div>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#b3bca0] pt-4">
            <div>
              <dt className="mb-1 font-mono text-[9px] uppercase tracking-wider text-[#667353]">Requested timing</dt>
              <dd className="text-[11px]">{formatBriefDate(snapshot.date)}</dd>
            </div>
            <div>
              <dt className="mb-1 font-mono text-[9px] uppercase tracking-wider text-[#667353]">
                {budget ? (extras ? 'Additional-scope budget' : 'Budget') : 'Agreement'}
              </dt>
              <dd className="text-[11px]">{budget ? snapshot.budget : `${snapshot.profile.name} · scope to verify`}</dd>
            </div>
          </dl>
          {snapshot.pins.length || pasted.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {snapshot.pins.map((id) => {
                const piece = snapshot.inspo.find((item) => item.id === id);
                if (!piece) return null;
                return (
                  <span key={id} className="relative h-16 w-14 overflow-hidden rounded-sm">
                    <Photo piece={piece} />
                  </span>
                );
              })}
              {pasted.map((item) => (
                <span key={item.id} className="relative h-16 w-14 overflow-hidden rounded-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-6 flex justify-between border-t border-[#b3bca0] pt-3 font-mono text-[9px] text-[#616d50]">
            <span>Made together. Made to move forward.</span>
            <span>Creative request</span>
          </div>
        </motion.article>
      </aside>
    </>
  );
}

function ReviewRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FiCheck;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-xs">
      <Icon className="mt-0.5 shrink-0 text-brand-lime" aria-hidden />
      <span>
        {title}
        <small className="mt-0.5 block text-[11px] text-white/45">{detail}</small>
      </span>
    </li>
  );
}
