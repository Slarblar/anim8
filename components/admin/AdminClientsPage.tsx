'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientRecord } from '@/lib/client-registry';
import {
  adminAlertError,
  adminAlertSuccess,
  adminBadgeActive,
  adminBadgeInactive,
  adminBody,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminLabel,
  adminSectionTitle,
} from './admin-ui';

type AsanaOption = { gid: string; name: string; enabled: boolean };

function AddClientForm({ onCreated }: { onCreated: () => void }) {
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

        setDisplayName('');
        setContactEmail('');
        setSlug('');
        setFieldOptionGid('');
        setNewOptionName('');
        onCreated();
      } catch {
        setError('Could not create client. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [displayName, contactEmail, slug, fieldOptionGid, newOptionName, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className={`${adminCard} space-y-4`}>
      <h2 className={adminSectionTitle}>Add client</h2>

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
            required
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
            required
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
          Asana "Design Clients" value
        </label>
        <select
          id="fieldOption"
          className={adminInput}
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
  );
}

function ClientRow({ client, onChanged }: { client: ClientRecord; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ name: string; permalinkUrl: string }> | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newSlug, setNewSlug] = useState(client.slug);

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

      <div className="flex flex-wrap gap-2">
        <button type="button" className={adminBtnGhost} onClick={loadLinks} disabled={linksLoading}>
          {linksLoading ? 'Loading…' : links ? 'Hide Asana tasks' : 'View in Asana'}
        </button>
        {client.active ? (
          <button
            type="button"
            className={adminBtnGhost}
            disabled={loading}
            onClick={() => runAction({ action: 'deactivate' })}
          >
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            className={adminBtnGhost}
            disabled={loading}
            onClick={() => runAction({ action: 'reactivate' })}
          >
            Reactivate
          </button>
        )}
        <button type="button" className={adminBtnGhost} onClick={() => setRenaming((v) => !v)}>
          Rename link
        </button>
      </div>

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
          Manage client portal links and their Asana "Design Clients" mapping.
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
