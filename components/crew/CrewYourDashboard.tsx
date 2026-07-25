'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PersonKPISummary } from '@/lib/kpi-shared';
import { adminAlertError, adminBtnPrimary, adminCard } from '@/components/admin/admin-ui';
import { localizeAsanaRating } from '@/lib/crew-asana-i18n';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { CountUp } from './CountUp';
import { HoverTranslate } from './HoverTranslate';
import {
  AsanaRatingLabel,
  MonthlyBarChart,
  PerformanceBandLabel,
  ScoreDelta,
  StatCard,
  crewBody,
  crewSectionTitle,
  getScoreBand,
  topRating,
} from './kpi-ui';

type PtoBalance = { balanceDays: number | null; entitlementDays: number | null };
type KpiResponse = { summary: PersonKPISummary | null; error?: string };
type MeResponse = { name: string; email: string };

/** Compact rating badge for the condensed dashboard — top bucket over the last 3 months, plus the full split. */
function RatingSummaryCard({
  label,
  noRatingsLabelEn,
  noRatingsLabelVn,
  breakdown,
}: {
  label: ReactNode;
  noRatingsLabelEn: string;
  noRatingsLabelVn: string;
  breakdown: PersonKPISummary['qualityRatingsLast3Months'];
}) {
  const { lang } = useCrewLanguage();
  const top = topRating(breakdown);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <StatCard
      label={label}
      value={top ? <AsanaRatingLabel rating={top.rating} /> : '—'}
      sub={
        total > 0 ? (
          <span className="text-xs font-bold text-text-muted">
            {breakdown
              .filter((b) => b.count > 0)
              .map((b) => {
                const { primary } = localizeAsanaRating(b.rating, lang);
                return `${b.count} ${primary}`;
              })
              .join(' · ')}
          </span>
        ) : (
          <span className="text-xs font-bold text-text-muted">
            <HoverTranslate en={noRatingsLabelEn} vn={noRatingsLabelVn} />
          </span>
        )
      }
    />
  );
}

