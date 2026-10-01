'use client';

import { put } from '@vercel/blob/client';
import { useCallback, useEffect, useState } from 'react';
import {
  adminAlertError,
  adminAlertSuccess,
  adminBody,
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminCheckbox,
  adminInput,
  adminLabel,
  adminSectionTitle,
} from './admin-ui';
import {
  WORK_TAGS,
  pieceCaption,
  pieceStill,
  workTagLabel,
  type WorkPiece,
  type WorkTag,
} from '@/lib/work-bank';
import { toLosslessWebp } from './lossless-webp';

type Draft = {
  id: string | null;
  title: string;
  client: string;
  year: string;
  imageUrl: string;
  gumletUrl: string;
  tags: WorkTag[];
  stat: string;
  file: File | null;
};

const EMPTY: Draft = {
  id: null,
  title: '',
  client: '',
  year: '',
  imageUrl: '',
  gumletUrl: '',
  tags: [],
  stat: '',
  file: null,
};

function safePathname(fileName: string): string {
  const base = fileName.replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `work-bank/${Date.now()}-${base || 'still'}`;
}

async function uploadStill(file: File): Promise<string> {
  const pathname = safePathname(file.name);
  const tokenRes = await fetch('/api/admin/work/blob', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname, clientPayload: null, multipart: true },
    }),
  });
  const tokenData = (await tokenRes.json().catch(() => ({}))) as { clientToken?: string; error?: string };
  if (!tokenRes.ok || !tokenData.clientToken) {
    throw new Error(tokenData.error ?? 'That image did not upload.');
  }
  const blob = await put(pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    multipart: true,
  });
  return blob.url;
}

