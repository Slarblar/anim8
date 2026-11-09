'use client';

import { put } from '@vercel/blob/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BriefPatch } from '@/lib/conversational-brief';
import type { ConversationDraft } from '@/lib/conversational-brief-store';
import type { InspoPiece } from '@/lib/work-bank';
import { ClientDriveFolderCallout } from './ClientDriveFolderCallout';
import { ClientPortalShell } from './ClientPortalShell';
import { LiveBriefPanel } from './LiveBriefPanel';
import {
  portalAlertError,
  portalAlertWarning,
  portalBody,
  portalBtnPrimary,
  portalBtnSecondary,
  portalEyebrow,
  portalPageTitle,
} from './portal-ui';

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
  const [mobileBriefOpen, setMobileBriefOpen] = useState(false);
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
      if (data.readyForReview) setMobileBriefOpen(true);
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
      setMobileBriefOpen(true);
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

  return (
    <ClientPortalShell
      slug={slug}
      backHref={returnHref ?? `/clients/${slug}`}
      backLabel={returnLabel}
      session
      headerAction={
        <button
          type="button"
          className={`${portalBtnSecondary} lg:hidden`}
          onClick={() => setMobileBriefOpen(true)}
          disabled={!draft}
        >
          Review brief {draft ? `· v${draft.brief.version}` : ''}
        </button>
      }
    >
      <div className="py-8 sm:py-12">
        <div className="mb-8 max-w-3xl">
          <p className={portalEyebrow}>{displayName} · New request</p>
          <h1 className={`${portalPageTitle} mt-3`}>What are we bringing to life?</h1>
          <p className={`${portalBody} mt-4 max-w-2xl text-base`}>
            Tell us what you need, however it comes to mind. We&apos;ll turn it into a clear brief
            for the team.
          </p>
        </div>

        {!integrations?.claudeConfigured && integrations ? (
          <div className={`${portalAlertWarning} mb-5`}>
            Conversational drafting is not configured yet. Your draft is still saved, but an
            administrator must add <code>ANTHROPIC_API_KEY</code> before the assistant can respond.
          </div>
        ) : null}
        {!integrations?.uploadsConfigured && integrations ? (
          <div className={`${portalAlertWarning} mb-5`}>
            Direct file uploads are unavailable because <code>BLOB_READ_WRITE_TOKEN</code> is not
            configured. Paste reference links{driveFolderUrl ? ' or use your Drive folder below' : ''}.
          </div>
        ) : null}
        {error ? (
          <div className={`${portalAlertError} mb-5`} role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="brief-card min-w-0 overflow-hidden">
            <div
              className="min-h-[28rem] space-y-4 overflow-y-auto px-4 py-5 sm:px-6 lg:max-h-[68vh]"
              aria-live="polite"
              aria-busy={Boolean(busy)}
            >
              {draft?.messages.length ? (
                draft.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                        message.role === 'client'
                          ? 'rounded-br-md bg-brand-cyan/20 text-white'
                          : 'rounded-bl-md border border-white/10 bg-white/[0.045] text-white/85'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      {message.attachmentIds.length ? (
                        <p className="mt-2 text-[10px] uppercase tracking-wider text-white/45">
                          {message.attachmentIds.length} attachment
                          {message.attachmentIds.length === 1 ? '' : 's'}
                        </p>
                      ) : null}
                      {message.status === 'failed' && message.operationId ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-bold text-brand-lime underline"
                          onClick={() =>
                            void sendMessage({ id: message.operationId!, text: message.text })
                          }
                        >
                          Retry this turn
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="mx-auto max-w-xl py-12 text-center">
                  <p className="text-lg font-bold text-white">Start with the idea.</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Paste a complete brief or describe something rough. Services and technical
                    details can come later.
                  </p>
                  {showExamples ? (
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {[
                        'We need launch content for Instagram.',
                        'Four reels and one poster for our new drop.',
                        'Help us scope a 3D product animation.',
                      ].map((example) => (
                        <button
                          key={example}
                          type="button"
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 hover:border-brand-lime/40 hover:text-white"
                          onClick={() => setComposer(example)}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {busy === 'Updating the brief' ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/55">
                    Updating the live brief…
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 bg-[#0d0e16]/95 p-4 sm:p-5">
              {files.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {files.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/65"
                    >
                      <span className="truncate">{item.file.name}</span>
                      <span className="text-[9px] uppercase text-brand-cyan">{item.status}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))}
                        className="text-white/45 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
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
                rows={4}
                className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-brand-lime/50 focus:ring-2 focus:ring-brand-lime/15"
                placeholder="Describe what you need, paste a brief, or correct anything…"
                aria-label="Message the brief assistant"
                disabled={!draft || Boolean(busy)}
              />
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
              <div className="mt-3 flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={portalBtnSecondary}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!integrations?.uploadsConfigured || Boolean(busy)}
                  >
                    Attach files
                  </button>
                  <button
                    type="button"
                    className={portalBtnSecondary}
                    onClick={() => setInspirationOpen((value) => !value)}
                    disabled={!recentPieces.length}
                  >
                    Studio references
                  </button>
                </div>
                <button
                  type="button"
                  className={portalBtnPrimary}
                  onClick={() => void sendMessage()}
                  disabled={!draft || Boolean(busy) || (!composer.trim() && files.length === 0)}
                >
                  {busy || 'Send'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/35">
                Enter sends · Shift+Enter adds a line · Up to 5 files / 50 MB total
              </p>

              {inspirationOpen ? (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
                  {recentPieces.map((piece) => (
                    <button
                      key={piece.id}
                      type="button"
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-brand-lime/40"
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
                      <span className="block truncate px-2 py-2 text-[11px] text-white/70">
                        {piece.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="hidden min-w-0 lg:block">
            <div className="brief-card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
              {briefPanel}
            </div>
          </aside>
        </div>

        {driveFolderUrl ? <ClientDriveFolderCallout url={driveFolderUrl} /> : null}
      </div>

      {mobileBriefOpen && draft ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/75 p-0 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Review brief"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#11121b] p-5 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white"
                onClick={() => setMobileBriefOpen(false)}
              >
                Close
              </button>
            </div>
            {briefPanel}
          </div>
        </div>
      ) : null}
    </ClientPortalShell>
  );
}
