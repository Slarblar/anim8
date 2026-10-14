'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ClientRecord } from '@/lib/client-registry';
import {
  adminAlertError,
  adminBody,
  adminBtnPrimary,
  adminCard,
  adminLabel,
  adminSelect,
  adminSelectChevronStyle,
} from './admin-ui';

export function AdminRequestPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/clients')
      .then(async (res) => {
        const data = (await res.json()) as { clients?: ClientRecord[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Could not load clients.');
        return (data.clients ?? []).filter((client) => client.active);
      })
      .then((active) => {
        if (cancelled) return;
        active.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setClients(active);
        setSlug(active[0]?.slug ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load clients.');
        setClients([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function start() {
    if (!slug) return;
    router.push(`/clients/${slug}/new?from=admin`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Admin request</h1>
        <p className={`${adminBody} mt-1`}>
          Same creative session a client uses. The brief is written the same way and filed in Asana for the client you pick.
        </p>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <form
        className={`${adminCard} space-y-4`}
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <div>
          <label className={adminLabel} htmlFor="admin-request-client">
            Client
          </label>
          <select
            id="admin-request-client"
            className={adminSelect}
            style={adminSelectChevronStyle}
            value={slug}
            disabled={!clients?.length}
            onChange={(event) => setSlug(event.target.value)}
          >
            {clients === null ? <option value="">Loading clients…</option> : null}
            {clients?.length === 0 ? <option value="">No active clients</option> : null}
            {clients?.map((client) => (
              <option key={client.slug} value={client.slug}>
                {client.displayName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={adminBtnPrimary} disabled={!slug}>
          Start request
        </button>
      </form>
    </div>
  );
}
