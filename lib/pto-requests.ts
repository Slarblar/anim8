import { customAlphabet } from 'nanoid';
import { getKv } from './kv';
import {
  canEditPtoRequest as canEditPtoRequestShared,
  normalizeDayPortion,
  requestedWorkingDays,
  type DayPortion,
} from './pto-days';
import { studioTodayDateString } from './studio-date';

export type { DayPortion } from './pto-days';
export { countBusinessDays, requestedWorkingDays } from './pto-days';

export type PtoRequestType = 'PTO' | 'WFH';
export type PtoRequestStatus = 'pending' | 'approved' | 'rejected';

export type PtoRequest = {
  id: string;
  employeeEmail: string;
  employeeName: string;
  type: PtoRequestType;
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. */
  endDate: string;
  /**
   * Full working day(s) vs a single half day.
   * Half-day requires startDate === endDate; older records default to full.
   */
  dayPortion: DayPortion;
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
  };
}

function assertValidDates(startDate: string, endDate: string, dayPortion: DayPortion): void {
  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required.');
  }
  if (endDate < startDate) {
    throw new Error('End date must be on or after the start date.');
  }
  if (dayPortion === 'half' && startDate !== endDate) {
    throw new Error('Half-day requests must be for a single date.');
  }
}

/** True when the employee may still edit and re-submit this request. */
export function canEditPtoRequest(
  request: Pick<PtoRequest, 'status' | 'startDate' | 'endDate'>,
  today: string = studioTodayDateString()
): boolean {
  return canEditPtoRequestShared(request, today);
}

export async function createPtoRequest(input: {
  employeeEmail: string;
  employeeName: string;
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
  dayPortion?: DayPortion;
}): Promise<PtoRequest> {
  const dayPortion = normalizeDayPortion(input.dayPortion);
  assertValidDates(input.startDate, input.endDate, dayPortion);

  const record: PtoRequest = {
    id: genId(),
    employeeEmail: input.employeeEmail.trim().toLowerCase(),
    employeeName: input.employeeName.trim(),
    type: input.type,
    startDate: input.startDate,
    endDate: dayPortion === 'half' ? input.startDate : input.endDate,
    dayPortion,
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
}): Promise<{ previous: PtoRequest; request: PtoRequest }> {
  const existing = await getPtoRequest(input.id);
  if (!existing) throw new Error('Request not found.');
  if (!canEditPtoRequest(existing)) {
    throw new Error('This request can no longer be edited.');
  }

  const dayPortion = normalizeDayPortion(input.dayPortion);
  assertValidDates(input.startDate, input.endDate, dayPortion);

  const record: PtoRequest = {
    ...existing,
    type: input.type,
    startDate: input.startDate,
    endDate: dayPortion === 'half' ? input.startDate : input.endDate,
    dayPortion,
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
