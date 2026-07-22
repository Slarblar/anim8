'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi-shared';
import { performanceBandLabel } from '@/lib/kpi-shared';
import { adminAlertError, adminBtnGhost, adminCard } from '@/components/admin/admin-ui';
import {
  KpiLineChart,
  MonthlyBarChart,
  RatingDonut,
  ScoreDelta,
  StatCard,
  crewBody,
  crewSectionTitle,
  getScoreBand,
} from './kpi-ui';

type KpiResponse = { summary: PersonKPISummary | null; email?: string; error?: string };

function BandBadge({ score }: { score: number }) {
  if (score <= 0) return null;
  const band = getScoreBand(score);
  return (
    <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: band.color }}>
      {performanceBandLabel(band.key)}
    </span>
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
    <div className="space-y-5">
      <div className="crew-fade-in-up flex flex-wrap items-center justify-between gap-3">
        <p className={crewBody}>Synced from the 🐸 Anim8 KPI project in Asana · refreshes every 6 hours.</p>
        <button type="button" className={adminBtnGhost} onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {summary === undefined && !error ? <p className={crewBody}>Loading your KPI data…</p> : null}

      {summary === null && !error ? (
        <div className={`${adminCard} crew-fade-in-up`}>
          <p className={crewSectionTitle}>No KPI data found yet</p>
          <p className={`${crewBody} mt-2`}>
            We couldn&apos;t find any scored tasks assigned to{' '}
            {email ? <span className="font-mono text-white">{email}</span> : 'your account'} in the 🐸 Anim8 KPI
            project. Ask your producer to confirm tasks are assigned to that email in Asana, or check back once
            some tasks have a &quot;Total KPI Score&quot; set.
          </p>
        </div>
      ) : null}

      {summary ? (
        <>
          {summary.fteRatio !== 1 ? (
            <p className={`${crewBody} crew-fade-in-up`}>
              Scores are FTE-normalized for your {summary.weeklyContractedHours}h/week schedule (FTE{' '}
              {summary.fteRatio.toFixed(2)}) — Effort &amp; Delivery are scaled to a 40h week so bands match
              full-time peers. Quality, Collaboration, and R&amp;D are not scaled.
            </p>
          ) : null}

          <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
            <div className="crew-fade-in-up" style={{ animationDelay: '0.05s' }}>
              <StatCard label="YTD KPI score" value={summary.ytdScore.toFixed(2)} />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <StatCard label="YTD scored tasks" value={String(summary.ytdTasks)} />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <StatCard
                label="This month"
                value={summary.currentMonthScore.toFixed(2)}
                sub={
                  <>
                    <BandBadge score={summary.currentMonthScore} />
                    {summary.currentMonthScore > 0 ? ' · ' : null}
                    <ScoreDelta current={summary.currentMonthScore} previous={summary.previousMonthScore} />
                  </>
                }
              />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <StatCard
                label="Last month"
                value={summary.previousMonthScore.toFixed(2)}
                sub={<BandBadge score={summary.previousMonthScore} />}
              />
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className={adminCard}>
              <p className={crewSectionTitle}>Past 3 months performance</p>
              <p className={`${crewBody} mt-1`}>Total KPI score by month.</p>
              <div className="mt-6">
                <MonthlyBarChart months={summary.lastThreeMonthly} />
              </div>
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className={adminCard}>
              <p className={crewSectionTitle}>Performance over time</p>
              <p className={`${crewBody} mt-1`}>Total KPI score by month — year to date.</p>
              <div className="mt-6">
                <KpiLineChart months={summary.ytdMonthly} />
              </div>
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <p className={crewSectionTitle}>Quality &amp; collaboration ratings</p>
            <p className={`${crewBody} mt-1`}>How your scored tasks were rated over the last 3 months.</p>
            <div className="mt-4 grid gap-4 min-[720px]:grid-cols-2">
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
