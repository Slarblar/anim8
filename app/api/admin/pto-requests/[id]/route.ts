import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { decidePtoRequest, getPtoRequest } from '@/lib/pto-requests';
import { createPtoCalendarEvent } from '@/lib/google-calendar';
import { notifyEmployeePtoDecision } from '@/lib/crew-notify';

type PatchBody = { decision?: 'approved' | 'rejected'; note?: string };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return NextResponse.json({ error: 'Decision must be approved or rejected.' }, { status: 400 });
  }

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'Request has already been decided.' }, { status: 400 });
  }

  try {
    let calendarEventId: string | undefined;
    let calendarError: string | null = null;

    if (body.decision === 'approved') {
      try {
        calendarEventId = await createPtoCalendarEvent({
          type: existing.type,
          employeeName: existing.employeeName,
          startDate: existing.startDate,
          endDate: existing.endDate,
          requestId: existing.id,
          note: existing.note,
        });
      } catch (err) {
        // Still record the approval — don't lose the decision if Calendar
        // creds aren't configured yet. Surface it so the admin can retry.
        calendarError =
          err instanceof Error ? err.message : 'Failed to create the calendar event.';
      }
    }

    const updated = await decidePtoRequest({
      id: params.id,
      decision: body.decision,
      decidedBy: admin.email,
      calendarEventId,
      decisionNote: body.note,
    });

    await notifyEmployeePtoDecision({
      to: existing.employeeEmail,
      employeeName: existing.employeeName,
      type: existing.type,
      startDate: existing.startDate,
      endDate: existing.endDate,
      decision: body.decision,
      decisionNote: body.note,
    });

    return NextResponse.json({ request: updated, calendarError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 500 }
    );
  }
}
