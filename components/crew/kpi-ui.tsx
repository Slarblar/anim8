'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PersonMonthlyKPI, RatingCount } from '@/lib/kpi';
import { adminCard } from '@/components/admin/admin-ui';

/**
 * Bigger, more "premium" text scale for the /crew dashboard + KPI pages
 * specifically — deliberately NOT touching admin-ui.ts's adminSectionTitle
 * / adminBody, since those stay compact/functional across the rest of
 * /admin. Use these two instead of the admin-ui equivalents anywhere on
 * the crew-facing dashboard.
 */
export const crewSectionTitle = 'text-white text-xl md:text-2xl font-black uppercase tracking-tight';
export const crewBody = 'text-[#8b95a8] text-sm md:text-[15px] leading-relaxed';

/** Best -> worst, matching the Asana enum options on both rating fields. Bridges the site's lime→cyan→pink gradient. */
export const RATING_COLORS: Record<string, string> = {
  '5 - Excellent': '#7cc142',
  '4 - Very Good': '#5ac28c',
  '3 - Good': '#38c2d6',
  '2 - Fair': '#8b67ad',
  '1 - Poor': '#dd0b83',
};

export function stripRatingNumber(rating: string): string {
  return rating.replace(/^\d+\s*-\s*/, '');
}

/** "#rrggbb" -> "r, g, b", for building rgba() strings from the band hex colors below. */
function hexToRgbTriple(hex: string): string {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export type ScoreBand = {
  key: 'great' | 'good' | 'average' | 'bad' | 'poor';
  label: string;
  /** Score at/above which a Total KPI Score qualifies for this band (bands are checked best-first). */
  min: number;
  color: string;
  colorDark: string;
  colorLight: string;
};

/**
 * Total KPI Score performance bands — straight from the Anim8 KPI Scoring
 * Documentation ("1. Performance Bands"), so the /crew KPI charts use the
 * exact same green -> yellow -> orange -> red read as the reference doc and
 * people can tell at a glance whether they're trending up or slipping.
 * Ordered best -> worst; `getScoreBand` returns the first match.
 */
export const SCORE_BANDS: ScoreBand[] = [
  { key: 'great', label: 'Great (100+)', min: 100, color: '#22c55e', colorDark: '#123a1f', colorLight: '#86efac' },
  { key: 'good', label: 'Good (80–99.9)', min: 80, color: '#7cc142', colorDark: '#34540f', colorLight: '#b6ec7a' },
  {
    key: 'average',
    label: 'Average (60–79.9)',
    min: 60,
    color: '#eab308',
    colorDark: '#4a3c08',
    colorLight: '#fde68a',
  },
  { key: 'bad', label: 'Bad (40–59.9)', min: 40, color: '#f97316', colorDark: '#4a2408', colorLight: '#fdba74' },
  { key: 'poor', label: 'Poor (<40)', min: 0, color: '#ef4444', colorDark: '#3f1414', colorLight: '#fca5a5' },
];

/** Which performance band a Total KPI Score falls into. A score of 0 (no data yet) reads as the lowest band, but the bar itself is hidden (height 0) so it never actually shows red for "no data". */
export function getScoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find((band) => score >= band.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/** Whichever rating bucket has the most scored tasks in the window — "no ratings yet" when the window is empty. */
export function topRating(breakdown: RatingCount[]): RatingCount | null {
  const rated = breakdown.filter((b) => b.count > 0);
  if (rated.length === 0) return null;
  return rated.reduce((best, b) => (b.count > best.count ? b : best), rated[0]);
}

export function ScoreDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) {
    return <span className="text-xs font-bold text-text-muted">— flat vs last month</span>;
  }
  const up = diff > 0;
  return (
    <span className={`text-xs font-bold ${up ? 'text-brand-lime' : 'text-brand-pink'}`}>
      {up ? '▲' : '▼'} {Math.abs(diff).toFixed(2)} vs last month
    </span>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className={adminCard}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">{label}</p>
      <p className="mt-2 text-3xl font-black text-white md:text-4xl">{value}</p>
      {sub ? <p className="mt-1.5">{sub}</p> : null}
    </div>
  );
}

/**
 * Animated bar chart, styled like a video-game health/mana bar: a glowing
 * fill with a bright white glowing cap right at the top edge, growing up
 * from the track on mount. The current month pulses (glow breathing + a
 * diagonal shimmer sweep); past months hold a calmer, static glow so the
 * current one reads as "live". Fill color follows the Total KPI Score
 * performance band (green -> yellow -> orange -> red, see `SCORE_BANDS`)
 * so anyone can tell at a glance whether they're trending up or slipping.
 */
