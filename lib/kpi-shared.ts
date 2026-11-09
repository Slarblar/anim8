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
  /**
   * Scored-task counts keyed by YYYY-MM. Absent on summaries cached
   * before this field existed; staff-report totals fall back when it is.
   */
  tasksByMonth?: Record<string, number>;
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

/** Admin KPI reporting clock. Directory badges and staff reports share it. */
export const KPI_REPORT_TIME_ZONE = 'America/Denver';

/** Calendar year/month in the KPI reporting timezone. */
export function kpiReportCalendar(
  now: Date = new Date(),
  timeZone = KPI_REPORT_TIME_ZONE
): { year: number; month: number; key: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

/**
 * Last fully closed calendar month in the admin reporting timezone (Denver).
 * On Sep 30 that is August; on Oct 1 it becomes September. Directory badges
 * and staff reports use this instead of the in-progress current month.
 */
export function lastCompleteKpiMonth(
  now: Date = new Date(),
  timeZone = KPI_REPORT_TIME_ZONE
): { key: string; label: string; shortLabel: string } {
  const { year, month } = kpiReportCalendar(now, timeZone);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const key = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  const anchor = new Date(Date.UTC(prevYear, prevMonth - 1, 15));
  return {
    key,
    label: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(anchor),
    shortLabel: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(anchor),
  };
}

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

/**
 * Staff-report KPI window. Month buckets stay the YYYY-MM already stored on
 * each score (completion date). Which months count is decided on the Denver
 * reporting calendar, same clock as `lastCompleteKpiMonth`.
 */
export type StaffKpiPeriod =
  | { kind: 'mtd' }
  | { kind: 'ytd' }
  | { kind: 'all' }
  | { kind: 'month'; month: string };

export type StaffKpiWindow = {
  period: StaffKpiPeriod;
  /** "October 2026", "November 2026 month to date", "2026 year to date", "All time". */
  label: string;
  singleMonth: boolean;
  /** False while the selected month is still the open Denver month. */
  closed: boolean;
  /** Oldest first. Null for all-time — each person contributes their own scored months. */
  monthKeys: string[] | null;
};

export type StaffKpiBonus = 'yes' | 'no' | 'in_progress' | 'none';

export type StaffKpiMonthRow = {
  month: string;
  label: string;
  score: number;
  band: PerformanceBand;
  tasks: number | null;
  bonus: StaffKpiBonus;
};

export type StaffKpiPersonSlice = {
  /** Sum of monthly KPI points in the window. Bands apply per month, not to this total. */
  score: number;
  /** Set for a single month that actually has points. */
  band: PerformanceBand | null;
  tasks: number | null;
  months: StaffKpiMonthRow[];
  monthsScored: number;
  averageScored: number | null;
  /** Null when the window spans more than one month. */
  bonus: StaffKpiBonus | null;
};

export type StaffKpiExportPerson = {
  name: string;
  email: string;
  role: string;
  level: string;
  employment: string;
  location: string;
  fteRatio: number | null;
  kpi: PersonKPISummary | null;
};

const STAFF_KPI_MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

function roundKpi(n: number): number {
  return Math.round(n * 100) / 100;
}

function kpiMonthLabel(key: string, style: 'long' | 'short'): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const anchor = new Date(Date.UTC(year, month - 1, 15));
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: style === 'long' ? 'long' : 'short',
    timeZone: 'UTC',
  }).format(anchor);
  return style === 'long' ? `${monthName} ${year}` : monthName;
}

function eachMonthKey(start: string, end: string): string[] {
  if (!STAFF_KPI_MONTH_PARAM.test(start) || !STAFF_KPI_MONTH_PARAM.test(end) || start > end) return [];
  const keys: string[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));
  while ((year < endYear || (year === endYear && month <= endMonth)) && keys.length < 240) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export function staffKpiPeriodParam(period: StaffKpiPeriod): string {
  return period.kind === 'month' ? period.month : period.kind;
}

