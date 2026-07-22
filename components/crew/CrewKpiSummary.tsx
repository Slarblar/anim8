'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PersonKPISummary, PersonMonthlyKPI, RatingCount } from '@/lib/kpi';
import { adminAlertError, adminBody, adminBtnGhost, adminCard, adminSectionTitle } from '@/components/admin/admin-ui';

type KpiResponse = { summary: PersonKPISummary | null; email?: string; error?: string };

/** Best -> worst, matching the Asana enum options on both rating fields. Bridges the site's lime→cyan→pink gradient. */
const RATING_COLORS: Record<string, string> = {
  '5 - Excellent': '#7cc142',
  '4 - Very Good': '#5ac28c',
  '3 - Good': '#38c2d6',
  '2 - Fair': '#8b67ad',
  '1 - Poor': '#dd0b83',
};

function stripRatingNumber(rating: string): string {
  return rating.replace(/^\d+\s*-\s*/, '');
}

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

type ChartPoint = { x: number; y: number; month: PersonMonthlyKPI };

/** Animated YTD line chart — gradient stroke, glass-style area fill, and a "drawing in" reveal on mount. */
function KpiLineChart({ months }: { months: PersonMonthlyKPI[] }) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setDrawn(false);
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [months]);

  const width = 640;
  const height = 220;
  const padX = 24;
  const padTop = 36;
  const padBottom = 28;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;
  const baselineY = padTop + chartH;

  const maxScore = Math.max(1, ...months.map((m) => m.score));

  const points: ChartPoint[] = useMemo(
    () =>
      months.map((month, i) => ({
        x: months.length === 1 ? padX + chartW / 2 : padX + (i / (months.length - 1)) * chartW,
        y: padTop + (1 - month.score / maxScore) * chartH,
        month,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [months, maxScore]
  );

  if (months.length === 0) {
    return <p className={adminBody}>No scored tasks logged yet this year.</p>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

  return (
    <div className="kpi-animate-hue overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="kpiLineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7cc142" />
            <stop offset="50%" stopColor="#38c2d6" />
            <stop offset="100%" stopColor="#dd0b83" />
          </linearGradient>
          <linearGradient id="kpiAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38c2d6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38c2d6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={areaPath}
          fill="url(#kpiAreaFill)"
          style={{ opacity: drawn ? 1 : 0, transition: 'opacity 1.1s ease-out 0.2s' }}
        />

        <path
          d={linePath}
          fill="none"
          stroke="url(#kpiLineStroke)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: drawn ? 0 : 1,
            transition: 'stroke-dashoffset 1.6s ease-out',
          }}
        />

        {points.map((p, i) => (
          <g
            key={p.month.month}
            style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.4s ease-out ${0.3 + i * 0.06}s` }}
          >
            {i === points.length - 1 ? (
              <circle cx={p.x} cy={p.y} r={9} fill="#38c2d6" className="kpi-dot-pulse" />
            ) : null}
            <circle cx={p.x} cy={p.y} r={4.5} fill="#0f0f0f" stroke="#fff" strokeWidth={1.5} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-white text-[10px] font-bold font-mono">
              {p.month.score}
            </text>
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-[#8b95a8] text-[9px] font-bold uppercase tracking-wider font-mono"
            >
              {p.month.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Animated donut for one rating field over a fixed window — arcs grow in, colors breathe. */
function RatingDonut({ title, subtitle, breakdown }: { title: string; subtitle: string; breakdown: RatingCount[] }) {
  const [grown, setGrown] = useState(false);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  useEffect(() => {
    setGrown(false);
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [breakdown]);

  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let cumulative = 0;
    return breakdown
      .filter((b) => b.count > 0)
      .map((b) => {
        const segLen = total > 0 ? (b.count / total) * circumference : 0;
        const dashOffset = circumference - cumulative;
        cumulative += segLen;
        return { ...b, segLen, dashOffset };
      });
  }, [breakdown, total, circumference]);

  return (
    <div className={adminCard}>
      <p className={adminSectionTitle}>{title}</p>
      <p className={`${adminBody} mt-1`}>{subtitle}</p>

      {total === 0 ? (
        <p className={`${adminBody} mt-4`}>No ratings logged in this window yet.</p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <div className="kpi-animate-hue relative shrink-0" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
              />
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                {segments.map((seg) => (
                  <circle
                    key={seg.rating}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    style={{
                      stroke: RATING_COLORS[seg.rating] ?? '#8b95a8',
                      strokeDasharray: `${grown ? seg.segLen : 0} ${circumference}`,
                      strokeDashoffset: seg.dashOffset,
                      transition: 'stroke-dasharray 1s ease-out',
                    }}
                  />
                ))}
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{total}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted font-mono">rated</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.rating} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-text-muted">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: RATING_COLORS[b.rating] ?? '#8b95a8' }}
                  />
                  <span className="truncate">{stripRatingNumber(b.rating)}</span>
                </span>
                <span className="font-mono font-bold text-white">{b.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
