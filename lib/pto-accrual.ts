import { getKv } from './kv';
import { adjustCrewMemberPtoBalance, annualLeaveEntitlementDays, listCrewMembers } from './crew-directory';

const ACCRUAL_LOG_PREFIX = 'pto-accrual-log:';

function currentMonthKey(asOf: Date = new Date()): string {
  return asOf.toISOString().slice(0, 7); // YYYY-MM
}

function keyFor(email: string, monthKey: string): string {
  return `${ACCRUAL_LOG_PREFIX}${email}:${monthKey}`;
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