/** Missing or unknown values fall back to the last closed month. */
export function parseStaffKpiPeriod(
  raw: string | string[] | undefined | null,
  now: Date = new Date()
): StaffKpiPeriod {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (value === 'mtd' || value === 'ytd' || value === 'all') return { kind: value };
  if (value && STAFF_KPI_MONTH_PARAM.test(value)) return { kind: 'month', month: value };
  return { kind: 'month', month: lastCompleteKpiMonth(now).key };
}

export function describeStaffKpiPeriod(period: StaffKpiPeriod, now: Date = new Date()): StaffKpiWindow {
  const cal = kpiReportCalendar(now);
  if (period.kind === 'mtd') {
    return {
      period,
      label: `${kpiMonthLabel(cal.key, 'long')} month to date`,
      singleMonth: true,
      closed: false,
      monthKeys: [cal.key],
    };
  }
  if (period.kind === 'ytd') {
    return {
      period,
      label: `${cal.year} year to date`,
      singleMonth: false,
      closed: false,
      monthKeys: eachMonthKey(`${cal.year}-01`, cal.key),
    };
  }
  if (period.kind === 'all') {
    return {
      period,
      label: 'All time',
      singleMonth: false,
      closed: false,
      monthKeys: null,
    };
  }
  return {
    period,
    label: kpiMonthLabel(period.month, 'long'),
    singleMonth: true,
    closed: period.month < cal.key,
    monthKeys: [period.month],
  };
}

export function staffKpiPeriodNote(window: StaffKpiWindow): string {
  if (window.period.kind === 'mtd' || (window.singleMonth && !window.closed)) {
    return 'Month to date. This month is still open, so the score and any bonus are not final.';
  }
  if (window.singleMonth) {
    return 'Closed month. Bonus applies at Good or above (55+).';
  }
  if (window.period.kind === 'ytd') {
    return 'Year to date adds monthly KPI points. Bands and bonus apply to each month, not the total. The current month is still open.';
  }
  return 'Every scored month on record. Totals add monthly KPI points. Bands and bonus apply per month.';
}

/** Newest first. Always includes last year through the current Denver month, plus any older scored months. */
export function selectableStaffKpiMonths(
  scoredMonths: Iterable<string>,
  now: Date = new Date(),
  ensureMonth?: string
): { key: string; label: string }[] {
  const cal = kpiReportCalendar(now);
  let start = `${cal.year - 1}-01`;
  let end = cal.key;
  const consider = (key: string | undefined) => {
    if (!key || !STAFF_KPI_MONTH_PARAM.test(key)) return;
    if (key < start) start = key;
    if (key > end) end = key;
  };
  for (const key of scoredMonths) consider(key);
  consider(ensureMonth);
  return eachMonthKey(start, end)
    .reverse()
    .map((key) => ({ key, label: kpiMonthLabel(key, 'long') }));
}

function monthBonus(month: string, score: number, currentKey: string): StaffKpiBonus {
  if (month >= currentKey) return 'in_progress';
  if (score <= 0) return 'none';
  return score >= KPI_BONUS_MIN_SCORE ? 'yes' : 'no';
}

function rowForMonth(
  summary: PersonKPISummary | null,
  key: string,
  currentKey: string,
  labelStyle: 'long' | 'short'
): StaffKpiMonthRow {
  const found = summary?.monthly.find((entry) => entry.month === key);
  const score = found?.score ?? 0;
  const tasks = summary?.tasksByMonth ? (summary.tasksByMonth[key] ?? 0) : null;
  return {
    month: key,
    label: kpiMonthLabel(key, labelStyle),
    score,
    band: found?.band ?? performanceBand(score),
    tasks,
    bonus: monthBonus(key, score, currentKey),
  };
}

