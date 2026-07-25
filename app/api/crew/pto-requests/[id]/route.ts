import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { deletePtoRequest, getPtoRequest, hasRequestDatePassed } from '@/lib/pto-requests';
import { deleteCalendarEvent } from '@/lib/google-calendar';

/** Crew self-service delete — only their own requests, only once the date range has passed. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