export function AdminWorkBank() {
  const [pieces, setPieces] = useState<WorkPiece[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'convert' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/work');
      const data = (await res.json().catch(() => ({}))) as { pieces?: WorkPiece[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not load the work bank.');
      setPieces(Array.isArray(data.pieces) ? data.pieces : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the work bank.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!draft.file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.file]);

  function edit(piece: WorkPiece) {
    setNotice(null);
    setError(null);
    setDraft({
      id: piece.id,
      title: piece.title,
      client: piece.client,
      year: piece.year,
      imageUrl: piece.imageUrl,
      gumletUrl: piece.gumletUrl,
      tags: piece.tags,
      stat: piece.stat,
      file: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleTag(tag: WorkTag) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  }

  async function save() {
    if (busy) return;
    setError(null);
    setNotice(null);
    try {
      let imageUrl = draft.imageUrl;
      if (draft.file) {
        setBusy('convert');
        const webp = await toLosslessWebp(draft.file);
        setBusy('save');
        imageUrl = await uploadStill(webp);
      } else {
        setBusy('save');
      }
      const payload = {
        title: draft.title,
        client: draft.client,
        year: draft.year,
        imageUrl,
        gumletUrl: draft.gumletUrl,
        tags: draft.tags,
        stat: draft.stat,
      };
      const res = await fetch(draft.id ? `/api/admin/work/${draft.id}` : '/api/admin/work', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not save that piece.');
      setDraft(EMPTY);
      setFormKey((key) => key + 1);
      setNotice(draft.id ? 'Piece updated.' : 'Piece added to the bank.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that piece.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(piece: WorkPiece) {
    if (!window.confirm(`Remove “${piece.title}” from the work bank?`)) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/work/${piece.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not delete that piece.');
      if (draft.id === piece.id) setDraft(EMPTY);
      setNotice('Piece removed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that piece.');
    }
  }

  const still = previewUrl || pieceStill(draft);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className={adminSectionTitle}>Work bank</h1>
        <p className={`${adminBody} mt-2 max-w-2xl`}>
          Upload stills and Gumlet links, then tag them. The brief builder pulls from this bank and fills inspiration
          with work that matches the request.
        </p>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}
      {notice ? <p className={adminAlertSuccess}>{notice}</p> : null}

      <section className={adminCard}>
        <h2 className="mb-4 text-sm font-black uppercase tracking-tight text-white">
          {draft.id ? 'Edit piece' : 'Add a piece'}
        </h2>
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
            {still ? (
              // Admin preview of a blob or Gumlet still. next/image is not configured for those hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={still} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full place-items-center px-4 text-center text-xs text-text-muted">
                Still or Gumlet thumbnail
              </span>
            )}
            {draft.stat.trim() ? (
              <span className="absolute left-2 top-2 rounded-full bg-brand-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-brand-black">
                {draft.stat}
              </span>
            ) : null}
          </div>
          <div className="grid gap-3">
            <label className={adminLabel}>
              Project title
              <input
                className={adminInput}
                value={draft.title}
                maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={adminLabel}>
                Client
                <input
                  className={adminInput}
                  value={draft.client}
                  maxLength={80}
                  onChange={(event) => setDraft((current) => ({ ...current, client: event.target.value }))}
                />
              </label>
              <label className={adminLabel}>
                Year
                <input
                  className={adminInput}
                  value={draft.year}
                  maxLength={16}
                  placeholder="2025"
                  onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
                />
              </label>
            </div>
            <label className={adminLabel}>
              Still
              <span className="mb-1.5 block text-[10px] font-medium normal-case tracking-normal text-text-muted">
                Saved as lossless WebP. A GIF keeps its first frame.
              </span>
              <input
                key={formKey}
                className={`${adminInput} file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setDraft((current) => ({ ...current, file }));
                }}
              />
            </label>
            {draft.imageUrl && !draft.file ? (
              <button
                type="button"
                className={`${adminBtnGhost} w-fit`}
                onClick={() => setDraft((current) => ({ ...current, imageUrl: '' }))}
              >
                Remove current still
              </button>
            ) : null}
            <label className={adminLabel}>
              Gumlet link
              <input
                className={adminInput}
                value={draft.gumletUrl}
                placeholder="https://play.gumlet.io/embed/…"
                onChange={(event) => setDraft((current) => ({ ...current, gumletUrl: event.target.value }))}
              />
            </label>
            <label className={adminLabel}>
              Stat
              <span className="mb-1.5 block text-[10px] font-medium normal-case tracking-normal text-text-muted">
                Optional. Clients see this on the piece, like 1M+ views.
              </span>
              <input
                className={adminInput}
                value={draft.stat}
                maxLength={32}
                placeholder="1M+ views"
                onChange={(event) => setDraft((current) => ({ ...current, stat: event.target.value }))}
              />
            </label>
            <fieldset>
              <legend className={adminLabel}>Tags</legend>
              <div className="flex flex-wrap gap-2">
                {WORK_TAGS.map((tag) => {
                  const on = draft.tags.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
                        on ? 'border-brand-cyan/50 bg-brand-cyan/10 text-white' : 'border-white/10 text-text-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className={adminCheckbox}
                        checked={on}
                        onChange={() => toggleTag(tag.id)}
                      />
                      {tag.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={adminBtnPrimary} disabled={busy !== null} onClick={() => void save()}>
                {busy === 'convert' ? 'Converting…' : busy === 'save' ? 'Saving…' : draft.id ? 'Save changes' : 'Add to bank'}
              </button>
              {draft.id || draft.title || draft.file ? (
                <button
                  type="button"
                  className={adminBtnSecondary}
                  disabled={busy !== null}
                  onClick={() => {
                    setDraft(EMPTY);
                    setFormKey((key) => key + 1);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-tight text-white">
          {loading ? 'Loading…' : `${pieces.length} piece${pieces.length === 1 ? '' : 's'}`}
        </h2>
        {pieces.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pieces.map((piece) => {
              const src = pieceStill(piece);
              return (
                <li key={piece.id} className={`${adminCard} flex flex-col gap-3`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white/[0.03]">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    {piece.stat ? (
                      <span className="absolute left-2 top-2 rounded-full bg-brand-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-brand-black">
                        {piece.stat}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <strong className="block text-sm text-white">{piece.title}</strong>
                    <p className="mt-1 text-xs text-text-muted">{pieceCaption(piece) || 'No client or year'}</p>
                  </div>
                  <p className="text-[11px] text-text-muted">{piece.tags.map(workTagLabel).join(' · ')}</p>
                  <div className="mt-auto flex gap-2">
                    <button type="button" className={adminBtnGhost} onClick={() => edit(piece)}>
                      Edit
                    </button>
                    <button type="button" className={adminBtnDanger} onClick={() => void remove(piece)}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : loading ? null : (
          <p className={adminBody}>Nothing in the bank yet. The brief builder stays empty until a piece is added.</p>
        )}
      </section>
    </div>
  );
}
