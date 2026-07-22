import { getKv } from './kv';

/** Mon–Fri only — the fixed WFH schedule doesn't cover weekends. */
export type WeekdayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type CrewLocation = 'US' | 'VN';

export type CrewMember = {
  email: string;
  name: string;
  /** Free-text job title, e.g. "3D Artist", "Producer". */
  role: string;
  startDate: string | null;
  active: boolean;
  createdAt: string;
  /** Available annual-leave (PTO) balance, in working days. Employee Handbook 3.7. */
  ptoBalanceDays: number;
  ptoBalanceUpdatedAt: string;
  /** Which team/office this person is based in — mostly used for timezone-aware scheduling. */
  location: CrewLocation;
  /** Standing days-of-week this person works from home. Mirrored to recurring Google Calendar events. */
  fixedWfhDays: WeekdayCode[];
  /**
   * Google Calendar recurring-event ID for each fixedWfhDays entry, keyed by
   * day — lets us diff on change (only touch days that actually flipped)
   * instead of tearing down and recreating the whole schedule every time.
   */
  fixedWfhCalendarEventIds: Partial<Record<WeekdayCode, string>>;
};

/** Fills in fields that may be missing on records created before they existed. */
function withDefaults(record: CrewMember): CrewMember {
  return {
    ...record,
    location: record.location ?? 'VN',
    fixedWfhDays: record.fixedWfhDays ?? [],
    fixedWfhCalendarEventIds: record.fixedWfhCalendarEventIds ?? {},
  };
}

/**
 * Employee Handbook 3.7 (Nghỉ hằng năm) — 12 base working days/year once an
 * employee has worked 12 full months, +1 day per 5 years of tenure. Under a
 * year, leave is prorated to months worked — that's handled by accruing
 * entitlement/12 per completed month (see lib/pto-accrual.ts) rather than
 * granting the full amount up front.
 */
export function annualLeaveEntitlementDays(
  startDate: string | null,
  asOf: Date = new Date()
): number {
  if (!startDate) return 12;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || start > asOf) return 12;

  let years = asOf.getUTCFullYear() - start.getUTCFullYear();
  const anniversaryPassed =
    asOf.getUTCMonth() > start.getUTCMonth() ||
    (asOf.getUTCMonth() === start.getUTCMonth() && asOf.getUTCDate() >= start.getUTCDate());
  if (!anniversaryPassed) years -= 1;
  years = Math.max(0, years);

  return 12 + Math.floor(years / 5);
}

const KEY_PREFIX = 'crew-directory:';

function keyFor(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

export async function getCrewMember(email: string): Promise<CrewMember | null> {
  if (!email) return null;
  const record = await getKv().get<CrewMember>(keyFor(email));
  return record ? withDefaults(record) : null;
}

/** Gate check for /crew access — safe to call from edge middleware. */
export async function isCrewMemberEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const member = await getCrewMember(email);
  return !!member?.active;
}

/** Admin — full crew directory, newest first. */
export async function listCrewMembers(): Promise<CrewMember[]> {
  const keys = await getKv().keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return [];

  const records = await Promise.all(keys.map((key) => getKv().get<CrewMember>(key)));
  return records
    .filter((record): record is CrewMember => !!record)
    .map(withDefaults)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addOrUpdateCrewMember(input: {
  email: string;
  name: string;
  role: string;
  startDate?: string | null;
  /** Only applied the first time this person is added — carries over any pre-launch balance. */
  initialPtoBalanceDays?: number;
}): Promise<CrewMember> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    throw new Error('Name and email are required.');
  }

  const existing = await getCrewMember(email);
  const record: CrewMember = {
    email,
    name,
    role: input.role.trim(),
    startDate: input.startDate ?? existing?.startDate ?? null,
    active: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ptoBalanceDays: existing?.ptoBalanceDays ?? input.initialPtoBalanceDays ?? 0,
    ptoBalanceUpdatedAt: existing?.ptoBalanceUpdatedAt ?? new Date().toISOString(),
    location: existing?.location ?? 'VN',
    fixedWfhDays: existing?.fixedWfhDays ?? [],
    fixedWfhCalendarEventIds: existing?.fixedWfhCalendarEventIds ?? {},
  };

  await getKv().set(keyFor(email), record);
  return record;
}

export async function setCrewMemberActive(email: string, active: boolean): Promise<void> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  await getKv().set(keyFor(email), { ...existing, active });
}

/** Backfill/correct hire date — drives tenure bonus + monthly accrual eligibility. */
export async function setCrewMemberStartDate(
  email: string,
  startDate: string | null
): Promise<CrewMember> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  const updated = { ...existing, startDate };
  await getKv().set(keyFor(email), updated);
  return updated;
}

export async function setCrewMemberLocation(
  email: string,
  location: CrewLocation
): Promise<CrewMember> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  const updated = { ...existing, location };
  await getKv().set(keyFor(email), updated);
  return updated;
}

/**
 * Persists the standing WFH days + the calendar event IDs for the recurring
 * series that now represents them. Calendar create/delete happens in the
 * caller (route handler) via lib/google-calendar.ts — this just records the
 * result, same split as the rest of PTO/WFH calendar sync in this codebase.
 */
export async function setCrewMemberFixedWfh(
  email: string,
  fixedWfhDays: WeekdayCode[],
  fixedWfhCalendarEventIds: Partial<Record<WeekdayCode, string>>
): Promise<CrewMember> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  const updated = { ...existing, fixedWfhDays, fixedWfhCalendarEventIds };
  await getKv().set(keyFor(email), updated);
  return updated;
}

/** Positive to grant days (accrual, corrections), negative to deduct (approved PTO). */
export async function adjustCrewMemberPtoBalance(
  email: string,
  deltaDays: number
): Promise<CrewMember> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);

  const updated: CrewMember = {
    ...existing,
    // Fallback for directory records created before balance tracking existed.
    ptoBalanceDays: Math.round(((existing.ptoBalanceDays ?? 0) + deltaDays) * 100) / 100,
    ptoBalanceUpdatedAt: new Date().toISOString(),
  };
  await getKv().set(keyFor(email), updated);
  return updated;
}
