'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PersonKPISummary } from '@/lib/kpi-shared';
import { adminAlertError, adminBtnGhost, adminCard } from '@/components/admin/admin-ui';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { CountUp } from './CountUp';
import { HoverTranslate } from './HoverTranslate';
import {
  KpiLineChart,
  MonthlyBarChart,
  PerformanceBandLabel,
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
      <PerformanceBandLabel bandKey={band.key} />
    </span>
  );
}

export function CrewKpiSummary() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].kpiPage;
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
        setError(data.error ?? c.loadError);
        return;
      }
      setSummary(data.summary);
      setEmail(data.email ?? null);
    } catch {
      setError(c.loadError);
    }
  }, [c.loadError]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/crew/kpi/refresh', { method: 'POST' });
      const data = (await res.json()) as KpiResponse;
      if (!res.ok) {
        setError(data.error ?? c.refreshError);
        return;
      }
      setSummary(data.summary);
      setEmail(data.email ?? null);
    } catch {
      setError(c.refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [c.refreshError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="crew-fade-in-up flex flex-wrap items-center justify-between gap-3">
        <p className={crewBody}>
          <HoverTranslate en={crewT.en.kpiPage.syncedFromAsana} vn={crewT.vn.kpiPage.syncedFromAsana} />
        </p>
        <button type="button" className={`${adminBtnGhost} gap-1.5`} onClick={refresh} disabled={refreshing}>
          <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`} aria-hidden>
            🔄
          </span>
          <HoverTranslate en={crewT.en.kpiPage.refreshNow} vn={crewT.vn.kpiPage.refreshNow} />
        </button>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {summary === undefined && !error ? (
        <p className={crewBody}>
          <HoverTranslate en={crewT.en.kpiPage.loading} vn={crewT.vn.kpiPage.loading} />
        </p>
      ) : null}

      {summary === null && !error ? (
        <div className={`${adminCard} crew-fade-in-up`}>
          <p className={crewSectionTitle}>
            <HoverTranslate en={crewT.en.kpiPage.noDataTitle} vn={crewT.vn.kpiPage.noDataTitle} />
          </p>
          <p className={`${crewBody} mt-2`}>
            <HoverTranslate
              en={crewT.en.kpiPage.noDataBody(email)}
              vn={crewT.vn.kpiPage.noDataBody(email)}
            />
          </p>
        </div>
      ) : null}

      {summary ? (
        <>
          {summary.fteRatio !== 1 ? (
            <p className={`${crewBody} crew-fade-in-up`}>
              <HoverTranslate
                en={crewT.en.kpiPage.fteNote(summary.weeklyContractedHours, summary.fteRatio.toFixed(2))}
                vn={crewT.vn.kpiPage.fteNote(summary.weeklyContractedHours, summary.fteRatio.toFixed(2))}
              />
            </p>
          ) : null}

          <div className="grid gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4">
            <div className="crew-fade-in-up" style={{ animationDelay: '0.05s' }}>
              <StatCard
                label={<HoverTranslate en={crewT.en.kpiPage.ytdScore} vn={crewT.vn.kpiPage.ytdScore} />}
                value={<CountUp value={summary.ytdScore} decimals={2} />}
              />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <StatCard
                label={<HoverTranslate en={crewT.en.kpiPage.ytdTasks} vn={crewT.vn.kpiPage.ytdTasks} />}
                value={<CountUp value={summary.ytdTasks} decimals={0} />}
              />
            </div>
            <div className="crew-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <StatCard
                label={<HoverTranslate en={crewT.en.kpiPage.thisMonth} vn={crewT.vn.kpiPage.thisMonth} />}
                value={<CountUp value={summary.currentMonthScore} decimals={2} />}
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
                label={<HoverTranslate en={crewT.en.kpiPage.lastMonth} vn={crewT.vn.kpiPage.lastMonth} />}
                value={<CountUp value={summary.previousMonthScore} decimals={2} />}
                sub={<BandBadge score={summary.previousMonthScore} />}
              />
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className={adminCard}>
              <p className={crewSectionTitle}>
                <HoverTranslate en={crewT.en.kpiPage.past3Months} vn={crewT.vn.kpiPage.past3Months} />
              </p>
              <p className={`${crewBody} mt-1`}>
                <HoverTranslate en={crewT.en.kpiPage.past3MonthsSub} vn={crewT.vn.kpiPage.past3MonthsSub} />
              </p>
              <div className="mt-6">
                <MonthlyBarChart months={summary.lastThreeMonthly} />
              </div>
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className={adminCard}>
              <p className={crewSectionTitle}>
                <HoverTranslate
                  en={crewT.en.kpiPage.performanceOverTime}
                  vn={crewT.vn.kpiPage.performanceOverTime}
                />
              </p>
              <p className={`${crewBody} mt-1`}>
                <HoverTranslate
                  en={crewT.en.kpiPage.performanceOverTimeSub}
                  vn={crewT.vn.kpiPage.performanceOverTimeSub}
                />
              </p>
              <div className="mt-6">
                <KpiLineChart months={summary.ytdMonthly} />
              </div>
            </div>
          </div>

          <div className="crew-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <p className={crewSectionTitle}>
              <HoverTranslate
                en={crewT.en.kpiPage.qualityCollabTitle}
                vn={crewT.vn.kpiPage.qualityCollabTitle}
              />
            </p>
            <p className={`${crewBody} mt-1`}>
              <HoverTranslate en={crewT.en.kpiPage.qualityCollabSub} vn={crewT.vn.kpiPage.qualityCollabSub} />
            </p>
            <div className="mt-4 grid gap-4 min-[720px]:grid-cols-2">
              <RatingDonut
                title={<HoverTranslate en={crewT.en.kpiPage.qualityRating} vn={crewT.vn.kpiPage.qualityRating} />}
                subtitle={<HoverTranslate en={crewT.en.kpiPage.last3Months} vn={crewT.vn.kpiPage.last3Months} />}
                breakdown={summary.qualityRatingsLast3Months}
              />
              <RatingDonut
                title={
                  <HoverTranslate
                    en={crewT.en.kpiPage.collaborationRating}
                    vn={crewT.vn.kpiPage.collaborationRating}
                  />
                }
                subtitle={<HoverTranslate en={crewT.en.kpiPage.last3Months} vn={crewT.vn.kpiPage.last3Months} />}
                breakdown={summary.collaborationRatingsLast3Months}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
