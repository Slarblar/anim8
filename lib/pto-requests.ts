import { customAlphabet } from 'nanoid';
import { getKv } from './kv';
import { studioTodayDateString } from './studio-date';

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
  note: string;
  status: PtoRequestStatus;
  calendarEventId?: string;
  createdAt: string;
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

/** Mon–Fri only, inclusive — matches the Handbook's "working days" definition. */
export function countBusinessDays(startDate: string, endDate: string): number {
  let count = 0;
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export async function createPtoRequest(input: {
  employeeEmail: string;
  employeeName: string;
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
}): Promise<PtoRequest> {
  if (!input.startDate || !input.endDate) {
    throw new Error('Start and end dates are required.');
  }
  if (input.endDate < input.startDate) {
    throw new Error('End date must be on or after the start date.');
  }

  const record: PtoRequest = {
    id: genId(),
    employeeEmail: input.employeeEmail.trim().toLowerCase(),
    employeeName: input.employeeName.trim(),
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
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

export async function getPtoRequest(id: string): Promise<PtoRequest | null> {
  return getKv().get<PtoRequest>(keyFor(id));
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
