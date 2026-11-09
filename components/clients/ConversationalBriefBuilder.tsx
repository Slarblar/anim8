'use client';

import { put } from '@vercel/blob/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BriefPatch } from '@/lib/conversational-brief';
import type { ConversationDraft } from '@/lib/conversational-brief-store';
import type { InspoPiece } from '@/lib/work-bank';
import { ClientPortalShell } from './ClientPortalShell';
import { LiveBriefPanel } from './LiveBriefPanel';
import { portalAlertError, portalAlertWarning, portalEyebrow } from './portal-ui';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

type Props = {
  slug: string;
  displayName: string;
  driveFolderUrl?: string;
  initialPieces: InspoPiece[];
  showExamples: boolean;
  returnHref?: string;
  returnLabel?: string;
};

type IntegrationStatus = {
  claudeConfigured: boolean;
  asanaConfigured: boolean;
  uploadsConfigured: boolean;
};

type ApiData = {
  draft: ConversationDraft;
  integrations: IntegrationStatus;
  readyForReview?: boolean;
  stale?: boolean;
};

type PendingFile = {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  url?: string;
  error?: string;
};

function safeBlobPathname(slug: string, fileName: string): string {
  const base = fileName
    .replace(/[^\w.\- ()]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `client-portal/${slug}/${Date.now()}-${base || 'file'}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function uploadAttachment(slug: string, file: File): Promise<string> {
  const pathname = safeBlobPathname(slug, file.name);
  const tokenResponse = await fetch(`/api/clients/${slug}/blob`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname, clientPayload: null, multipart: true },
    }),
  });
  const token = await readJson<{ clientToken?: string; error?: string }>(tokenResponse);
  if (!tokenResponse.ok || !token.clientToken) {
    throw new Error(token.error || 'Could not prepare that upload.');
  }
  const blob = await put(pathname, file, {
    access: 'public',
    token: token.clientToken,
    multipart: true,
  });
  return blob.url;
}

function operationId(): string {
  return `op_${crypto.randomUUID()}`;
}

function fileStatusLabel(status: PendingFile['status']): string {
  switch (status) {
    case 'queued':
      return 'Ready';
    case 'uploading':
      return 'Uploading';
    case 'uploaded':
      return 'Attached';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

const toolButton =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08] focus-lime disabled:opacity-40';

export function ConversationalBriefBuilder({
  slug,
  displayName,
  driveFolderUrl,
  initialPieces,
  showExamples,
  returnHref,
  returnLabel,
}: Props) {
  const [draft, setDraft] = useState<ConversationDraft | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [composer, setComposer] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState<string | null>('Loading your saved brief');
  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<'chat' | 'brief'>('chat');
  const [inspirationOpen, setInspirationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftStorageKey = `anim8:conversation-draft:${slug}`;
  const composerStorageKey = `anim8:conversation-composer:${slug}`;

  async function fetchDraft(draftId?: string | null): Promise<ApiData> {
    const url = new URL(`/api/clients/${slug}/conversation`, window.location.origin);
    if (draftId) url.searchParams.set('draftId', draftId);
    const response = await fetch(url, { cache: 'no-store' });
    const data = await readJson<ApiData & { error?: string }>(response);
    if (!response.ok || !data.draft) throw new Error(data.error || 'Could not load your brief.');
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    const savedComposer = window.localStorage.getItem(composerStorageKey);
    if (savedComposer) setComposer(savedComposer);
    const savedDraftId = window.localStorage.getItem(draftStorageKey);
    void (async () => {
      try {
        let data: ApiData;
        try {
          data = await fetchDraft(savedDraftId);
        } catch {
          window.localStorage.removeItem(draftStorageKey);
          data = await fetchDraft();
        }
        if (cancelled) return;
        setDraft(data.draft);
        setIntegrations(data.integrations);
        window.localStorage.setItem(draftStorageKey, data.draft.id);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load your brief.');
        }
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keys are stable for this mounted client route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    window.localStorage.setItem(composerStorageKey, composer);
  }, [composer, composerStorageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [draft?.messages.length, busy]);

  useEffect(() => {
    if (pane !== 'brief' || window.matchMedia('(min-width: 1024px)').matches) return;
    document.getElementById('live-brief-heading')?.focus();
  }, [pane]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.client-portal-shell--workspace');
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const viewport = window.visualViewport;
    const syncViewport = () => {
      if (!shell || !viewport) return;
      shell.style.height = `${viewport.height}px`;
      shell.style.maxHeight = `${viewport.height}px`;
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);

    const syncBannerOffset = () => {
      const dialog = document.getElementById('cookie-banner-title')?.closest('[role="dialog"]');
      const height = dialog ? Math.ceil(dialog.getBoundingClientRect().height) + 28 : 0;
      shell?.style.setProperty('padding-bottom', height ? `${height}px` : '');
    };
    syncBannerOffset();
    const bannerObserver = new MutationObserver(syncBannerOffset);
    bannerObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', syncBannerOffset);

    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousBody;
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      bannerObserver.disconnect();
      window.removeEventListener('resize', syncBannerOffset);
      if (shell) {
        shell.style.height = '';
        shell.style.maxHeight = '';
        shell.style.paddingBottom = '';
      }
    };
  }, []);

  async function callAction(
    body: Record<string, unknown>,
    options: { clearError?: boolean } = {}
  ): Promise<ApiData> {
    if (options.clearError !== false) setError(null);
    const response = await fetch(`/api/clients/${slug}/conversation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await readJson<ApiData & { error?: string }>(response);
    if (!response.ok || !data.draft) throw new Error(data.error || 'Could not save that update.');
    setDraft(data.draft);
    setIntegrations(data.integrations);
    return data;
  }

  async function reloadDraft() {
    if (!draft) return;
    try {
      const data = await fetchDraft(draft.id);
      setDraft(data.draft);
      setIntegrations(data.integrations);
    } catch {
      // Keep the last known state; the primary error is more useful.
    }
  }

  function queueFiles(selected: File[]) {
    setError(null);
    const next = selected.filter((file) => file.size > 0);
    if (files.length + next.length > MAX_FILES) {
      setError('Five files is the maximum for one request.');
      return;
    }
    if (next.some((file) => file.size > MAX_FILE_BYTES)) {
      setError('Each file must be 50 MB or smaller.');
      return;
    }
    const total = [...files.map((item) => item.file), ...next].reduce(
      (sum, file) => sum + file.size,
      0
    );
    if (total > MAX_TOTAL_BYTES) {
      setError('Attachments must be 50 MB or less altogether. Use your Drive folder for larger files.');
      return;
    }
    setFiles((current) => [
      ...current,
      ...next.map((file) => ({
        id: `file_${crypto.randomUUID()}`,
        file,
        status: 'queued' as const,
      })),
    ]);
  }

  async function uploadQueuedFiles(): Promise<Array<{ name: string; url: string; role: 'reference' }>> {
    const uploaded: Array<{ name: string; url: string; role: 'reference' }> = [];
    for (const item of files) {
      if (item.url) {
        uploaded.push({ name: item.file.name, url: item.url, role: 'reference' });
        continue;
      }
      setFiles((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading' } : entry))
      );
      try {
        const url = await uploadAttachment(slug, item.file);
        uploaded.push({ name: item.file.name, url, role: 'reference' });
        setFiles((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: 'uploaded', url } : entry
          )
        );
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Upload failed.';
        setFiles((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: 'failed', error: message } : entry
          )
        );
        throw new Error(message);
      }
    }
    return uploaded;
  }

  async function sendMessage(retry?: { id: string; text: string }) {
    if (!draft || busy) return;
    const text = retry?.text ?? composer;
    if (!text.trim() && files.length === 0) return;
    const opId = retry?.id ?? operationId();
    setBusy(files.length ? 'Uploading references' : 'Reading your request');
    setError(null);
    try {
      const attachments = retry ? [] : await uploadQueuedFiles();
      setBusy('Updating the brief');
      const data = await callAction({
        action: 'message',
        draftId: draft.id,
        operationId: opId,
        text,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        attachments,
        links: [],
      });
      if (!retry) {
        setComposer('');
        setFiles([]);
        window.localStorage.removeItem(composerStorageKey);
      }
      if (data.readyForReview) setPane('brief');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'That message did not go through.');
      await reloadDraft();
    } finally {
      setBusy(null);
    }
  }

  async function editBrief(patch: BriefPatch) {
    if (!draft || busy) return;
    setBusy('Saving brief');
    try {
      await callAction({
        action: 'edit',
        draftId: draft.id,
        operationId: operationId(),
        expectedVersion: draft.brief.version,
        patch,
      });
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Could not save that edit.');
      await reloadDraft();
    } finally {
      setBusy(null);
    }
  }

  async function reviewBrief() {
    if (!draft || busy) return;
    setBusy('Opening review');
    try {
      await callAction({
        action: 'review',
        draftId: draft.id,
        operationId: operationId(),
        expectedVersion: draft.brief.version,
      });
      setPane('brief');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not open review.');
    } finally {
      setBusy(null);
    }
  }

  async function approveBrief() {
    if (!draft || busy) return;
    setBusy('Approving this version');
    try {
      await callAction({
        action: 'approve',
        draftId: draft.id,
        operationId: operationId(),
        expectedVersion: draft.brief.version,
      });
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Could not approve this version.');
      await reloadDraft();
    } finally {
      setBusy(null);
    }
  }

  async function submitBrief() {
    if (!draft || busy) return;
    setBusy('Sending to the team');
    try {
      await callAction({
        action: 'submit',
        draftId: draft.id,
        operationId: operationId(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The request was not confirmed.');
      await reloadDraft();
    } finally {
      setBusy(null);
    }
  }

  const briefPanel = draft ? (
    <LiveBriefPanel
      draft={draft}
      busy={Boolean(busy)}
      onEdit={editBrief}
      onReview={reviewBrief}
      onApprove={approveBrief}
      onSubmit={submitBrief}
    />
  ) : null;

  const recentPieces = useMemo(() => initialPieces.slice(0, 8), [initialPieces]);
  const openCount =
    draft?.brief.openItems.filter((item) => item.status !== 'resolved').length ?? 0;
  const canSend = Boolean(draft) && !busy && (composer.trim().length > 0 || files.length > 0);

  return (
    <ClientPortalShell
      slug={slug}
      backHref={returnHref ?? `/clients/${slug}`}
      backLabel={returnLabel}
      session
      workspace
    >
      <div className="flex min-h-0 flex-1 flex-col pb-3 pt-3 sm:pb-4 sm:pt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={portalEyebrow}>{displayName}</p>
            <h1 className="mt-1 text-lg font-black uppercase leading-[1.05] tracking-tight text-white sm:text-2xl">
              What are we bringing to life?
            </h1>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 lg:hidden" role="tablist" aria-label="Request views">
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'chat'}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus-lime ${pane === 'chat' ? 'bg-white/10 text-white' : 'text-white/55'}`}
            onClick={() => setPane('chat')}
          >
            Conversation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'brief'}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus-lime ${pane === 'brief' ? 'bg-white/10 text-white' : 'text-white/55'}`}
            onClick={() => setPane('brief')}
          >
            Brief{draft ? ` · v${draft.brief.version}` : ''}
            {openCount ? <span className="sr-only">, {openCount} open items</span> : null}
          </button>
        </div>

        {!integrations?.claudeConfigured && integrations ? (
          <div className={`${portalAlertWarning} mb-3 text-sm`}>
            The assistant can&apos;t reply yet. Your draft is still saved, and you can keep editing
            the brief directly.
          </div>
        ) : null}
        {!integrations?.uploadsConfigured && integrations ? (
          <div className={`${portalAlertWarning} mb-3 text-sm`}>
            Attachments aren&apos;t available right now. Paste a reference link
            {driveFolderUrl ? ', or use your Drive folder under the message box' : ''}.
          </div>
        ) : null}
        {error ? (
          <div className={`${portalAlertError} mb-3 text-sm`} role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <section
            className={`brief-card h-full min-h-0 flex-col overflow-hidden ${pane === 'brief' ? 'hidden lg:flex' : 'flex'}`}
          >
            <div
              className="intake-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5"
              aria-live="polite"
              aria-busy={Boolean(busy)}
            >
              {draft?.messages.length ? (
                draft.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[min(100%,36rem)]">
                      <p className={`mb-1 text-xs font-semibold ${message.role === 'client' ? 'text-right text-white/45' : 'text-brand-lime'}`}>
                        {message.role === 'client' ? 'You' : 'Anim-8'}
                      </p>
                      <div
                        className={`rounded-2xl px-4 py-3 text-base leading-relaxed sm:text-[0.95rem] ${
                          message.role === 'client'
                            ? 'rounded-br-md bg-brand-cyan/20 text-white'
                            : 'rounded-bl-md border border-white/10 bg-white/[0.05] text-white/90'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        {message.attachmentIds.length ? (
                          <p className="mt-2 text-xs text-white/50">
                            {message.attachmentIds.length} attachment
                            {message.attachmentIds.length === 1 ? '' : 's'}
                          </p>
                        ) : null}
                        {message.status === 'failed' && message.operationId ? (
                          <button
                            type="button"
                            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-lime underline focus-lime"
                            onClick={() =>
                              void sendMessage({ id: message.operationId!, text: message.text })
                            }
                          >
                            Retry this turn
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="max-w-xl py-2">
                  <p className="text-base font-semibold text-white sm:text-lg">Start with whatever you already know.</p>
                  <p className="intake-intro-copy mt-1 text-sm leading-relaxed text-white/60 sm:text-base">
                    A sentence, a pasted brief, or a list of assets is enough. Details can come later.
                  </p>
                  {showExamples ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        'We need launch content for Instagram.',
                        'Four reels and one poster for our new drop.',
                        'Help us scope a 3D product animation.',
                      ].map((example) => (
                        <button
                          key={example}
                          type="button"
                          className="min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-left text-sm text-white/75 hover:border-brand-lime/40 hover:text-white focus-lime"
                          onClick={() => setComposer(example)}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {busy && busy !== 'Loading your saved brief' ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/70">
                    {busy}…
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#0c0d14]/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
              {files.length ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {files.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3 pr-1 text-sm text-white/75"
                    >
                      <span className="max-w-[12rem] truncate sm:max-w-[18rem]">{item.file.name}</span>
                      <span className="text-xs text-brand-cyan">{fileStatusLabel(item.status)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/55 hover:text-white focus-lime"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  onCompositionStart={() => {
                    composingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    composingRef.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !composingRef.current &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={2}
                  className="max-h-36 min-h-12 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-base leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-brand-lime/55 focus:ring-2 focus:ring-brand-lime/20 disabled:opacity-60 sm:text-sm"
                  placeholder="Describe the work, paste a brief, or correct a detail…"
                  aria-label="Message the brief assistant"
                  disabled={!draft || Boolean(busy)}
                />
                <button
                  type="button"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-cyan/50 bg-brand-cyan text-white shadow-[0_4px_16px_rgba(56,194,214,0.28)] transition hover:brightness-110 focus-lime disabled:opacity-40"
                  onClick={() => void sendMessage()}
                  disabled={!canSend}
                  aria-label={busy ? busy : 'Send'}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(event) => {
                  queueFiles(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={toolButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!integrations?.uploadsConfigured || Boolean(busy)}
                >
                  Attach
                </button>
                <button
                  type="button"
                  className={toolButton}
                  onClick={() => setInspirationOpen((value) => !value)}
                  disabled={!recentPieces.length}
                  aria-expanded={inspirationOpen}
                >
                  References
                </button>
                {driveFolderUrl ? (
                  <a
                    href={driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={toolButton}
                  >
                    Drive folder
                  </a>
                ) : null}
                <p className="hidden text-xs text-white/40 min-[900px]:block">
                  Enter sends · Shift+Enter adds a line · 5 files, 50 MB total
                </p>
              </div>

              {inspirationOpen ? (
                <div className="mt-3 grid max-h-52 grid-cols-2 gap-2 overflow-y-auto border-t border-white/10 pt-3 sm:grid-cols-4">
                  {recentPieces.map((piece) => (
                    <button
                      key={piece.id}
                      type="button"
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-brand-lime/40 focus-lime"
                      onClick={() => {
                        const line = `I like ${piece.title}${piece.client ? ` for ${piece.client}` : ''} as a visual reference.`;
                        setComposer((current) => (current.trim() ? `${current.trim()}\n${line}` : line));
                        setInspirationOpen(false);
                      }}
                    >
                      {piece.imageUrl ? (
                        // Work-bank sources can be local or remote; the existing bank validates them.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={piece.imageUrl}
                          alt=""
                          className="aspect-video w-full object-cover"
                        />
                      ) : null}
                      <span className="block truncate px-2 py-2 text-xs text-white/75">
                        {piece.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <aside className={`h-full min-h-0 ${pane === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="brief-card flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              {briefPanel ?? (
                <div className="grid flex-1 place-items-center px-6 text-center text-sm text-white/55">
                  {busy === 'Loading your saved brief' ? 'Loading your saved brief…' : 'The brief will appear here.'}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </ClientPortalShell>
  );
}
