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
  /** Current month + the two before it, zero-filled — for the "past 3 months" bar chart. */
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
  active: boolean;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  weeklyContractedHours: number;
  /** Null when this person has no scored tasks in the Anim8 KPI project yet. */
  summary: PersonKPISummary | null;
};

/** Performance bands from the KPI scoring doc §1 — same thresholds for everyone once FTE-normalized. */
export function performanceBand(score: number): PerformanceBand {
  if (score >= 100) return 'great';
  if (score >= 80) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'bad';
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
