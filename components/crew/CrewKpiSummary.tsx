'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi';
import { adminAlertError, adminBody, adminBtnGhost, adminCard, adminSectionTitle } from '@/components/admin/admin-ui';

type KpiResponse = { summary: PersonKPISummary | null; email?: string; error?: string };

/** Months of trend history shown in the bar chart — enough to see a trend without crowding the chart. */
const MONTHS_SHOWN = 6;

function ScoreDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) {
    return <span className="text-[11px] font-bold text-text-muted">— flat vs last month</span>;
  }
  const up = diff > 0;
  return (
    <span className={`text-[11px] font-bold ${up ? 'text-brand-lime' : 'text-brand-pink'}`}>
      {up ? '▲' : '▼'} {Math.abs(diff).toFixed(2)} vs last month
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className={adminCard}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{label}</p>
      <p className="mt-1.5 text-2xl font-black text-white md:text-3xl">{value}</p>
      {sub ? <p className="mt-1">{sub}</p> : null}
    </div>
  );
}

function MonthlyTrendChart({ summary }: { summary: PersonKPISummary }) {
  const months = useMemo(() => summary.monthly.slice(-MONTHS_SHOWN), [summary.monthly]);
  const maxScore = Math.max(1, ...months.map((m) => m.score));

  if (months.length === 0) {
    return <p className={adminBody}>No scored tasks logged yet.</p>;
  }

  return (
    <div className="flex items-end gap-2 min-[480px]:gap-4">
      {months.map((month) => {
        const heightPct = Math.max(4, Math.round((month.score / maxScore) * 100));
        const isCurrent = month.month === months[months.length - 1]?.month;
        return (
          <div key={month.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-xs font-bold text-white font-mono">{month.score}</span>
            <div className="flex h-32 w-full items-end rounded-md border border-white/5 bg-white/[0.03]">
              <div
                className={`w-full rounded-[4px] transition-[height] duration-500 ease-out ${
                  isCurrent
                    ? 'bg-gradient-to-t from-brand-cyan to-brand-lime'
                    : 'bg-gradient-to-t from-brand-cyan/40 to-brand-lime/40'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
              {month.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CrewKpiSummary() {
  const [summary, setSummary] = useState<PersonKPISummary | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/crew/kpi');
      const data = (await res.json()) as KpiResponse;
      if (!res.ok) {
        setError(data.error ?? 'Could not load your KPI data.');
        return;
      }
      setSummary(data.summary);
      setEmail(data.email ?? null);
    } catch {
      setError('Could not load your KPI data.');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/kpi/refresh', { method: 'POST' });
      const data = (await res.json()) as KpiResponse;
      if (!res.ok) {
        setError(data.error ?? 'Refresh failed.');
        return;
      }
      setSummary(data.summary);
      setEmail(data.email ?? null);
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
        <p className={adminBody}>Synced from the 🐸 Anim8 KPI project in Asana · refreshes every 6 hours.</p>
        <button type="button" className={adminBtnGhost} onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {summary === undefined && !error ? <p className={adminBody}>Loading your KPI data…</p> : null}

      {summary === null && !error ? (
        <div className={adminCard}>
          <p className={adminSectionTitle}>No KPI data found yet</p>
          <p className={`${adminBody} mt-2`}>
            We couldn&apos;t find any scored tasks assigned to{' '}
            {email ? <span className="font-mono text-white">{email}</span> : 'your account'} in the 🐸 Anim8 KPI
            project. Ask your producer to confirm tasks are assigned to that email in Asana, or check back once
            some tasks have a &quot;Total KPI Score&quot; set.
          </p>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
            <StatCard label="YTD KPI score" value={summary.ytdScore.toFixed(2)} />
            <StatCard label="YTD scored tasks" value={String(summary.ytdTasks)} />
            <StatCard
              label="This month"
              value={summary.currentMonthScore.toFixed(2)}
              sub={<ScoreDelta current={summary.currentMonthScore} previous={summary.previousMonthScore} />}
            />
            <StatCard label="Last month" value={summary.previousMonthScore.toFixed(2)} />
          </div>

          <div className={adminCard}>
            <p className={adminSectionTitle}>Monthly trend</p>
            <p className={`${adminBody} mt-1`}>Total KPI score per month, last {MONTHS_SHOWN} months.</p>
            <div className="mt-5">
              <MonthlyTrendChart summary={summary} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