export function CrewYourDashboard() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].dashboard;
  const [firstName, setFirstName] = useState<string | null>(null);
  const [balance, setBalance] = useState<PtoBalance | null>(null);
  const [kpi, setKpi] = useState<PersonKPISummary | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [meRes, balanceRes, kpiRes] = await Promise.all([
        fetch('/api/crew/me'),
        fetch('/api/crew/pto-balance'),
        fetch('/api/crew/kpi'),
      ]);
      const meData = (await meRes.json()) as MeResponse & { error?: string };
      if (meRes.ok && !meData.error) setFirstName(meData.name.split(' ')[0]);

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
    <div className="space-y-5">
      <div className="crew-fade-in-up flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          {firstName ? (
            <HoverTranslate
              en={crewT.en.dashboard.welcomeBack(firstName)}
              vn={crewT.vn.dashboard.welcomeBack(firstName)}
            />
          ) : (
            <HoverTranslate en={crewT.en.dashboard.title} vn={crewT.vn.dashboard.title} />
          )}
        </h2>
        <div className="flex items-center gap-4">
          <Link
            href="/crew/report"
            target="_blank"
            className="text-sm font-bold text-text-muted transition hover:text-white"
          >
            <HoverTranslate en={crewT.en.dashboard.generateReport} vn={crewT.vn.dashboard.generateReport} />
          </Link>
          <Link href="/crew/kpi" className="text-sm font-bold text-brand-cyan transition hover:brightness-125">
            <HoverTranslate en={crewT.en.dashboard.fullKpiHistory} vn={crewT.vn.dashboard.fullKpiHistory} />
          </Link>
        </div>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
        <div
          className="crew-fade-in-up flex flex-col justify-between gap-3 glass-card p-5 min-[480px]:p-6"
          style={{ animationDelay: '0.05s' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">
              <HoverTranslate en={crewT.en.dashboard.ptoAvailable} vn={crewT.vn.dashboard.ptoAvailable} />
            </p>
            <p className="mt-2 text-3xl font-black text-brand-cyan md:text-4xl">
              {balance?.balanceDays !== null && balance?.balanceDays !== undefined ? (
                <>
                  <CountUp value={balance.balanceDays} decimals={Number.isInteger(balance.balanceDays) ? 0 : 1} />
                  <span className="ml-1 text-base font-bold text-text-muted">
                    <HoverTranslate
                      en={crewT.en.dashboard.dayUnit(balance.balanceDays)}
                      vn={crewT.vn.dashboard.dayUnit(balance.balanceDays)}
                    />
                  </span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
          {/* Glow removed here specifically — keeps this card calm next to the KPI stat cards. */}
          <Link href="/crew/pto/new" className={`${adminBtnPrimary} !shadow-none text-center`}>
            <HoverTranslate en={crewT.en.dashboard.requestPto} vn={crewT.vn.dashboard.requestPto} />
          </Link>
        </div>

        {kpi ? (
          <>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <StatCard
                label={<HoverTranslate en={crewT.en.dashboard.thisMonthKpi} vn={crewT.vn.dashboard.thisMonthKpi} />}
                value={<CountUp value={kpi.currentMonthScore} decimals={2} />}
                sub={
                  <>
                    {kpi.currentMonthScore > 0 ? (
                      <span
                        className="text-xs font-bold uppercase tracking-wider font-mono"
                        style={{ color: getScoreBand(kpi.currentMonthScore).color }}
                      >
                        <PerformanceBandLabel bandKey={kpi.currentMonthBand} />
                      </span>
                    ) : null}
                    {kpi.currentMonthScore > 0 ? ' · ' : null}
                    <ScoreDelta current={kpi.currentMonthScore} previous={kpi.previousMonthScore} />
                  </>
                }
              />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <RatingSummaryCard
                label={<HoverTranslate en={crewT.en.dashboard.quality3mo} vn={crewT.vn.dashboard.quality3mo} />}
                noRatingsLabelEn={crewT.en.dashboard.noRatings3mo}
                noRatingsLabelVn={crewT.vn.dashboard.noRatings3mo}
                breakdown={kpi.qualityRatingsLast3Months}
              />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <RatingSummaryCard
                label={
                  <HoverTranslate
                    en={crewT.en.dashboard.collaboration3mo}
                    vn={crewT.vn.dashboard.collaboration3mo}
                  />
                }
                noRatingsLabelEn={crewT.en.dashboard.noRatings3mo}
                noRatingsLabelVn={crewT.vn.dashboard.noRatings3mo}
                breakdown={kpi.collaborationRatingsLast3Months}
              />
            </div>
          </>
        ) : kpi === null ? (
          <div
            className="crew-fade-in-up min-[480px]:col-span-1 min-[900px]:col-span-3 flex items-center glass-card p-5 min-[480px]:p-6"
            style={{ animationDelay: '0.1s' }}
          >
            <p className={crewBody}>
              <HoverTranslate en={crewT.en.dashboard.noKpiDataYet} vn={crewT.vn.dashboard.noKpiDataYet} />
            </p>
          </div>
        ) : null}
      </div>

      {kpi && kpi.lastThreeMonthly.some((m) => m.score > 0) ? (
        <div className="crew-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <div className={adminCard}>
            <p className={crewSectionTitle}>
              <HoverTranslate
                en={crewT.en.dashboard.past3MonthsPerformance}
                vn={crewT.vn.dashboard.past3MonthsPerformance}
              />
            </p>
            <p className={`${crewBody} mt-1`}>
              <HoverTranslate en={crewT.en.dashboard.totalKpiByMonth} vn={crewT.vn.dashboard.totalKpiByMonth} />
            </p>
            <div className="mt-6">
              <MonthlyBarChart months={kpi.lastThreeMonthly} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
