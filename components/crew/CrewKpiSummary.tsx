'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi';
import { adminAlertError, adminBody, adminBtnGhost, adminCard, adminSectionTitle } from '@/components/admin/admin-ui';
import { KpiLineChart, MonthlyBarChart, RatingDonut, ScoreDelta, StatCard } from './kpi-ui';

type KpiResponse = { summary: PersonKPISummary | null; email?: string; error?: string };

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
            <p className={adminSectionTitle}>Past 3 months performance</p>
            <p className={`${adminBody} mt-1`}>Total KPI score by month.</p>
            <div className="mt-5">
              <MonthlyBarChart months={summary.lastThreeMonthly} />
            </div>
          </div>

          <div className={adminCard}>
            <p className={adminSectionTitle}>Performance over time</p>
            <p className={`${adminBody} mt-1`}>Total KPI score by month — year to date.</p>
            <div className="mt-5">
              <KpiLineChart months={summary.ytdMonthly} />
            </div>
          </div>

          <div>
            <p className={adminSectionTitle}>Quality &amp; collaboration ratings</p>
            <p className={`${adminBody} mt-1`}>How your scored tasks were rated over the last 3 months.</p>
            <div className="mt-3 grid gap-4 min-[720px]:grid-cols-2">
              <RatingDonut
                title="Quality rating"
                subtitle="Last 3 months"
                breakdown={summary.qualityRatingsLast3Months}
              />
              <RatingDonut
                title="Collaboration rating"
                subtitle="Last 3 months"
                breakdown={summary.collaborationRatingsLast3Months}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
