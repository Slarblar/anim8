'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrewStatusEntry, CrewStatusSnapshot } from '@/lib/crew-status-cache';
import type { EmploymentType } from '@/lib/crew-directory';
import { adminAlertError, adminBody, adminBtnGhost, adminCard } from '@/components/admin/admin-ui';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { HoverTranslate } from './HoverTranslate';

const AVATAR_PLACEHOLDER = '/images/avatars/avatar-placeholder.png';

function CrewAvatar({ entry }: { entry: CrewStatusEntry }) {
  const src = entry.email ? `/api/crew/avatar?email=${encodeURIComponent(entry.email)}` : AVATAR_PLACEHOLDER;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- proxied/local avatar, not worth the next/image loader overhead for a 28px circle
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      className="h-7 w-7 flex-shrink-0 rounded-full border border-white/10 bg-white/5 object-cover"
      onError={(e) => {
        if (e.currentTarget.src.endsWith(AVATAR_PLACEHOLDER)) return;
        e.currentTarget.src = AVATAR_PLACEHOLDER;
      }}
    />
  );
}

function StatusPill({ status }: { status: CrewStatusEntry['status'] }) {
  if (status === 'PTO') {
    return (
      <span className="rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono">
        🌴 <HoverTranslate en={crewT.en.statusChart.statusOut} vn={crewT.vn.statusChart.statusOut} />
      </span>
    );
  }
  if (status === 'WFH') {
    return (
      <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono">
        🏠 <HoverTranslate en={crewT.en.statusChart.statusWfh} vn={crewT.vn.statusChart.statusWfh} />
      </span>
    );
  }
  return (
    <span className="rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono">
      <HoverTranslate en={crewT.en.statusChart.statusInStudio} vn={crewT.vn.statusChart.statusInStudio} />
    </span>
  );
}

function EmploymentLabel({ type }: { type: EmploymentType | undefined }) {
  if (!type) return null;
  const pair =
    type === 'part_time'
      ? { en: crewT.en.statusChart.employmentPartTime, vn: crewT.vn.statusChart.employmentPartTime }
      : type === 'contractor'
        ? { en: crewT.en.statusChart.employmentContractor, vn: crewT.vn.statusChart.employmentContractor }
        : { en: crewT.en.statusChart.employmentFullTime, vn: crewT.vn.statusChart.employmentFullTime };
  return (
    <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
      <HoverTranslate en={pair.en} vn={pair.vn} />
    </span>
  );
}

export function CrewStatusChart() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].statusChart;
  const [snapshot, setSnapshot] = useState<CrewStatusSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/crew/status');
      const data = (await res.json()) as { snapshot?: CrewStatusSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? c.loadError);
        return;
      }
      setSnapshot(data.snapshot ?? null);
    } catch {
      setError(c.loadError);
    }
  }, [c.loadError]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/refresh-status', { method: 'POST' });
      const data = (await res.json()) as { snapshot?: CrewStatusSnapshot; error?: string };
      if (!res.ok) {
        setError(data.error ?? c.refreshError);
        return;
      }
      setSnapshot(data.snapshot ?? null);
    } catch {
      setError(c.refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [c.refreshError]);

  useEffect(() => {
    load();
  }, [load]);

  const updatedTime = snapshot
    ? new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {snapshot ? (
          <p className={adminBody}>
            <HoverTranslate
              en={crewT.en.statusChart.updatedAt(updatedTime)}
              vn={crewT.vn.statusChart.updatedAt(updatedTime)}
            />
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={adminBtnGhost}
          onClick={refresh}
          disabled={refreshing}
          aria-label={lang === 'vn' ? crewT.vn.statusChart.refreshNow : crewT.en.statusChart.refreshNow}
          title={lang === 'vn' ? crewT.vn.statusChart.refreshNow : crewT.en.statusChart.refreshNow}
        >
          <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`} aria-hidden>
            🔄
          </span>
        </button>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {snapshot === null && !error ? (
        <p className={adminBody}>
          <HoverTranslate en={crewT.en.statusChart.loading} vn={crewT.vn.statusChart.loading} />
        </p>
      ) : snapshot && snapshot.entries.length === 0 ? (
        <p className={adminBody}>
          <HoverTranslate en={crewT.en.statusChart.noCrewMembers} vn={crewT.vn.statusChart.noCrewMembers} />
        </p>
      ) : snapshot ? (
        <ul className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3">
          {snapshot.entries.map((entry) => (
            <li key={entry.name} className={`${adminCard} flex items-center justify-between gap-3`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <CrewAvatar entry={entry} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {entry.location ? (
                      <span className="shrink-0 text-sm leading-none" title={entry.location === 'US' ? 'US' : 'VN'}>
                        {entry.location === 'US' ? '🇺🇸' : '🇻🇳'}
                      </span>
                    ) : null}
                    <span className="min-w-0 truncate font-bold text-white">{entry.name}</span>
                  </span>
                  <EmploymentLabel type={entry.employmentType} />
                </span>
              </span>
              <StatusPill status={entry.status} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
