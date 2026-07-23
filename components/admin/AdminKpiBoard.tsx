'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminKpiPerson } from '@/lib/kpi-shared';
import { performanceBandLabel, type PerformanceBand } from '@/lib/kpi-shared';
import { CountUp } from '@/components/crew/CountUp';
import {
  MonthlyBarChart,
  SCORE_BANDS,
  ScoreDelta,
  getScoreBand,
} from '@/components/crew/kpi-ui';
import {
  adminAlertError,
  adminBadgeInactive,
  adminBody,
  adminBtnGhost,
  adminCard,
  adminCheckbox,
  adminInput,
  adminSectionTitle,
} from './admin-ui';

type BoardResponse = { people?: AdminKpiPerson[]; error?: string };

const EMPLOYMENT_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
} as const;

function BandBadge({ score, band }: { score: number; band?: PerformanceBand }) {
  if (score <= 0 || !band) {
    return <span className={adminBadgeInactive}>No score</span>;
  }
  const styleBand = getScoreBand(score);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{
        color: styleBand.color,
        borderColor: `${styleBand.color}55`,
        backgroundColor: `${styleBand.color}18`,
      }}
    >
      {performanceBandLabel(band)}
    </span>
  );
}

function KpiPersonRow({ person }: { person: AdminKpiPerson }) {
  const [expanded, setExpanded] = useState(false);
  const summary = person.summary;
  const monthScore = summary?.currentMonthScore ?? 0;

  return (
    <li className={`${adminCard} admin-collapse-card ${expanded ? 'admin-collapse-card--expanded' : ''}`}>
      <button
        type="button"
        className="admin-collapse-toggle flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-bold text-white">{person.name}</p>
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5">
              {!person.active ? <span className={adminBadgeInactive}>Deactivated</span> : null}
              {summary ? (
                <BandBadge score={monthScore} band={summary.currentMonthBand} />
              ) : (
                <span className={adminBadgeInactive}>No KPI</span>
              )}
            </div>
          </div>
          <p className={`${adminBody} truncate`}>{person.email}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            {[person.level, person.role].filter(Boolean).length > 0 ? (
              <span className="text-text-muted">{[person.level, person.role].filter(Boolean).join(' · ')}</span>
            ) : null}
            <span className="text-text-muted">{EMPLOYMENT_LABELS[person.employmentType]}</span>
            <span className="font-mono text-text-muted">{person.weeklyContractedHours}h/wk</span>
            {summary ? (
              <>
                <span className="font-mono text-brand-cyan">
                  <CountUp value={monthScore} decimals={1} /> this mo
                </span>
                <span className="font-mono text-text-muted">
                  YTD <CountUp value={summary.ytdScore} decimals={1} />
                </span>
                <span className="font-mono text-text-muted">
                  <CountUp value={summary.ytdTasks} decimals={0} /> tasks
                </span>
                {monthScore > 0 ? (
                  <ScoreDelta current={monthScore} previous={summary.previousMonthScore} />
                ) : null}
              </>
            ) : (
              <span className="text-brand-pink">No scored tasks in Asana yet</span>
            )}
          </p>
        </div>
        <span
          className={`admin-collapse-chevron mt-0.5 shrink-0 text-brand-cyan ${expanded ? 'admin-collapse-chevron--open' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        className={`admin-collapse-expand ${expanded ? 'admin-collapse-expand--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="admin-collapse-expand-inner space-y-3 pt-3">
          {summary ? (
            <>
              <div className="grid gap-3 min-[480px]:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
                    This month
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    <CountUp value={monthScore} decimals={2} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
                    Last month
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    <CountUp value={summary.previousMonthScore} decimals={2} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
                    YTD score
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    <CountUp value={summary.ytdScore} decimals={2} />
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
                  Past 3 months
                </p>
                <div className="mt-3">
                  <MonthlyBarChart months={summary.lastThreeMonthly} />
                </div>
              </div>
            </>
          ) : (
            <p className={adminBody}>
              No KPI data yet for this person — confirm scored tasks are assigned to{' '}
              <span className="font-mono text-white">{person.email}</span> in the 🐸 Anim8 KPI project.
            </p>
          )}
          <Link
            href={`/admin/kpi/${encodeURIComponent(person.email)}`}
            className={`${adminBtnGhost} inline-flex`}
            onClick={(e) => e.stopPropagation()}
          >
            View full KPI profile
          </Link>
        </div>
      </div>
    </li>
  );
}

export function AdminKpiBoard() {
  const [people, setPeople] = useState<AdminKpiPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/kpi');
      const data = (await res.json()) as BoardResponse;
      if (!res.ok) {
        setError(data.error ?? 'Could not load KPI board.');
        return;
      }
      setPeople(data.people ?? []);
    } catch {
      setError('Could not load KPI board.');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/kpi/refresh', { method: 'POST' });
      const data = (await res.json()) as BoardResponse;
      if (!res.ok) {
        setError(data.error ?? 'Refresh failed.');
        return;
      }
      setPeople(data.people ?? []);
    } catch {
      setError('Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (!showInactive && !p.active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.level.toLowerCase().includes(q)
      );
    });
  }, [people, query, showInactive]);

  const scored = filtered.filter((p) => p.summary && p.summary.currentMonthScore > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={adminSectionTitle}>KPI board</h1>
          <p className={`${adminBody} mt-1`}>
            Crew progress from the 🐸 Anim8 KPI project — sorted by this month&apos;s score.
          </p>
        </div>
        <button type="button" className={`${adminBtnGhost} gap-1.5`} onClick={refresh} disabled={refreshing}>
          <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`} aria-hidden>
            🔄
          </span>
          Refresh now
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className={`${adminInput} max-w-sm`}
          placeholder="Search name, email, level, role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className={adminCheckbox}
          />
          Show deactivated
        </label>
        {people ? (
          <p className={`${adminBody} ml-auto`}>
            {scored}/{filtered.length} with a score this month
          </p>
        ) : null}
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {people === null && !error ? <p className={adminBody}>Loading KPI board…</p> : null}

      {people && filtered.length === 0 ? (
        <p className={adminBody}>No crew members match this filter.</p>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <ul className="space-y-3">
            {filtered.map((person) => (
              <KpiPersonRow key={person.email} person={person} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
            {SCORE_BANDS.map((band) => (
              <span
                key={band.key}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: band.color }}
                />
                {band.label}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
