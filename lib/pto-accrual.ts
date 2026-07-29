import { getKv } from './kv';
import {
  adjustCrewMemberPtoBalance,
  annualLeaveEntitlementDays,
  getCrewMember,
  listCrewMembers,
} from './crew-directory';
import { studioTodayDateString } from './studio-date';

const ACCRUAL_LOG_PREFIX = 'pto-accrual-log:';

function currentMonthKey(asOf: Date = new Date()): string {
  // Prefer studio-local month so we don't flip a day early/late vs Vietnam.
  return studioTodayDateString(asOf).slice(0, 7); // YYYY-MM
}

function keyFor(email: string, monthKey: string): string {
  return `${ACCRUAL_LOG_PREFIX}${email}:${monthKey}`;
}

/** Inclusive month range from hire YYYY-MM through throughMonth YYYY-MM. */
function monthsFromTo(fromMonth: string, throughMonth: string): string[] {
  const months: string[] = [];
  let [y, m] = fromMonth.split('-').map(Number);
  const [endY, endM] = throughMonth.split('-').map(Number);
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

/**
 * Handbook 3.7 — grants entitlement/12 days per completed month, so someone
 * hired mid-year (or with 12 + tenure-bonus days) accrues at the same
 * prorated rate the handbook describes for anyone under 12 months.
 *
 * Idempotent per employee per month (logged in KV) so re-running the cron —
 * or a manual retry — never double-accrues.
 */
export async function runMonthlyPtoAccrual(
  monthKey: string = currentMonthKey()
): Promise<{ accrued: number; skipped: number }> {
  const members = await listCrewMembers();
  const kv = getKv();
  let accrued = 0;
  let skipped = 0;

  for (const member of members) {
    if (!member.active || !member.startDate) {
      skipped++;
      continue;
    }

    const hireMonthKey = member.startDate.slice(0, 7);
    if (monthKey < hireMonthKey) {
      skipped++;
      continue;
    }

    const logKey = keyFor(member.email, monthKey);
    const alreadyAccrued = await kv.get(logKey);
    if (alreadyAccrued) {
      skipped++;
      continue;
    }

    const entitlement = annualLeaveEntitlementDays(member.startDate);
    const monthlyAccrual = Math.round((entitlement / 12) * 100) / 100;

    await adjustCrewMemberPtoBalance(member.email, monthlyAccrual);
    // ~13 months TTL — plenty to prevent double-accrual, tidy after that.
    await kv.set(logKey, true, { ex: 60 * 60 * 24 * 400 });
    accrued++;
  }

  return { accrued, skipped };
}

/**
 * Catch-up when a hire date is set (or corrected) after the fact — grants
 * every missing month from startDate through the current studio month using
 * the same per-month log as the cron, so future monthly runs won't double-count.
 */
export async function backfillPtoAccrualForMember(
  email: string,
  throughMonth: string = currentMonthKey()
): Promise<{ monthsGranted: number; daysGranted: number }> {
  const member = await getCrewMember(email);
  if (!member?.startDate) {
    throw new Error('Start date is required before accruing PTO.');
  }

  const hireMonthKey = member.startDate.slice(0, 7);
  if (throughMonth < hireMonthKey) {
    return { monthsGranted: 0, daysGranted: 0 };
  }

  const kv = getKv();
  let monthsGranted = 0;
  let daysGranted = 0;

  for (const monthKey of monthsFromTo(hireMonthKey, throughMonth)) {
    const logKey = keyFor(member.email, monthKey);
    if (await kv.get(logKey)) continue;

    // Tenure bonus can grow over years — compute entitlement as of that month.
    const asOf = new Date(`${monthKey}-01T00:00:00Z`);
    const entitlement = annualLeaveEntitlementDays(member.startDate, asOf);
    const monthlyAccrual = Math.round((entitlement / 12) * 100) / 100;

    await adjustCrewMemberPtoBalance(member.email, monthlyAccrual);
    await kv.set(logKey, true, { ex: 60 * 60 * 24 * 400 });
    monthsGranted++;
    daysGranted += monthlyAccrual;
  }

  return {
    monthsGranted,
    daysGranted: Math.round(daysGranted * 100) / 100,
  };
}
