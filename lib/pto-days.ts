/**
 * Pure PTO day-count helpers — safe for client + server (no KV / server-only).
 */

export type DayPortion = 'full' | 'half';

/** Minimum calendar days of notice before a make-up day; shorter notice is still allowed but flagged Late. */
export const MAKEUP_NOTICE_DAYS = 14;

/** Mon–Fri only, inclusive — matches the Handbook's "working days" definition. */
export function countBusinessDays(startDate: string, endDate: string): number {
  let count = 0;
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return 0;
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/**
 * Working days a request draws from the PTO balance.
 * Half-day is always 0.5 and only valid for a single calendar day.
 */
export function requestedWorkingDays(
  startDate: string,
  endDate: string,
  dayPortion: DayPortion | null | undefined = 'full'
): number {
  const full = countBusinessDays(startDate, endDate);
  if ((dayPortion ?? 'full') === 'half') {
    return full > 0 ? 0.5 : 0;
  }
  return full;
}

export function normalizeDayPortion(value: unknown): DayPortion {
  return value === 'half' ? 'half' : 'full';
}

/** Whole calendar days from `fromDate` to `toDate` (YYYY-MM-DD). Negative if to is before from. */
export function calendarDaysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Make-up requests submitted with fewer than MAKEUP_NOTICE_DAYS before the
 * make-up work date are still accepted, but admins should see a Late flag.
 */
export function isMakeupRequestLate(input: {
  type: string;
  /** Make-up work day (YYYY-MM-DD). */
  makeupDate: string;
  /** Submission / last-edit timestamp (ISO) or YYYY-MM-DD. */
  submittedAt: string;
}): boolean {
  if (input.type !== 'MAKEUP') return false;
  const submittedDay = input.submittedAt.slice(0, 10);
  return calendarDaysBetween(submittedDay, input.makeupDate) < MAKEUP_NOTICE_DAYS;
}

/** True when the employee may still edit and re-submit this request. */
export function canEditPtoRequest(
  request: { status: string; startDate: string; endDate: string },
  today: string
): boolean {
  // Editable until the request's date range is fully in the past.
  // Approved ones re-submit for approval (calendar + balance are unwound first).
  return request.endDate >= today;
}
