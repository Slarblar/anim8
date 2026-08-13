'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientRecord } from '@/lib/client-registry';
import type {
  ClientPortalActiveTask,
  ClientPortalApprovedTask,
  ClientPortalPastTask,
  ClientPortalTask,
  ClientPortalTasks,
} from '@/lib/asana';
import {
  adminAlertError,
  adminAlertSuccess,
  adminBadgeActive,
  adminBadgeInactive,
  adminBody,
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminLabel,
  adminSectionTitle,
  adminSelect,
  adminSelectChevronStyle,
} from './admin-ui';

type AsanaOption = { gid: string; name: string; enabled: boolean };

type AdminProjectRow = (ClientPortalTask | ClientPortalApprovedTask | ClientPortalActiveTask | ClientPortalPastTask) & {
  stage: 'Pending' | 'Approved' | 'Production' | 'Design' | 'Past';
};

function formatDueDate(dueOn: string | null): string {
  if (!dueOn) return 'No due date';
  return new Date(`${dueOn}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Today's date as YYYY-MM-DD (local) — matches the dueOn string format from Asana. */
function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isOverdue(row: AdminProjectRow): boolean {
  if (row.stage === 'Past') return false;
  return !!row.dueOn && row.dueOn < todayDateString() && row.progress.percent !== 100;
}

function isDueSoon(row: AdminProjectRow): boolean {
  if (row.stage === 'Past') return false;
  if (!row.dueOn || isOverdue(row) || row.progress.percent === 100) return false;
  const due = new Date(`${row.dueOn}T00:00:00`).getTime();
  const in7Days = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return due <= in7Days;
}

function mergeProjectRows(tasks: ClientPortalTasks): AdminProjectRow[] {
  const current: AdminProjectRow[] = [
    ...tasks.pending.map((t) => ({ ...t, stage: 'Pending' as const })),
    ...tasks.approved.map((t) => ({ ...t, stage: 'Approved' as const })),
    ...tasks.active.map((t) => ({ ...t, stage: t.pipeline })),
  ].sort((a, b) => {
    if (!a.dueOn && !b.dueOn) return 0;
    if (!a.dueOn) return 1;
    if (!b.dueOn) return -1;
    return a.dueOn.localeCompare(b.dueOn);
  });
  const past: AdminProjectRow[] = (tasks.past ?? []).map((t) => ({ ...t, stage: 'Past' as const }));
  past.sort((a, b) => {
    const aCompleted = 'completedAt' in a ? a.completedAt : null;
    const bCompleted = 'completedAt' in b ? b.completedAt : null;
    if (aCompleted && bCompleted) return bCompleted.localeCompare(aCompleted);
    if (aCompleted) return -1;
    if (bCompleted) return 1;
    return 0;
  });
  return [...current, ...past];
}

const STAGE_BADGE_CLASS: Record<AdminProjectRow['stage'], string> = {
  Pending: 'border-white/20 text-text-muted',
  Approved: 'border-brand-lime/30 bg-brand-lime/10 text-brand-lime',
  Production: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
  Design: 'border-brand-pink/30 bg-brand-pink/10 text-brand-pink',
  Past: 'border-white/15 text-text-muted',
};

function ProjectProgressBar({ progress }: { progress: AdminProjectRow['progress'] }) {
  if (progress.percent === null) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="portal-progress-track h-1.5 min-w-0 flex-1 rounded-full border border-white/5 bg-black/20">
        <div className="portal-progress-fill h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${progress.percent}%` }} />
      </div>
      <span className="shrink-0 font-mono text-[10px] text-text-muted">{progress.percent}%</span>
    </div>
  );
}

