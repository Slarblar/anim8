import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import {
  adjustCrewMemberPtoBalance,
  getCrewMember,
  setCrewMemberActive,
  setCrewMemberEmploymentType,
  setCrewMemberFixedWfh,
  setCrewMemberLocation,
  setCrewMemberStartDate,
  setCrewMemberWeeklyHours,
  type CrewLocation,
  type EmploymentType,
  type WeekdayCode,
} from '@/lib/crew-directory';
import { createFixedWfhCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

const WEEKDAY_CODES: WeekdayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contractor'];

type PatchBody = {
  active?: boolean;
  adjustBalanceDays?: number;
  startDate?: string | null;
  location?: CrewLocation;
  employmentType?: EmploymentType;
  weeklyContractedHours?: number;
  fixedWfhDays?: WeekdayCode[];
};

export async function PATCH(req: NextRequest, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const hasActive = typeof body.active === 'boolean';
  const hasAdjustment = typeof body.adjustBalanceDays === 'number' && body.adjustBalanceDays !== 0;
  const hasStartDate = body.startDate !== undefined;
  const hasLocation = body.location === 'US' || body.location === 'VN';
  const hasEmploymentType = !!body.employmentType && EMPLOYMENT_TYPES.includes(body.employmentType);
  const hasWeeklyHours = typeof body.weeklyContractedHours === 'number' && body.weeklyContractedHours > 0;
  const hasFixedWfhDays =
    Array.isArray(body.fixedWfhDays) &&
    body.fixedWfhDays.every((day) => WEEKDAY_CODES.includes(day));

  if (
    !hasActive &&
    !hasAdjustment &&
    !hasStartDate &&
    !hasLocation &&
    !hasEmploymentType &&
    !hasWeeklyHours &&
    !hasFixedWfhDays
  ) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    // Next.js already URL-decodes dynamic route params.
    if (hasActive) {
      await setCrewMemberActive(params.email, body.active as boolean);
    }
    let member = null;
    if (hasStartDate) {
      member = await setCrewMemberStartDate(params.email, body.startDate ?? null);
    }
    if (hasAdjustment) {
      member = await adjustCrewMemberPtoBalance(params.email, body.adjustBalanceDays as number);
    }
    if (hasLocation) {
      member = await setCrewMemberLocation(params.email, body.location as CrewLocation);
    }
    if (hasEmploymentType) {
      member = await setCrewMemberEmploymentType(params.email, body.employmentType as EmploymentType);
    }
    if (hasWeeklyHours) {
      member = await setCrewMemberWeeklyHours(params.email, body.weeklyContractedHours as number);
    }
    if (hasFixedWfhDays) {
      const existing = await getCrewMember(params.email);
      if (!existing) throw new Error(`No crew member found for email: ${params.email}`);

      const newDays = body.fixedWfhDays as WeekdayCode[];
      const oldDays = existing.fixedWfhDays;
      const daysToRemove = oldDays.filter((day) => !newDays.includes(day));
      const daysToAdd = newDays.filter((day) => !oldDays.includes(day));

      // Only touch the days that actually changed — deleting/recreating the whole
      // schedule on every click made even a single-day toggle do up to 10 Calendar
      // API round trips.
      await Promise.all(
        daysToRemove.map((day) => {
          const eventId = existing.fixedWfhCalendarEventIds[day];
          return eventId ? deleteCalendarEvent(eventId) : Promise.resolve();
        })
      );
      const addedEventIds = await Promise.all(
        daysToAdd.map(async (day) => [day, await createFixedWfhCalendarEvent({ employeeName: existing.name, day })] as const)
      );

      const nextEventIds: Partial<Record<WeekdayCode, string>> = {};
      for (const day of newDays) {
        if (!daysToAdd.includes(day)) {
          nextEventIds[day] = existing.fixedWfhCalendarEventIds[day];
        }
      }
      for (const [day, id] of addedEventIds) {
        nextEventIds[day] = id;
      }

      member = await setCrewMemberFixedWfh(params.email, newDays, nextEventIds);
    }
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 400 }
    );
  }
}
