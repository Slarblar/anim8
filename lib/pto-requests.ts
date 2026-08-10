import { customAlphabet } from 'nanoid';
import { getKv } from './kv';
import {
  canEditPtoRequest as canEditPtoRequestShared,
  isMakeupRequestLate,
  normalizeDayPortion,
  requestedWorkingDays,
  type DayPortion,
} from './pto-days';
import { studioTodayDateString } from './studio-date';

export type { DayPortion } from './pto-days';
export { countBusinessDays, isMakeupRequestLate, requestedWorkingDays } from './pto-days';

export type PtoRequestType = 'PTO' | 'WFH' | 'MAKEUP';
export type PtoRequestStatus = 'pending' | 'approved' | 'rejected';

export type PtoRequest = {
  id: string;
  employeeEmail: string;
  employeeName: string;
  type: PtoRequestType;
  /** YYYY-MM-DD, inclusive. For MAKEUP this is the make-up work day. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. For MAKEUP this matches startDate (single day). */
  endDate: string;
  /**
   * Full working day(s) vs a single half day.
   * Half-day requires startDate === endDate; older records default to full.
   * Make-up days are always a full single day.
   */
  dayPortion: DayPortion;
  /**
   * Day being supplemented (YYYY-MM-DD) — required for MAKEUP, null otherwise.
   * Documented on the request; does not affect PTO balance.
   */
  lostDate: string | null;
  note: string;
  status: PtoRequestStatus;
  calendarEventId?: string;
  createdAt: string;
  /** Set when the employee last edited and re-submitted for approval. */
  updatedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  /**
   * Secret bearer token that lets the "Approve" / "Reject" buttons in the
   * new-request email work without an admin login session — whoever holds
   * this exact string can decide this exact request, nothing else. Long
   * and unguessable (nanoid default alphabet, 32 chars ~190 bits), never
   * reused across requests, and only useful while status === 'pending'.
   */
  decisionToken: string;
};

const KEY_PREFIX = 'pto-request:';
const PENDING_INDEX_KEY = 'pto-request-index:pending';
const ALL_INDEX_KEY = 'pto-request-index:all';

const genId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);
const genToken = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  32
);

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function withDefaults(record: PtoRequest): PtoRequest {
  return {
    ...record,
    dayPortion: normalizeDayPortion(record.dayPortion),
    lostDate: record.lostDate ?? null,
  };
}

function assertValidDates(
  startDate: string,
  endDate: string,
  dayPortion: DayPortion,
  type: PtoRequestType,
  lostDate: string | null
): void {
  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required.');
  }
  if (endDate < startDate) {
    throw new Error('End date must be on or after the start date.');
  }
  if (dayPortion === 'half' && startDate !== endDate) {
    throw new Error('Half-day requests must be for a single date.');
  }
  if (type === 'MAKEUP') {
    if (!lostDate) {
      throw new Error('Make-up day requests must include the day being made up.');
    }
    if (startDate !== endDate) {
      throw new Error('Make-up day requests must be for a single make-up date.');
    }
  }
}

function normalizeRequestFields(input: {
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
}): { dayPortion: DayPortion; startDate: string; endDate: string; lostDate: string | null } {
  if (input.type === 'MAKEUP') {
    const day = input.startDate;
    const lostDate = input.lostDate?.trim() || null;
    assertValidDates(day, day, 'full', 'MAKEUP', lostDate);
    return { dayPortion: 'full', startDate: day, endDate: day, lostDate };
  }
  const dayPortion = normalizeDayPortion(input.dayPortion);
  assertValidDates(input.startDate, input.endDate, dayPortion, input.type, null);
  return {
    dayPortion,
    startDate: input.startDate,
    endDate: dayPortion === 'half' ? input.startDate : input.endDate,
    lostDate: null,
  };
}

/** True when the employee may still edit and re-submit this request. */
export function canEditPtoRequest(
  request: Pick<PtoRequest, 'status' | 'startDate' | 'endDate'>,
  today: string = studioTodayDateString()
): boolean {
  return canEditPtoRequestShared(request, today);
}

/** Late make-up notice — uses last edit time when present. */
export function requestIsMakeupLate(request: PtoRequest): boolean {
  return isMakeupRequestLate({
    type: request.type,
    makeupDate: request.startDate,
    submittedAt: request.updatedAt ?? request.createdAt,
  });
}

export async function createPtoRequest(input: {
  employeeEmail: string;
  employeeName: string;
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
}): Promise<PtoRequest> {
  const fields = normalizeRequestFields(input);

  const record: PtoRequest = {
    id: genId(),
    employeeEmail: input.employeeEmail.trim().toLowerCase(),
    employeeName: input.employeeName.trim(),
    type: input.type,
    startDate: fields.startDate,
    endDate: fields.endDate,
    dayPortion: fields.dayPortion,
    lostDate: fields.lostDate,
    note: input.note.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    decisionToken: genToken(),
  };

  const kv = getKv();
  await kv.set(keyFor(record.id), record);
  await kv.sadd(ALL_INDEX_KEY, record.id);
  await kv.sadd(PENDING_INDEX_KEY, record.id);
  return record;
}

/**
 * Edit an existing request and put it back into the pending queue.
 * Caller is responsible for restoring balance / deleting calendar when the
 * previous status was approved (see PATCH route).
 */
