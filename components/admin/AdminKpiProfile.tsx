'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AdminKpiPerson } from '@/lib/kpi-shared';
import { performanceBandLabel } from '@/lib/kpi-shared';
import { CountUp } from '@/components/crew/CountUp';
import {
  KpiLineChart,
  MonthlyBarChart,
  RatingDonut,
  ScoreDelta,
  StatCard,
  crewBody,
  crewSectionTitle,
  getScoreBand,
} from '@/components/crew/kpi-ui';
import {
  adminAlertError,
  adminBadgeActive,
  adminBadgeInactive,
  adminBody,
  adminBtnGhost,
  adminCard,
  adminSectionTitle,
} from './admin-ui';

type ProfileResponse = { person?: AdminKpiPerson; error?: string };

function BandBadge({ score }: { score: number }) {
  if (score <= 0) return null;
  const band = getScoreBand(score);
  return (
    <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: band.color }}>
      {performanceBandLabel(band.key)}
    </span>
  );
}

export function AdminKpiProfile({ email }: { email: string }) {
  const [person, setPerson] = useState<AdminKpiPerson | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/kpi/${encodeURIComponent(email)}`);
      const data = (await res.json()) as ProfileResponse;
      if (!res.ok) {
        setError(data.error ?? 'Could not load KPI profile.');
        setPerson(null);
        return;
      }
      setPerson(data.person ?? null);
    } catch {
      setError('Could not load KPI profile.');
      setPerson(null);
    }
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = person?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/kpi" className="text-xs font-bold text-brand-cyan transition hover:brightness-125">
            ← KPI board
          </Link>
          {person ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className={adminSectionTitle}>{person.name}</h1>
                <span className={person.active ? adminBadgeActive : adminBadgeInactive}>
                  {person.active ? 'Active' : 'Deactivated'}
                </span>
              </div>
              <p className={`${adminBody} mt-1 font-mono`}>{person.email}</p>
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-text-muted">
                {[person.level, person.role].filter(Boolean).length > 0 ? (
                  <span>{[person.level, person.role].filter(Boolean).join(' · ')}</span>
                ) : null}
                <span className="font-mono">{person.weeklyContractedHours}h/wk</span>
                <span className="font-mono">FTE {(person.weeklyContractedHours / 40).toFixed(2)}</span>
              </p>
            </>
          ) : (
            <h1 className={`${adminSectionTitle} mt-3`}>KPI profile</h1>
          )}
        </div>
        <Link href="/admin/crew" className={adminBtnGhost}>
          Crew directory
        </Link>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {person === undefined && !error ? <p className={adminBody}>Loading KPI profile…</p> : null}

      {person && !summary && !error ? (
        <div className={adminCard}>
          <p className={crewSectionTitle}>No KPI data found yet</p>
          <p className={`${crewBody} mt-2`}>
            No scored tasks assigned to <span className="font-mono text-white">{person.email}</span> in the 🐸
            Anim8 KPI project yet.
          </p>
        </div>
      ) : null}

      {summary ? (
        <div className="space-y-5">
          {summary.fteRatio !== 1 ? (
            <p className={crewBody}>
              Scores are FTE-normalized for their {summary.weeklyContractedHours}h/week schedule (FTE{' '}
              {summary.fteRatio.toFixed(2)}) — Effort &amp; Delivery scaled to a 40h week.
            </p>
          ) : null}

          <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
            <StatCard label="YTD KPI score" value={<CountUp value={summary.ytdScore} decimals={2} />} />
            <StatCard label="YTD scored tasks" value={<CountUp value={summary.ytdTasks} decimals={0} />} />
            <StatCard
              label="This month"
              value={<CountUp value={summary.currentMonthScore} decimals={2} />}
              sub={
                <>
                  <BandBadge score={summary.currentMonthScore} />
                  {summary.currentMonthScore > 0 ? ' · ' : null}
                  <ScoreDelta current={summary.currentMonthScore} previous={summary.previousMonthScore} />
                </>
              }
            />
            <StatCard
              label="Last month"
              value={<CountUp value={summary.previousMonthScore} decimals={2} />}
              sub={<BandBadge score={summary.previousMonthScore} />}
            />
          </div>

          <div className={adminCard}>
            <p className={crewSectionTitle}>Past 3 months + current</p>
            <p className={`${crewBody} mt-1`}>Total KPI score by month.</p>
            <div className="mt-6">
              <MonthlyBarChart months={summary.lastThreeMonthly} />
            </div>
          </div>

          <div className={adminCard}>
            <p className={crewSectionTitle}>Performance over time</p>
            <p className={`${crewBody} mt-1`}>Total KPI score by month — year to date.</p>
            <div className="mt-6">
              <KpiLineChart months={summary.ytdMonthly} />
            </div>
          </div>

          <div>
            <p className={crewSectionTitle}>Quality &amp; collaboration ratings</p>
            <p className={`${crewBody} mt-1`}>How scored tasks were rated over the last 3 months.</p>
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
        </div>
      ) : null}
    </div>
  );
}
