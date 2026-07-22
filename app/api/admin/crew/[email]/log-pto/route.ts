import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { adjustCrewMemberPtoBalance, getCrewMember } from '@/lib/crew-directory';
import { countBusinessDays, createPtoRequest, decidePtoRequest } from '@/lib/pto-requests';
import { createPtoCalendarEvent } from '@/lib/google-calendar';
import { notifyEmployeePtoDecision } from '@/lib/crew-notify';

type LogPtoBody = { date?: string; endDate?: string; note?: string };

/**
 * Admin shortcut to record a PTO day directly (e.g. backdating something an
 * employee forgot to submit, or a same-day emergency) — skips the normal
 * request step and goes straight to "approved", reusing the exact same
 * calendar-event + balance-deduction pipeline as a regular approval so the
 * end result is identical either way.
 */
export async function POST(req: NextRequest, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: LogPtoBody;
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
      type: 'PTO',
      startDate,
      endDate,
      note: body.note?.trim() || 'Logged directly by admin.',
    });

    let calendarEventId: string | undefined;
    let calendarError: string | null = null;
    try {
      calendarEventId = await createPtoCalendarEvent({
        type: 'PTO',
        employeeName: member.name,
        startDate,
        endDate,
        requestId: request.id,
        note: request.note,
      });
    } catch (err) {
      calendarError = err instanceof Error ? err.message : 'Failed to create the calendar event.';
    }

    let balanceError: string | null = null;
    try {
      const days = countBusinessDays(startDate, endDate);
      await adjustCrewMemberPtoBalance(member.email, -days);
    } catch (err) {
      balanceError = err instanceof Error ? err.message : 'Failed to update the PTO balance.';
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
      type: 'PTO',
      startDate,
      endDate,
      decision: 'approved',
      decisionNote: 'Logged directly by admin.',
    });

    const refreshedMember = await getCrewMember(member.email);
    return NextResponse.json({ request: updated, member: refreshedMember, calendarError, balanceError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to log PTO.' },
      { status: 400 }
    );
  }
}
