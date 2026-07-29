import { annualLeaveEntitlementDays } from './crew-directory';

/** Inclusive month range from hire YYYY-MM through throughMonth YYYY-MM. */
export function monthsFromTo(fromMonth: string, throughMonth: string): string[] {
  const months: string[] = [];
  let [y, m] = fromMonth.split('-').map(Number);
  const [endY, endM] = throughMonth.split('-').map(Number);
  if (!y || !m || !endY || !endM) return months;
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Handbook 3.7 — total days earned from hire through `throughMonth`
 * (entitlement/12 per month). Pure / client-safe.
 */
export function computeAccruedPtoDays(
  startDate: string | null,
  throughMonth: string,
  asOfForTenure: Date = new Date()
): number {
  if (!startDate) return 0;
  const hireMonthKey = startDate.slice(0, 7);
  if (throughMonth < hireMonthKey) return 0;

  let total = 0;
  for (const monthKey of monthsFromTo(hireMonthKey, throughMonth)) {
    const asOfMonth = new Date(`${monthKey}-01T00:00:00Z`);
    // Tenure as of that month (falls back to asOfForTenure only if needed).
    const entitlement = annualLeaveEntitlementDays(startDate, asOfMonth.getTime() ? asOfMonth : asOfForTenure);
    total += entitlement / 12;
  }
  return round2(total);
}

/** Current calendar month as YYYY-MM in the given timezone (defaults to studio VN). */
export function monthKeyInTimeZone(
  timeZone: string = 'Asia/Ho_Chi_Minh',
  asOf: Date = new Date()
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(asOf).slice(0, 7);
}