export async function updateAndResubmitPtoRequest(input: {
  id: string;
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
}): Promise<{ previous: PtoRequest; request: PtoRequest }> {
  const existing = await getPtoRequest(input.id);
  if (!existing) throw new Error('Request not found.');
  if (!canEditPtoRequest(existing)) {
    throw new Error('This request can no longer be edited.');
  }

  const fields = normalizeRequestFields(input);

  const record: PtoRequest = {
    ...existing,
    type: input.type,
    startDate: fields.startDate,
    endDate: fields.endDate,
    dayPortion: fields.dayPortion,
    lostDate: fields.lostDate,
    note: input.note.trim(),
    status: 'pending',
    updatedAt: new Date().toISOString(),
    decidedAt: undefined,
    decidedBy: undefined,
    decisionNote: undefined,
    calendarEventId: undefined,
    // New token so old approve/reject email links stop working.
    decisionToken: genToken(),
  };

  const kv = getKv();
  await kv.set(keyFor(record.id), record);
  await kv.sadd(PENDING_INDEX_KEY, record.id);
  return { previous: existing, request: record };
}

/**
 * Admin direct field update — keeps status (pending stays pending, approved stays
 * approved). Caller re-syncs calendar / balance when the previous status was approved.
 */
export async function adminUpdatePtoRequestFields(input: {
  id: string;
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
  /** When re-syncing an approved request after calendar recreate. */
  calendarEventId?: string | null;
}): Promise<{ previous: PtoRequest; request: PtoRequest }> {
  const existing = await getPtoRequest(input.id);
  if (!existing) throw new Error('Request not found.');

  const fields = normalizeRequestFields({
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    dayPortion: input.dayPortion,
    lostDate: input.lostDate !== undefined ? input.lostDate : existing.lostDate,
  });

  const record: PtoRequest = {
    ...existing,
    type: input.type,
    startDate: fields.startDate,
    endDate: fields.endDate,
    dayPortion: fields.dayPortion,
    lostDate: fields.lostDate,
    note: input.note.trim(),
    updatedAt: new Date().toISOString(),
    calendarEventId:
      input.calendarEventId === null
        ? undefined
        : input.calendarEventId !== undefined
          ? input.calendarEventId
          : existing.calendarEventId,
  };

  // Rejected → pending so the admin can approve the corrected request.
  if (existing.status === 'rejected') {
    record.status = 'pending';
    record.decidedAt = undefined;
    record.decidedBy = undefined;
    record.decisionNote = undefined;
    record.decisionToken = genToken();
    record.calendarEventId = undefined;
  }

  const kv = getKv();
  await kv.set(keyFor(record.id), record);
  if (record.status === 'pending') {
    await kv.sadd(PENDING_INDEX_KEY, record.id);
  }
  return { previous: existing, request: record };
}

export async function getPtoRequest(id: string): Promise<PtoRequest | null> {
  const record = await getKv().get<PtoRequest>(keyFor(id));
  return record ? withDefaults(record) : null;
}

async function hydrate(ids: string[]): Promise<PtoRequest[]> {
  if (ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => getPtoRequest(id)));
  return records.filter((record): record is PtoRequest => !!record);
}

export async function listPtoRequestsForEmployee(email: string): Promise<PtoRequest[]> {
  const ids = await getKv().smembers(ALL_INDEX_KEY);
  const records = await hydrate(ids);
  return records
    .filter((record) => record.employeeEmail === email.trim().toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listPendingPtoRequests(): Promise<PtoRequest[]> {
  const ids = await getKv().smembers(PENDING_INDEX_KEY);
  const records = await hydrate(ids);
  return records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Cheap count for nav badges — avoids hydrating every pending record. */
export async function countPendingPtoRequests(): Promise<number> {
  return getKv().scard(PENDING_INDEX_KEY);
}

export async function listAllPtoRequests(): Promise<PtoRequest[]> {
  const ids = await getKv().smembers(ALL_INDEX_KEY);
  const records = await hydrate(ids);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** True once the request's own end date is in the past (studio-local "today") — gates deletion so we never remove a still-relevant/active request. */
export function hasRequestDatePassed(
  request: Pick<PtoRequest, 'endDate'>,
  today: string = studioTodayDateString()
): boolean {
  return request.endDate < today;
}

/**
 * Housekeeping delete for old request records once their date range has
 * passed — doesn't touch the employee's PTO balance (that was already
 * deducted/restored at approval time, and this is just tidying up the
 * history list) but does clean up any calendar event so nothing dangles.
 */
export async function deletePtoRequest(id: string): Promise<PtoRequest> {
  const existing = await getPtoRequest(id);
  if (!existing) throw new Error('Request not found.');

  const kv = getKv();
  await kv.del(keyFor(id));
  await kv.srem(ALL_INDEX_KEY, id);
  await kv.srem(PENDING_INDEX_KEY, id);
  return existing;
}

export async function decidePtoRequest(input: {
  id: string;
  decision: 'approved' | 'rejected';
  decidedBy: string;
  calendarEventId?: string;
  decisionNote?: string;
}): Promise<PtoRequest> {
  const existing = await getPtoRequest(input.id);
  if (!existing) throw new Error('Request not found.');
  if (existing.status !== 'pending') throw new Error('Request has already been decided.');

  const record: PtoRequest = {
    ...existing,
    status: input.decision,
    decidedAt: new Date().toISOString(),
    decidedBy: input.decidedBy,
    calendarEventId: input.calendarEventId,
    decisionNote: input.decisionNote,
  };

  const kv = getKv();
  await kv.set(keyFor(input.id), record);
  await kv.srem(PENDING_INDEX_KEY, input.id);
  return record;
}

/** Convenience for callers that already have a request-shaped object. */
export function ptoDaysForRequest(
  request: Pick<PtoRequest, 'startDate' | 'endDate' | 'dayPortion' | 'type'>
): number {
  if (request.type !== 'PTO') return 0;
  return requestedWorkingDays(request.startDate, request.endDate, request.dayPortion);
}
