import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { getCrewMember } from '@/lib/crew-directory';
import { createPtoRequest, decidePtoRequest } from '@/lib/pto-requests';
import { createPtoCalendarEvent } from '@/lib/google-calendar';
import { notifyEmployeePtoDecision } from '@/lib/crew-notify';

type LogWfhBody = { date?: string; endDate?: string; note?: string };

/**
 * Admin shortcut to record an ad-hoc WFH day (sickness, errand, weather, etc.)
 * — skips the request step, creates the calendar event, and does NOT touch
 * the PTO balance (Handbook: WFH is unlimited / separate from annual leave).
 */
export async function POST(req: NextRequest, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: LogWfhBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.date) {
    return NextResponse.json({ error: 'A date is required.' }, { status: 400 });
  }
  const startDate = body.date;
  const endDate = body.endDate || body.date;
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after the start date.' }, { status: 400 });
  }

  const member = await getCrewMember(params.email);
  if (!member) return NextResponse.json({ error: 'Crew member not found.' }, { status: 404 });

  try {
    const request = await createPtoRequest({
      employeeEmail: member.email,
      employeeName: member.name,
      type: 'WFH',
      startDate,
      endDate,
      note: body.note?.trim() || 'Logged directly by admin.',
    });

    let calendarEventId: string | undefined;
    let calendarError: string | null = null;
    try {
      calendarEventId = await createPtoCalendarEvent({
        type: 'WFH',
        employeeName: member.name,
        startDate,
        endDate,
        requestId: request.id,
        note: request.note,
      });
    } catch (err) {
      calendarError = err instanceof Error ? err.message : 'Failed to create the calendar event.';
    }

    const updated = await decidePtoRequest({
      id: request.id,
      decision: 'approved',
      decidedBy: admin.email,
      calendarEventId,
      decisionNote: 'Logged directly by admin.',
    });

    await notifyEmployeePtoDecision({
      to: member.email,
      employeeName: member.name,
      type: 'WFH',
      startDate,
      endDate,
      decision: 'approved',
      decisionNote: 'Logged directly by admin.',
    });

    const refreshedMember = await getCrewMember(member.email);
    return NextResponse.json({ request: updated, member: refreshedMember, calendarError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to log WFH.' },
      { status: 400 }
    );
  }
}
