'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi';
import { adminAlertError, adminBody, adminBtnPrimary, adminCard, adminSectionTitle } from '@/components/admin/admin-ui';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { MonthlyBarChart, ScoreDelta, StatCard, stripRatingNumber, topRating } from './kpi-ui';

type PtoBalance = { balanceDays: number | null; entitlementDays: number | null };
type KpiResponse = { summary: PersonKPISummary | null; error?: string };

/** Compact rating badge for the condensed dashboard — top bucket over the last 3 months, plus the full split. */
function RatingSummaryCard({
  label,
  noRatingsLabel,
  breakdown,
}: {
  label: string;
  noRatingsLabel: string;
  breakdown: PersonKPISummary['qualityRatingsLast3Months'];
}) {
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
          <span className="text-[11px] font-bold text-text-muted">{noRatingsLabel}</span>
        )
      }
    />
  );
}

export function CrewYourDashboard() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].dashboard;
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
      setError(c.couldNotLoad);
    }
  }, [c.couldNotLoad]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={adminSectionTitle}>{c.title}</h2>
        <Link href="/crew/kpi" className="text-xs font-bold text-brand-cyan transition hover:brightness-125">
          {c.fullKpiHistory}
        </Link>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
        <div className={`${adminCard} flex flex-col justify-between gap-3`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
              {c.ptoAvailable}
            </p>
            <p className="mt-1.5 text-2xl font-black text-brand-cyan md:text-3xl">
              {balance?.balanceDays ?? '—'}
              {balance?.balanceDays !== null && balance?.balanceDays !== undefined ? (
                <span className="ml-1 text-sm font-bold text-text-muted">{c.dayUnit(balance.balanceDays)}</span>
              ) : null}
            </p>
          </div>
          {/* Glow removed here specifically — keeps this card calm next to the KPI stat cards. */}
          <Link href="/crew/pto/new" className={`${adminBtnPrimary} !shadow-none text-center`}>
            {c.requestPto}
          </Link>
        </div>

        {kpi ? (
          <>
            <StatCard
              label={c.thisMonthKpi}
              value={kpi.currentMonthScore.toFixed(2)}
              sub={<ScoreDelta current={kpi.currentMonthScore} previous={kpi.previousMonthScore} />}
            />
            <RatingSummaryCard
              label={c.quality3mo}
              noRatingsLabel={c.noRatings3mo}
              breakdown={kpi.qualityRatingsLast3Months}
            />
            <RatingSummaryCard
              label={c.collaboration3mo}
              noRatingsLabel={c.noRatings3mo}
              breakdown={kpi.collaborationRatingsLast3Months}
            />
          </>
        ) : kpi === null ? (
          <div className={`${adminCard} min-[480px]:col-span-1 min-[900px]:col-span-3 flex items-center`}>
            <p className={adminBody}>{c.noKpiDataYet}</p>
          </div>
        ) : null}
      </div>

      {kpi && kpi.lastThreeMonthly.some((m) => m.score > 0) ? (
        <div className={adminCard}>
          <p className={adminSectionTitle}>{c.past3MonthsPerformance}</p>
          <p className={`${adminBody} mt-1`}>{c.totalKpiByMonth}</p>
          <div className="mt-5">
            <MonthlyBarChart months={kpi.lastThreeMonthly} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
