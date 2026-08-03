/**
 * Pure PTO day-count helpers — safe for client + server (no KV / server-only).
 */

export type DayPortion = 'full' | 'half';

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

/** True when the employee may still edit and re-submit this request. */
export function canEditPtoRequest(
  request: { status: string; startDate: string; endDate: string },
  today: string
): boolean {
  if (request.endDate < today) return false;
  if (request.status === 'pending' || request.status === 'rejected') return true;
  // Approved: only before the leave has started (so we can unwind calendar + balance).
  if (request.status === 'approved') return request.startDate >= today;
  return false;
}
