import 'server-only';
import { adjustCrewMemberPtoBalance } from './crew-directory';
import { createPtoCalendarEvent } from './google-calendar';
import { notifyEmployeePtoDecision } from './crew-notify';
import {
  decidePtoRequest,
  getPtoRequest,
  ptoDaysForRequest,
  type PtoRequest,
} from './pto-requests';

export class PtoDecisionError extends Error {}

/**
 * Approve or reject a pending PTO/WFH request — calendar event + balance
 * deduction on approval, employee notification either way. Shared by the
 * admin-authenticated PATCH route and the token-authenticated one-click
 * email links so both paths behave identically.
 */
export async function applyPtoDecision(input: {
  id: string;
  decision: 'approved' | 'rejected';
  decidedBy: string;
  note?: string;
}): Promise<{ request: PtoRequest; calendarError: string | null; balanceError: string | null }> {
  const existing = await getPtoRequest(input.id);
  if (!existing) throw new PtoDecisionError('Request not found.');
  if (existing.status !== 'pending') throw new PtoDecisionError('Request has already been decided.');

  let calendarEventId: string | undefined;
  let calendarError: string | null = null;
  let balanceError: string | null = null;

  if (input.decision === 'approved') {
    try {
      calendarEventId = await createPtoCalendarEvent({
        type: existing.type,
        employeeName: existing.employeeName,
        startDate: existing.startDate,
        endDate: existing.endDate,
        requestId: existing.id,
        note: existing.note,
        dayPortion: existing.dayPortion,
        lostDate: existing.lostDate,
      });
    } catch (err) {
      // Still record the approval — don't lose the decision if Calendar
      // creds aren't configured yet. Surface it so the admin can retry.
      calendarError = err instanceof Error ? err.message : 'Failed to create the calendar event.';
    }

    // Only PTO draws down the balance — WFH is unlimited (Handbook 3.1/3.7).
    if (existing.type === 'PTO') {
      try {
        const days = ptoDaysForRequest(existing);
        await adjustCrewMemberPtoBalance(existing.employeeEmail, -days);
      } catch (err) {
        balanceError = err instanceof Error ? err.message : 'Failed to update the PTO balance.';
      }
    }
  }

  const updated = await decidePtoRequest({
    id: input.id,
    decision: input.decision,
    decidedBy: input.decidedBy,
    calendarEventId,
    decisionNote: input.note,
  });

  await notifyEmployeePtoDecision({
    to: existing.employeeEmail,
    employeeName: existing.employeeName,
    type: existing.type,
    startDate: existing.startDate,
    endDate: existing.endDate,
    decision: input.decision,
    decisionNote: input.note,
    decidedAt: updated.decidedAt,
  });

  return { request: updated, calendarError, balanceError };
}
