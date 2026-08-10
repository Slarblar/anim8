import { NextRequest, NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { adjustCrewMemberPtoBalance } from '@/lib/crew-directory';
import { getDemoPtoRequests, isCrewDemoUser, isDemoPtoRequestId } from '@/lib/crew-demo';
import { notifyAdminsNewPtoRequest } from '@/lib/crew-notify';
import { deleteCalendarEvent } from '@/lib/google-calendar';
import { normalizeDayPortion } from '@/lib/pto-days';
import {
  canEditPtoRequest,
  deletePtoRequest,
  getPtoRequest,
  hasRequestDatePassed,
  ptoDaysForRequest,
  updateAndResubmitPtoRequest,
  type DayPortion,
  type PtoRequestType,
} from '@/lib/pto-requests';

/** Load one of the signed-in employee's requests (for the edit form). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    const demo = getDemoPtoRequests(session.email).find((r) => r.id === params.id);
    if (!demo) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    return NextResponse.json({ request: demo });
  }

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (existing.employeeEmail !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'You can only view your own requests.' }, { status: 403 });
  }
  return NextResponse.json({ request: existing });
}

type PatchBody = {
  type?: PtoRequestType;
  startDate?: string;
  endDate?: string;
  note?: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
};

/** Edit + re-submit for approval (notifies admins; unwinds prior approval if needed). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email) || isDemoPtoRequestId(params.id)) {
    return NextResponse.json(
      { error: 'Demo preview — sample requests cannot be edited.' },
      { status: 400 }
    );
  }

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (existing.employeeEmail !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'You can only edit your own requests.' }, { status: 403 });
  }
  if (!canEditPtoRequest(existing)) {
    return NextResponse.json({ error: 'This request can no longer be edited.' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const type = body.type ?? existing.type;
  if (type !== 'PTO' && type !== 'WFH' && type !== 'MAKEUP') {
    return NextResponse.json({ error: 'Type must be PTO, WFH, or MAKEUP.' }, { status: 400 });
  }
  const startDate = body.startDate ?? existing.startDate;
  const endDate = body.endDate ?? existing.endDate;
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
  }
  const lostDate =
    type === 'MAKEUP'
      ? (typeof body.lostDate === 'string' ? body.lostDate : existing.lostDate)
      : null;
  if (type === 'MAKEUP' && !lostDate) {
    return NextResponse.json(
      { error: 'Make-up day requests must include the day being made up.' },
      { status: 400 }
    );
  }

  try {
    // Unwind a prior approval before resetting to pending.
    if (existing.status === 'approved') {
      if (existing.calendarEventId) {
        try {
          await deleteCalendarEvent(existing.calendarEventId);
        } catch {
          // Still allow the edit — dangling calendar events can be cleaned up later.
        }
      }
      if (existing.type === 'PTO') {
        const days = ptoDaysForRequest(existing);
        if (days > 0) {
          await adjustCrewMemberPtoBalance(existing.employeeEmail, days);
        }
      }
    }

    const { request } = await updateAndResubmitPtoRequest({
      id: params.id,
      type,
      startDate,
      endDate: type === 'MAKEUP' ? startDate : endDate,
      note: typeof body.note === 'string' ? body.note : existing.note,
      dayPortion: type === 'MAKEUP' ? 'full' : normalizeDayPortion(body.dayPortion ?? existing.dayPortion),
      lostDate,
    });

    try {
      await notifyAdminsNewPtoRequest(request, { isEdit: true });
    } catch {
      // Request was saved — don't fail the edit on email.
    }

    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update request.' },
      { status: 400 }
    );
  }
}

/** Crew self-service delete — only their own requests, only once the date range has passed. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email) || isDemoPtoRequestId(params.id)) {
    return NextResponse.json(
      { error: 'Demo preview — sample requests cannot be deleted.' },
      { status: 400 }
    );
  }

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  if (existing.employeeEmail !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'You can only delete your own requests.' }, { status: 403 });
  }
  if (!hasRequestDatePassed(existing)) {
    return NextResponse.json(
      { error: 'This request can only be deleted once its date has passed.' },
      { status: 400 }
    );
  }

  try {
    if (existing.calendarEventId) {
      await deleteCalendarEvent(existing.calendarEventId);
    }
    await deletePtoRequest(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed.' },
      { status: 400 }
    );
  }
}
