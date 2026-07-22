'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi';
import { adminAlertError, adminBody, adminBtnPrimary, adminCard, adminSectionTitle } from '@/components/admin/admin-ui';
import { MonthlyBarChart, ScoreDelta, StatCard, stripRatingNumber, topRating } from './kpi-ui';

type PtoBalance = { balanceDays: number | null; entitlementDays: number | null };
type KpiResponse = { summary: PersonKPISummary | null; error?: string };

/** Compact rating badge for the condensed dashboard — top bucket over the last 3 months, plus the full split. */
function RatingSummaryCard({ label, breakdown }: { label: string; breakdown: PersonKPISummary['qualityRatingsLast3Months'] }) {
  const top = topRating(breakdown);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <StatCard
      label={label}
      value={top ? stripRatingNumber(top.rating) : '—'}
      sub={
        total > 0 ? (
          <span className="text-[11px] font-bold text-text-muted">
            {breakdown
              .filter((b) => b.count > 0)
              .map((b) => `${b.count} ${stripRatingNumber(b.rating).toLowerCase()}`)
              .join(' · ')}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-text-muted">No ratings last 3 months</span>
        )
      }
    />
  );
}

export function CrewYourDashboard() {
  const [balance, setBalance] = useState<PtoBalance | null>(null);
  const [kpi, setKpi] = useState<PersonKPISummary | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [balanceRes, kpiRes] = await Promise.all([
        fetch('/api/crew/pto-balance'),
        fetch('/api/crew/kpi'),
      ]);
      const balanceData = (await balanceRes.json()) as PtoBalance & { error?: string };
      if (balanceRes.ok && !balanceData.error) setBalance(balanceData);

      const kpiData = (await kpiRes.json()) as KpiResponse;
      if (kpiRes.ok) setKpi(kpiData.summary);
    } catch {
      setError('Could not load your dashboard.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={adminSectionTitle}>Your dashboard</h2>
        <Link href="/crew/kpi" className="text-xs font-bold text-brand-cyan transition hover:brightness-125">
          Full KPI history →
        </Link>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
        <div className={`${adminCard} flex flex-col justify-between gap-3`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
              PTO available
            </p>
            <p className="mt-1.5 text-2xl font-black text-brand-cyan md:text-3xl">
              {balance?.balanceDays ?? '—'}
              {balance?.balanceDays !== null && balance?.balanceDays !== undefined ? (
                <span className="ml-1 text-sm font-bold text-text-muted">
                  day{balance.balanceDays === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
          </div>
          <Link href="/crew/pto/new" className={`${adminBtnPrimary} text-center`}>
            Request PTO / WFH
          </Link>
        </div>

        {kpi ? (
          <>
            <StatCard
              label="This month KPI"
              value={kpi.currentMonthScore.toFixed(2)}
              sub={<ScoreDelta current={kpi.currentMonthScore} previous={kpi.previousMonthScore} />}
            />
            <RatingSummaryCard label="Quality (3mo)" breakdown={kpi.qualityRatingsLast3Months} />
            <RatingSummaryCard label="Collaboration (3mo)" breakdown={kpi.collaborationRatingsLast3Months} />
          </>
        ) : kpi === null ? (
          <div className={`${adminCard} min-[480px]:col-span-1 min-[900px]:col-span-3 flex items-center`}>
            <p className={adminBody}>
              No KPI data yet — check back once scored tasks are assigned to you in Asana.
            </p>
          </div>
        ) : null}
      </div>

      {kpi && kpi.lastThreeMonthly.some((m) => m.score > 0) ? (
        <div className={adminCard}>
          <p className={adminSectionTitle}>Past 3 months performance</p>
          <p className={`${adminBody} mt-1`}>Total KPI score by month.</p>
          <div className="mt-5">
            <MonthlyBarChart months={kpi.lastThreeMonthly} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