export function MonthlyBarChart({ months }: { months: PersonMonthlyKPI[] }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [months]);

  if (months.length === 0) {
    return <p className={crewBody}>No scored tasks logged yet.</p>;
  }

  const maxScore = Math.max(1, ...months.map((m) => m.score));

  return (
    <div>
      <div className="flex items-end gap-4 min-[480px]:gap-6">
        {months.map((month, i) => {
          const heightPct = month.score > 0 ? Math.max(4, Math.round((month.score / maxScore) * 100)) : 0;
          const isCurrent = i === months.length - 1;
          const band = getScoreBand(month.score);
          const glowRgb = hexToRgbTriple(band.color);
          return (
            <div key={month.month} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
              <span className="text-sm font-black text-white font-mono md:text-base">{month.score}</span>

              {/* Track — dark recessed "bezel" the fill grows inside of. */}
              <div className="relative flex h-36 w-full items-end overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] min-[480px]:h-44">
                <div
                  className={`relative w-full overflow-hidden rounded-[6px] ${isCurrent ? 'kpi-bar-fill--active' : ''}`}
                  style={
                    {
                      height: `${grown ? heightPct : 0}%`,
                      transition: `height 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
                      background: isCurrent
                        ? `linear-gradient(to top, ${band.colorDark} 0%, ${band.color} 60%, ${band.colorLight} 100%)`
                        : `linear-gradient(to top, rgba(${glowRgb},0.55) 0%, rgba(${glowRgb},0.75) 60%, rgba(${glowRgb},0.85) 100%)`,
                      boxShadow: isCurrent ? undefined : `0 0 8px rgba(${glowRgb},0.25)`,
                      // Drives the .kpi-bar-fill--active pulse (see globals.css) so the "live" glow matches this bar's band color.
                      '--kpi-glow-color': `rgba(${glowRgb}, 0.45)`,
                      '--kpi-glow-color-strong': `rgba(${glowRgb}, 0.8)`,
                    } as CSSProperties
                  }
                >
                  {/* Diagonal shimmer sweep — current month only, reads as "charging up". */}
                  {isCurrent ? <div className="shimmer absolute inset-0" /> : null}

                  {/* Glowing white cap at the growing edge — the "health bar" highlight (thinned to half its original height). */}
                  {heightPct > 0 ? (
                    <div
                      className={`absolute inset-x-0 top-0 h-[2.5px] rounded-t-[6px] bg-white min-[480px]:h-[3px] ${
                        isCurrent ? 'kpi-bar-cap--active' : ''
                      }`}
                      style={{
                        boxShadow: isCurrent ? undefined : '0 0 5px 1px rgba(255,255,255,0.55)',
                        opacity: grown ? 1 : 0,
                        transition: `opacity 0.3s ease-out ${i * 0.1 + 0.55}s`,
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend — teaches the color code from the KPI Scoring Documentation at a glance. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 pt-4">
        {SCORE_BANDS.map((band) => (
          <span
            key={band.key}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: band.color, boxShadow: `0 0 5px 0.5px rgba(${hexToRgbTriple(band.color)},0.7)` }}
            />
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type ChartPoint = { x: number; y: number; month: PersonMonthlyKPI };

/** Animated YTD line chart — solid anim8-green glow, a filled area beneath it, and a "drawing in" reveal on mount. */
export function KpiLineChart({ months }: { months: PersonMonthlyKPI[] }) {
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
    return <p className={crewBody}>No scored tasks logged yet this year.</p>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="kpiAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7cc142" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7cc142" stopOpacity="0" />
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
          stroke="#7cc142"
          strokeWidth={1.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="kpi-line-glow"
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
              <circle cx={p.x} cy={p.y} r={9} fill="#7cc142" className="kpi-dot-pulse" />
            ) : null}
            <circle cx={p.x} cy={p.y} r={4.5} fill="#0f0f0f" stroke="#7cc142" strokeWidth={1.5} />
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
export function RatingDonut({
  title,
  subtitle,
  breakdown,
}: {
  title: string;
  subtitle: string;
  breakdown: RatingCount[];
}) {
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
      <p className={crewSectionTitle}>{title}</p>
      <p className={`${crewBody} mt-1`}>{subtitle}</p>

      {total === 0 ? (
        <p className={`${crewBody} mt-4`}>No ratings logged in this window yet.</p>
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
              <span className="text-3xl font-black text-white">{total}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">rated</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-2">
            {breakdown.map((b) => (
              <li key={b.rating} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-text-muted">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
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
