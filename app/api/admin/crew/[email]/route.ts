import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import {
  adjustCrewMemberPtoBalance,
  getCrewMember,
  setCrewMemberActive,
  setCrewMemberFixedWfh,
  setCrewMemberLocation,
  setCrewMemberStartDate,
  type CrewLocation,
  type WeekdayCode,
} from '@/lib/crew-directory';
import { createFixedWfhCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

const WEEKDAY_CODES: WeekdayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

type PatchBody = {
  active?: boolean;
  adjustBalanceDays?: number;
  startDate?: string | null;
  location?: CrewLocation;
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
  const hasFixedWfhDays =
    Array.isArray(body.fixedWfhDays) &&
    body.fixedWfhDays.every((day) => WEEKDAY_CODES.includes(day));

  if (!hasActive && !hasAdjustment && !hasStartDate && !hasLocation && !hasFixedWfhDays) {
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
    if (hasFixedWfhDays) {
      const existing = await getCrewMember(params.email);
      if (!existing) throw new Error(`No crew member found for email: ${params.email}`);

      const days = body.fixedWfhDays as WeekdayCode[];
      // Tear down the old recurring series (if any) and recreate one per selected day —
      // simplest way to keep the calendar in sync with whatever the admin just clicked.
      await Promise.all(existing.fixedWfhCalendarEventIds.map((id) => deleteCalendarEvent(id)));
      const newEventIds = await Promise.all(
        days.map((day) => createFixedWfhCalendarEvent({ employeeName: existing.name, day }))
      );
      member = await setCrewMemberFixedWfh(params.email, days, newEventIds);
    }
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 400 }
    );
  }
}
