/**
 * Client-safe KPI types + pure helpers. Keep server-only Asana fetching in
 * lib/kpi.ts — importing that from a Client Component breaks the build.
 */

export type PerformanceBand = 'great' | 'good' | 'average' | 'bad' | 'poor';

export type PersonMonthlyKPI = {
  month: string; // 'YYYY-MM'
  label: string; // 'Jul' or 'Jan 2026' when the year changes
  score: number;
  band: PerformanceBand;
};

/** One rating bucket (Asana enum option, e.g. "5 - Excellent") + how many scored tasks landed in it. */
export type RatingCount = {
  rating: string;
  count: number;
};

export type PersonKPISummary = {
  name: string;
  email: string;
  ytdScore: number;
  ytdTasks: number;
  currentMonthScore: number;
  previousMonthScore: number;
  currentMonthBand: PerformanceBand;
  previousMonthBand: PerformanceBand;
  /** FTE Ratio used to normalize this person's volume (hours ÷ 40). */
  fteRatio: number;
  weeklyContractedHours: number;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  /** Full history, oldest first — used for long-range trend views. */
  monthly: PersonMonthlyKPI[];
  /** Past 3 calendar months + current month (last entry labeled "Current"), zero-filled. */
  lastThreeMonthly: PersonMonthlyKPI[];
  /** Jan 1 of the current year through the current month, zero-filled — for the YTD line chart. */
  ytdMonthly: PersonMonthlyKPI[];
  qualityRatingsLast3Months: RatingCount[];
  collaborationRatingsLast3Months: RatingCount[];
};

/** One crew member row on the admin KPI board (directory + optional Asana summary). */
export type AdminKpiPerson = {
  email: string;
  name: string;
  role: string;
  level: string;
  active: boolean;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  weeklyContractedHours: number;
  /** Null when this person has no scored tasks in the Anim8 KPI project yet. */
  summary: PersonKPISummary | null;
};

/**
 * Minimum monthly Total KPI Score for each band — Anim8 KPI Scoring
 * Documentation 2026 v3 §1. Same thresholds for everyone once FTE-normalized.
 * Great at 85+ (raised from 70 in v2 after fuller monthly data showed scores
 * skewing high — keeps Great genuinely top-tier).
 */
export const PERFORMANCE_BAND_MIN: Record<PerformanceBand, number> = {
  great: 85,
  good: 55,
  average: 40,
  bad: 25,
  poor: 0,
};

/** Monthly KPI bonus threshold — Good or Great tier (doc §1). */
export const KPI_BONUS_MIN_SCORE = PERFORMANCE_BAND_MIN.good;

/** Fixed chart ceiling (~1.2× Great threshold; doc §4 high-performer example: 105). */
export const KPI_CHART_SCALE_MAX = 105;

export function performanceBand(score: number): PerformanceBand {
  if (score >= PERFORMANCE_BAND_MIN.great) return 'great';
  if (score >= PERFORMANCE_BAND_MIN.good) return 'good';
  if (score >= PERFORMANCE_BAND_MIN.average) return 'average';
  if (score >= PERFORMANCE_BAND_MIN.bad) return 'bad';
  return 'poor';
}

export function performanceBandLabel(band: PerformanceBand): string {
  switch (band) {
    case 'great':
      return 'Great';
    case 'good':
      return 'Good';
    case 'average':
      return 'Average';
    case 'bad':
      return 'Bad';
    case 'poor':
      return 'Poor';
  }
}
