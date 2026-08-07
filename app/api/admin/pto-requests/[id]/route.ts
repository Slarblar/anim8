import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { adjustCrewMemberPtoBalance } from '@/lib/crew-directory';
import { createPtoCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { normalizeDayPortion } from '@/lib/pto-days';
import { applyPtoDecision, PtoDecisionError } from '@/lib/pto-decision';
import {
  adminUpdatePtoRequestFields,
  deletePtoRequest,
  getPtoRequest,
  ptoDaysForRequest,
  type DayPortion,
  type PtoRequestType,
} from '@/lib/pto-requests';

type DecisionBody = { decision?: 'approved' | 'rejected'; note?: string };

type EditBody = {
  type?: PtoRequestType;
  startDate?: string;
  endDate?: string;
  note?: string;
  dayPortion?: DayPortion;
  /** When set, this PATCH is an admin field edit (not an approve/reject). */
  edit?: boolean;
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: DecisionBody & EditBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Field edit (dates / type / note / half-day) — distinct from approve/reject.
  if (body.edit === true) {
    return patchAdminEdit(params.id, body, admin.email);
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

async function patchAdminEdit(id: string, body: EditBody, _adminEmail: string) {
  const existing = await getPtoRequest(id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const type = body.type ?? existing.type;
  if (type !== 'PTO' && type !== 'WFH') {
    return NextResponse.json({ error: 'Type must be PTO or WFH.' }, { status: 400 });
  }
  const startDate = body.startDate ?? existing.startDate;
  const endDate = body.endDate ?? existing.endDate;
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
  }

  let calendarError: string | null = null;
  let balanceError: string | null = null;

  try {
    // Unwind prior approval before rewriting fields / calendar.
    if (existing.status === 'approved') {
      if (existing.calendarEventId) {
        try {
          await deleteCalendarEvent(existing.calendarEventId);
        } catch (err) {
          calendarError =
            err instanceof Error ? err.message : 'Failed to remove the previous calendar event.';
        }
      }
      if (existing.type === 'PTO') {
        const days = ptoDaysForRequest(existing);
        if (days > 0) {
          try {
            await adjustCrewMemberPtoBalance(existing.employeeEmail, days);
          } catch (err) {
            balanceError = err instanceof Error ? err.message : 'Failed to restore the prior PTO balance.';
          }
        }
      }
    }

    const dayPortion = normalizeDayPortion(body.dayPortion ?? existing.dayPortion);
    const { request: updated } = await adminUpdatePtoRequestFields({
      id,
      type,
      startDate,
      endDate,
      note: typeof body.note === 'string' ? body.note : existing.note,
      dayPortion,
      calendarEventId: existing.status === 'approved' ? null : undefined,
    });

    // Re-apply calendar + balance when the request remains (or becomes) approved.
    // Rejected edits flip to pending via adminUpdatePtoRequestFields — no calendar yet.
    if (updated.status === 'approved') {
      let calendarEventId: string | undefined;
      try {
        calendarEventId = await createPtoCalendarEvent({
          type: updated.type,
          employeeName: updated.employeeName,
          startDate: updated.startDate,
          endDate: updated.endDate,
          requestId: updated.id,
          note: updated.note,
          dayPortion: updated.dayPortion,
        });
      } catch (err) {
        calendarError =
          err instanceof Error ? err.message : 'Failed to create the updated calendar event.';
      }

      if (updated.type === 'PTO') {
        const days = ptoDaysForRequest(updated);
        if (days > 0) {
          try {
            await adjustCrewMemberPtoBalance(updated.employeeEmail, -days);
          } catch (err) {
            balanceError = err instanceof Error ? err.message : 'Failed to update the PTO balance.';
          }
        }
      }

      const { request } = await adminUpdatePtoRequestFields({
        id: updated.id,
        type: updated.type,
        startDate: updated.startDate,
        endDate: updated.endDate,
        note: updated.note,
        dayPortion: updated.dayPortion,
        calendarEventId: calendarEventId ?? null,
      });

      return NextResponse.json({ request, calendarError, balanceError });
    }

    return NextResponse.json({ request: updated, calendarError, balanceError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update request.' },
      { status: 400 }
    );
  }
}

/**
 * Admin delete — allowed any time. Removes the calendar event and restores
 * PTO balance if the request was approved, so the crew member can re-submit.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await getPtoRequest(params.id);
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  try {
    if (existing.calendarEventId) {
      try {
        await deleteCalendarEvent(existing.calendarEventId);
      } catch {
        // Still delete the portal record — dangling calendar can be cleaned up manually.
      }
    }
    if (existing.status === 'approved' && existing.type === 'PTO') {
      const days = ptoDaysForRequest(existing);
      if (days > 0) {
        await adjustCrewMemberPtoBalance(existing.employeeEmail, days);
      }
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