function ProjectRow({ row }: { row: AdminProjectRow }) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(row);
  const dueSoon = isDueSoon(row);

  return (
    <li className={`admin-collapse-card rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 ${expanded ? 'admin-collapse-card--expanded' : ''}`}>
      <button
        type="button"
        className="admin-collapse-toggle flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{row.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`font-mono text-xs ${overdue ? 'font-bold text-brand-pink' : dueSoon ? 'text-yellow-300' : 'text-text-muted'}`}
          >
            {overdue ? 'OVERDUE ' : ''}
            {row.stage === 'Past'
              ? 'completedAt' in row && row.completedAt
                ? formatDueDate(row.completedAt)
                : 'Archived'
              : formatDueDate(row.dueOn)}
          </span>
          <span className={`admin-collapse-chevron text-brand-cyan ${expanded ? 'admin-collapse-chevron--open' : ''}`} aria-hidden>
            ▾
          </span>
        </div>
      </button>

      <ProjectProgressBar progress={row.progress} />

      <div className={`admin-collapse-expand ${expanded ? 'admin-collapse-expand--open' : ''}`} aria-hidden={!expanded}>
        <div className="admin-collapse-expand-inner space-y-1.5 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono ${STAGE_BADGE_CLASS[row.stage]}`}>
              {row.stage}
            </span>
            {'status' in row && row.status ? (
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                {row.status}
              </span>
            ) : null}
            {'needsClientApproval' in row && row.needsClientApproval ? (
              <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300 font-mono">
                Awaiting client approval
              </span>
            ) : null}
          </div>
          {row.progress.totalSubtasks > 0 ? (
            <p className="text-xs text-text-muted">
              {row.progress.completedSubtasks}/{row.progress.totalSubtasks} steps complete
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Collapsible per-client project list — progress + due dates at a glance, so admins know who to follow up with. */
function AdminClientProjects({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<ClientPortalTasks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${slug}/projects`);
      const data = (await res.json()) as ClientPortalTasks & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load projects.');
        return;
      }
      setTasks(data);
    } catch {
      setError('Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
    if (!tasks && !loading) load();
  }, [tasks, loading, load]);

  const rows = tasks ? mergeProjectRows(tasks) : [];
  const overdueCount = rows.filter(isOverdue).length;
  const dueSoonCount = rows.filter(isDueSoon).length;

  return (
    <div className={`admin-collapse-card rounded-lg border border-white/10 ${open ? 'admin-collapse-card--expanded' : ''}`}>
      <button
        type="button"
        className="admin-collapse-toggle flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-text-muted">
          <span className="text-white">Projects</span>
          {tasks ? (
            <>
              <span className="text-white/20" aria-hidden>·</span>
              <span>{rows.length} total</span>
              {overdueCount > 0 ? (
                <>
                  <span className="text-white/20" aria-hidden>·</span>
                  <span className="text-brand-pink">{overdueCount} overdue</span>
                </>
              ) : null}
              {dueSoonCount > 0 ? (
                <>
                  <span className="text-white/20" aria-hidden>·</span>
                  <span className="text-yellow-300">{dueSoonCount} due this week</span>
                </>
              ) : null}
            </>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-cyan">
            {open ? 'Hide' : 'View'}
          </span>
          <span className={`admin-collapse-chevron text-brand-cyan ${open ? 'admin-collapse-chevron--open' : ''}`} aria-hidden>
            ▾
          </span>
        </span>
      </button>

      <div className={`admin-collapse-expand ${open ? 'admin-collapse-expand--open' : ''}`} aria-hidden={!open}>
        <div className="admin-collapse-expand-inner space-y-2 border-t border-white/10 px-3 pb-3 pt-2.5">
          {loading && !tasks ? (
            <p className={adminBody}>Loading projects…</p>
          ) : error ? (
            <p className={adminAlertError}>{error}</p>
          ) : tasks === null ? null : rows.length === 0 ? (
            <p className={adminBody}>No projects found for this client.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <ProjectRow key={row.gid} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AddClientForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [options, setOptions] = useState<AsanaOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [fieldOptionGid, setFieldOptionGid] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/asana/client-field-options')
      .then((res) => res.json())
      .then((data: { options?: AsanaOption[] }) => {
        if (!cancelled) setOptions(data.options ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load existing Asana clients.');
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = useCallback(() => {
    setDisplayName('');
    setContactEmail('');
    setSlug('');
    setFieldOptionGid('');
    setNewOptionName('');
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/admin/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            contactEmail,
            slug: slug || undefined,
            fieldOptionGid: fieldOptionGid || undefined,
            fieldOptionName: fieldOptionGid ? undefined : newOptionName,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Could not create client.');
          return;
        }

        resetForm();
        setOpen(false);
        onCreated();
      } catch {
        setError('Could not create client. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [displayName, contactEmail, slug, fieldOptionGid, newOptionName, onCreated, resetForm]
  );

  return (
    <div className={`${adminCard} admin-collapse-card ${open ? 'admin-collapse-card--expanded' : ''}`}>
      <button
        type="button"
        className="admin-collapse-toggle flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        aria-label={open ? 'Collapse add client form' : 'Expand to add a new client'}
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className={adminSectionTitle}>Add client</h2>
        <span
          className="shrink-0 select-none text-[1.75rem] font-light leading-none text-brand-cyan transition-colors hover:text-white"
          aria-hidden
        >
          {open ? '−' : '+'}
        </span>
      </button>

      <div
        className={`admin-collapse-expand ${open ? 'admin-collapse-expand--open' : ''}`}
        aria-hidden={!open}
      >
        <form
          onSubmit={handleSubmit}
          className="admin-collapse-expand-inner space-y-4 border-t border-white/10 pt-4"
        >
          <div className="grid gap-4 min-[640px]:grid-cols-2">
            <div>
              <label className={adminLabel} htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                className={adminInput}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="TurnEmSideways"
                required={open}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="contactEmail">
                Contact email
              </label>
              <input
                id="contactEmail"
                type="email"
                className={adminInput}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@client.com"
                required={open}
              />
            </div>
          </div>

          <div>
            <label className={adminLabel} htmlFor="slug">
              Portal link slug (optional — auto-generated if blank)
            </label>
            <input
              id="slug"
              className={adminInput}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="turnemsideways2026"
            />
          </div>

          <div>
            <label className={adminLabel} htmlFor="fieldOption">
              Asana &quot;Design Clients&quot; value
            </label>
            <select
              id="fieldOption"
              className={adminSelect}
              style={adminSelectChevronStyle}
              value={fieldOptionGid}
              onChange={(e) => setFieldOptionGid(e.target.value)}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading ? 'Loading Asana clients…' : '— Create a new Asana client —'}
              </option>
              {options.map((option) => (
                <option key={option.gid} value={option.gid}>
                  {option.name}
                </option>
              ))}
            </select>
            {!fieldOptionGid ? (
              <input
                className={`${adminInput} mt-2`}
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                placeholder="New Asana client name (e.g. TurnEmSideways)"
              />
            ) : null}
          </div>

          {error ? <p className={adminAlertError}>{error}</p> : null}

          <button type="submit" className={adminBtnPrimary} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create client'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClientRow({ client, onChanged }: { client: ClientRecord; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ name: string; permalinkUrl: string }> | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newSlug, setNewSlug] = useState(client.slug);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const runAction = useCallback(
    async (body: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/clients/${client.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Action failed.');
          return;
        }
        onChanged();
      } catch {
        setError('Action failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [client.slug, onChanged]
  );

  const runDelete = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${client.slug}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Delete failed.');
        return;
      }
      onChanged();
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client.slug, onChanged]);

  const loadLinks = useCallback(async () => {
    if (links) {
      setLinks(null);
      return;
    }
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.slug}/tasks`);
      const data = (await res.json()) as {
        links?: Array<{ name: string; permalinkUrl: string }>;
        error?: string;
      };
      setLinks(data.links ?? []);
    } catch {
      setLinks([]);
    } finally {
      setLinksLoading(false);
    }
  }, [client.slug, links]);

  return (
    <li className={`${adminCard} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">{client.displayName}</p>
          <p className={adminBody}>{client.contactEmail}</p>
          <p className="mt-1 font-mono text-xs text-text-muted">/clients/{client.slug}</p>
        </div>
        <span className={client.active ? adminBadgeActive : adminBadgeInactive}>
          {client.active ? 'Active' : 'Deactivated'}
        </span>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <AdminClientProjects slug={client.slug} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnGhost} onClick={loadLinks} disabled={linksLoading}>
            {linksLoading ? 'Loading…' : links ? 'Hide Asana tasks' : 'View in Asana'}
          </button>
          <button type="button" className={adminBtnGhost} onClick={() => setRenaming((v) => !v)}>
            Rename link
          </button>
          <button
            type="button"
            className={adminBtnGhost}
            onClick={() => {
              setConfirmingDelete((v) => !v);
              setDeleteConfirmText('');
            }}
          >
            Delete permanently
          </button>
        </div>
        {client.active ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-medium text-text-muted/60 underline-offset-2 transition hover:text-brand-pink hover:underline disabled:opacity-50"
            disabled={loading}
            onClick={() => runAction({ action: 'deactivate' })}
          >
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 text-[11px] font-medium text-text-muted/60 underline-offset-2 transition hover:text-brand-cyan hover:underline disabled:opacity-50"
            disabled={loading}
            onClick={() => runAction({ action: 'reactivate' })}
          >
            Reactivate
          </button>
        )}
      </div>

      {confirmingDelete ? (
        <div className="space-y-2 rounded-lg border border-brand-pink/30 bg-brand-pink/10 p-3">
          <p className="text-xs text-red-100">
            This permanently deletes <strong>{client.displayName}</strong>&apos;s portal link and
            history — unlike Deactivate, this can&apos;t be undone. Type the slug{' '}
            <code className="rounded bg-black/30 px-1">{client.slug}</code> to confirm.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${adminInput} max-w-xs`}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={client.slug}
            />
            <button
              type="button"
              className={adminBtnDanger}
              disabled={loading || deleteConfirmText !== client.slug}
              onClick={runDelete}
            >
              {loading ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      ) : null}

      {renaming ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${adminInput} max-w-xs`}
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
          />
          <button
            type="button"
            className={adminBtnSecondary}
            disabled={loading || newSlug === client.slug}
            onClick={() => runAction({ action: 'rename', newSlug })}
          >
            Save
          </button>
        </div>
      ) : null}

      {links ? (
        links.length === 0 ? (
          <p className={adminBody}>No tasks found in Asana for this client yet.</p>
        ) : (
          <ul className="space-y-1.5 border-t border-white/5 pt-3">
            {links.map((link) => (
              <li key={link.permalinkUrl}>
                <a
                  href={link.permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-cyan hover:underline"
                >
                  {link.name} ↗
                </a>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </li>
  );
}

export function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/clients');
      const data = (await res.json()) as { clients?: ClientRecord[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load clients.');
        return;
      }
      setClients(data.clients ?? []);
    } catch {
      setError('Could not load clients.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Clients</h1>
        <p className={`${adminBody} mt-1`}>
          Manage client portal links and their Asana &quot;Design Clients&quot; mapping.
        </p>
      </div>

      <AddClientForm
        onCreated={() => {
          setJustCreated(true);
          load();
        }}
      />

      {justCreated ? <p className={adminAlertSuccess}>Client created.</p> : null}
      {error ? <p className={adminAlertError}>{error}</p> : null}

      {clients === null ? (
        <p className={adminBody}>Loading clients…</p>
      ) : clients.length === 0 ? (
        <p className={adminBody}>No clients yet.</p>
      ) : (
        <ul className="space-y-4">
          {clients.map((client) => (
            <ClientRow key={client.slug} client={client} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
