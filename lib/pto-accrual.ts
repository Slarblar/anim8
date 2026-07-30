import { getKv } from './kv';
import {
  adjustCrewMemberPtoBalance,
  annualLeaveEntitlementDays,
  getCrewMember,
  listCrewMembers,
  type CrewMember,
} from './crew-directory';
import { countBusinessDays, listPtoRequestsForEmployee } from './pto-requests';
import { studioTodayDateString } from './studio-date';
import {
  computeAccruedPtoDays as computeAccruedPtoDaysShared,
  monthsFromTo,
} from './pto-accrual-shared';

export { monthsFromTo } from './pto-accrual-shared';

const ACCRUAL_LOG_PREFIX = 'pto-accrual-log:';

function currentMonthKey(asOf: Date = new Date()): string {
  return studioTodayDateString(asOf).slice(0, 7); // YYYY-MM
}

function keyFor(email: string, monthKey: string): string {
  return `${ACCRUAL_LOG_PREFIX}${email.trim().toLowerCase()}:${monthKey}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Handbook 3.7 — total days earned from hire through the current studio month.
 * Pure wrapper around the shared helper (server uses studio timezone).
 */
export function computeAccruedPtoDays(
  startDate: string | null,
  asOf: Date = new Date()
): number {
  return computeAccruedPtoDaysShared(startDate, currentMonthKey(asOf), asOf);
}

/** Approved PTO working days for an employee (WFH does not consume the balance). */
export async function computePtoDaysTaken(email: string): Promise<number> {
  const requests = await listPtoRequestsForEmployee(email);
  const taken = requests
    .filter((r) => r.type === 'PTO' && r.status === 'approved')
    .reduce((sum, r) => sum + countBusinessDays(r.startDate, r.endDate), 0);
  return round2(taken);
}

/**
 * Handbook 3.7 — grants entitlement/12 days per month. Idempotent per employee
 * per month (logged in KV) so re-running the cron never double-accrues.
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
    if (await kv.get(logKey)) {
      skipped++;
      continue;
    }

    const entitlement = annualLeaveEntitlementDays(member.startDate);
    const monthlyAccrual = round2(entitlement / 12);

    await adjustCrewMemberPtoBalance(member.email, monthlyAccrual);
    await kv.set(logKey, true, { ex: 60 * 60 * 24 * 400 });
    accrued++;
  }

  return { accrued, skipped };
}

/**
 * Catch-up: grant any months since hire that the cron hasn't logged yet.
 * Safe to call on page load — never double-counts thanks to the per-month log.
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

    const asOf = new Date(`${monthKey}-01T00:00:00Z`);
    const entitlement = annualLeaveEntitlementDays(member.startDate, asOf);
    const monthlyAccrual = round2(entitlement / 12);

    await adjustCrewMemberPtoBalance(member.email, monthlyAccrual);
    await kv.set(logKey, true, { ex: 60 * 60 * 24 * 400 });
    monthsGranted++;
    daysGranted += monthlyAccrual;
  }

  return {
    monthsGranted,
    daysGranted: round2(daysGranted),
  };
}

/**
 * Authoritative sync from the handbook:
 *   available = accrued − approved PTO taken + admin Adjust PTO corrections
 * Stamps every month through now as logged so the cron won't double-grant.
 */
export async function recomputePtoBalanceForMember(email: string): Promise<{
  member: CrewMember;
  accruedDays: number;
  takenDays: number;
  adjustmentDays: number;
  balanceDays: number;
}> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  if (!existing.startDate) throw new Error('Start date is required before accruing PTO.');

  const accruedDays = computeAccruedPtoDays(existing.startDate);
  const takenDays = await computePtoDaysTaken(email);
  const adjustmentDays = existing.ptoAdjustmentDays ?? 0;
  const balanceDays = round2(accruedDays - takenDays + adjustmentDays);
  const delta = round2(balanceDays - (existing.ptoBalanceDays ?? 0));

  let member = existing;
  if (delta !== 0) {
    // Not manual — don't change ptoAdjustmentDays; we're only aligning the balance field.
    member = await adjustCrewMemberPtoBalance(email, delta);
  }

  const kv = getKv();
  const hireMonthKey = existing.startDate.slice(0, 7);
  for (const monthKey of monthsFromTo(hireMonthKey, currentMonthKey())) {
    await kv.set(keyFor(email, monthKey), true, { ex: 60 * 60 * 24 * 400 });
  }

  return { member, accruedDays, takenDays, adjustmentDays, balanceDays };
}

/**
 * Bring every active crew member with a start date up to date. Used when
 * the admin crew directory loads so balances aren't waiting on the monthly cron.
 *
 * Only grants missing months (idempotent log) — never force-recomputes, so an
 * admin "Adjust PTO −4" is not wiped on the next directory refresh.
 */
export async function ensureAllCrewPtoAccrualCaughtUp(): Promise<void> {
  const members = await listCrewMembers();
  await Promise.all(
    members
      .filter((m) => m.active && m.startDate)
      .map((m) => backfillPtoAccrualForMember(m.email).catch(() => null))
  );
}
