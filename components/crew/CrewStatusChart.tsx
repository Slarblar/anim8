'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrewStatusEntry, CrewStatusSnapshot } from '@/lib/crew-status-cache';
import { adminAlertError, adminBody, adminBtnGhost, adminCard } from '@/components/admin/admin-ui';

function StatusPill({ status }: { status: CrewStatusEntry['status'] }) {
  if (status === 'PTO') {
    return (
      <span className="rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono">
        🌴 Out
      </span>
    );
  }
  if (status === 'WFH') {
    return (
      <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono">
        🏠 WFH
      </span>
    );
  }
  return (
    <span className="rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono">
      In studio
    </span>
  );
}

export function CrewStatusChart() {
  const [snapshot, setSnapshot] = useState<CrewStatusSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/crew/status');
      const data = (await res.json()) as { snapshot?: CrewStatusSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load today\u2019s status.');
        return;
      }
      setSnapshot(data.snapshot ?? null);
    } catch {
      setError('Could not load today\u2019s status.');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/refresh-status', { method: 'POST' });
      const data = (await res.json()) as { snapshot?: CrewStatusSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Refresh failed.');
        return;
      }
      setSnapshot(data.snapshot ?? null);
    } catch {
      setError('Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {snapshot ? (
          <p className={adminBody}>
            Updated {new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
        ) : (
          <span />
        )}
        <button type="button" className={adminBtnGhost} onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {snapshot === null && !error ? (
        <p className={adminBody}>Loading today&apos;s status…</p>
      ) : snapshot && snapshot.entries.length === 0 ? (
        <p className={adminBody}>No crew members set up yet — add them in /admin/crew.</p>
      ) : snapshot ? (
        <ul className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3">
          {snapshot.entries.map((entry) => (
            <li key={entry.name} className={`${adminCard} flex items-center justify-between gap-3`}>
              <span className="min-w-0 truncate font-bold text-white">{entry.name}</span>
              <StatusPill status={entry.status} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