export function staffKpiSlice(
  summary: PersonKPISummary | null,
  window: StaffKpiWindow,
  now: Date = new Date()
): StaffKpiPersonSlice {
  const currentKey = kpiReportCalendar(now).key;
  let months: StaffKpiMonthRow[];
  if (window.monthKeys) {
    const labelStyle = window.period.kind === 'all' ? 'long' : 'short';
    months = window.monthKeys.map((key) => rowForMonth(summary, key, currentKey, labelStyle));
  } else {
    const keys = (summary?.monthly ?? [])
      .map((entry) => entry.month)
      .filter((key) => STAFF_KPI_MONTH_PARAM.test(key))
      .sort();
    months = keys
      .map((key) => rowForMonth(summary, key, currentKey, 'long'))
      .filter((row) => row.score > 0 || (row.tasks ?? 0) > 0);
  }

  const score = roundKpi(months.reduce((sum, row) => sum + row.score, 0));
  const scored = months.filter((row) => row.score > 0);
  let tasks: number | null;
  if (months.length > 0 && months.every((row) => row.tasks != null)) {
    tasks = months.reduce((sum, row) => sum + (row.tasks ?? 0), 0);
  } else if (window.period.kind === 'ytd' && summary && !summary.tasksByMonth) {
    tasks = summary.ytdTasks;
  } else if (summary?.tasksByMonth || !summary) {
    tasks = 0;
  } else {
    tasks = null;
  }

  return {
    score,
    band: window.singleMonth && score > 0 ? performanceBand(score) : null,
    tasks,
    months,
    monthsScored: scored.length,
    averageScored: scored.length
      ? roundKpi(scored.reduce((sum, row) => sum + row.score, 0) / scored.length)
      : null,
    bonus: window.singleMonth ? (months[0]?.bonus ?? 'none') : null,
  };
}

export function staffKpiBonusLabel(bonus: StaffKpiBonus): string {
  switch (bonus) {
    case 'yes':
      return 'Yes';
    case 'no':
      return 'No';
    case 'in_progress':
      return 'In progress';
    case 'none':
      return '—';
  }
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** One row per person per month so a spreadsheet can filter, sum, and check bonus. */
export function buildStaffKpiCsv(
  people: StaffKpiExportPerson[],
  window: StaffKpiWindow,
  now: Date = new Date()
): string {
  const header = [
    'Name',
    'Email',
    'Role',
    'Level',
    'Employment',
    'Location',
    'FTE',
    'Period',
    'Month',
    'Score',
    'Band',
    'Scored tasks',
    'Bonus eligible',
  ];
  const lines = [header.join(',')];
  for (const person of people) {
    const slice = staffKpiSlice(person.kpi, window, now);
    const monthRows = slice.months.length > 0 ? slice.months : [null];
    for (const row of monthRows) {
      const score = row?.score ?? 0;
      const bonus = !row || row.bonus === 'none' ? '' : staffKpiBonusLabel(row.bonus);
      const cells = [
        person.name,
        person.email,
        person.role,
        person.level,
        person.employment,
        person.location,
        person.fteRatio == null ? '' : person.fteRatio.toFixed(2),
        window.label,
        row?.month ?? '',
        score.toFixed(1),
        score > 0 && row ? performanceBandLabel(row.band) : 'No score',
        row?.tasks == null ? '' : String(row.tasks),
        bonus,
      ];
      lines.push(cells.map(csvCell).join(','));
    }
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function staffKpiCsvFilename(window: StaffKpiWindow, now: Date = new Date()): string {
  const cal = kpiReportCalendar(now);
  switch (window.period.kind) {
    case 'mtd':
      return `anim8-staff-kpi-mtd-${cal.key}.csv`;
    case 'ytd':
      return `anim8-staff-kpi-ytd-${cal.year}.csv`;
    case 'all':
      return 'anim8-staff-kpi-all-time.csv';
    case 'month':
      return `anim8-staff-kpi-${window.period.month}.csv`;
  }
}
