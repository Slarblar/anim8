import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { deletePtoRequest, getPtoRequest, hasRequestDatePassed } from '@/lib/pto-requests';
import { applyPtoDecision, PtoDecisionError } from '@/lib/pto-decision';
import { deleteCalendarEvent } from '@/lib/google-calendar';

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
    const { request, calendarError, balanceError } = await applyPtoDecision({
      id: params.id,
      decision: body.decision,
      decidedBy: admin.email,
      note: body.note,
    });

    return NextResponse.json({ request, calendarError, balanceError });
  } catch (err) {
    const status = err instanceof PtoDecisionError ? 400 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Action failed.' }, { status });
  }
}

/** Admin housekeeping delete — any employee's request, once its date range has passed. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
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
