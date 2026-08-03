'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PtoRequest } from '@/lib/pto-requests';
import {
  adminAlertError,
  adminBadgeApproved,
  adminBadgePending,
  adminBadgeRejected,
  adminBody,
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminCard,
  adminInput,
} from './admin-ui';

type EnrichedPtoRequest = PtoRequest & {
  employeeBalanceDays: number | null;
  requestedDays: number | null;
};

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

/** Server re-validates against studio-local "today" — this just gates the button, so a plain local-date check is fine. */
function hasPassed(endDate: string): boolean {
  return endDate < new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: PtoRequest['status'] }) {
  if (status === 'approved') return <span className={adminBadgeApproved}>Approved</span>;
  if (status === 'rejected') return <span className={adminBadgeRejected}>Rejected</span>;
  return <span className={adminBadgePending}>Pending</span>;
}

function RequestRow({
  request,
  onChanged,
}: {
  request: EnrichedPtoRequest;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const runDelete = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pto-requests/${request.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Delete failed.');
        return;
      }
      onChanged();
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [request.id, onChanged]);

  const decide = useCallback(
    async (decision: 'approved' | 'rejected') => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/pto-requests/${request.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, note: note || undefined }),
        });
        const data = (await res.json()) as {
          error?: string;
          calendarError?: string | null;
          balanceError?: string | null;
        };
        if (!res.ok) {
          setError(data.error ?? 'Action failed.');
          // Someone else (another admin, or the same admin via the email
          // link) already decided this one — refetch so the row flips
          // from stale Approve/Reject buttons to the real, current
          // "Approved/Rejected by ..." state instead of leaving dead
          // buttons up that will just 400 again.
          if (res.status === 400 && data.error === 'Request has already been decided.') {
            onChanged();
          }
          return;
        }
        const issues = [data.calendarError, data.balanceError].filter(Boolean);
        if (issues.length > 0) {
          setError(`Decision saved, but: ${issues.join(' ')}`);
        }
        onChanged();
      } catch {
        setError('Action failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [request.id, note, onChanged]
  );

  const overdraft =
    request.status === 'pending' &&
    request.employeeBalanceDays !== null &&
    request.requestedDays !== null &&
    request.requestedDays > request.employeeBalanceDays;

  return (
    <li className={`${adminCard} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">
            {request.employeeName}
            <span className="ml-2 text-xs font-normal text-text-muted">{request.employeeEmail}</span>
          </p>
          <p className={adminBody}>
            {request.type === 'PTO' ? 'Time off' : 'Work from home'}
            {request.dayPortion === 'half' ? ' · Half day' : ''} ·{' '}
            {formatRange(request.startDate, request.endDate)}
          </p>
          {request.type === 'PTO' && request.employeeBalanceDays !== null ? (
            <p className="mt-1 text-xs text-text-muted">
              Requesting {request.requestedDays} working day{request.requestedDays === 1 ? '' : 's'} ·
              Balance: {request.employeeBalanceDays} day{request.employeeBalanceDays === 1 ? '' : 's'}
            </p>
          ) : null}
          {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
        </div>
        <StatusBadge status={request.status} />
      </div>

      {overdraft ? (
        <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
          ⚠ This would take {request.employeeName.split(' ')[0]}&apos;s balance negative (
          {((request.employeeBalanceDays ?? 0) - (request.requestedDays ?? 0)).toFixed(1)} days) — approve
          only if that&apos;s expected.
        </p>
      ) : null}

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {request.status === 'pending' ? (
        <div className="space-y-2">
          {showNote ? (
            <input
              className={adminInput}
              placeholder="Optional note to the employee"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminBtnPrimary}
              disabled={loading}
              onClick={() => decide('approved')}
            >
              Approve
            </button>
            <button
              type="button"
              className={adminBtnDanger}
              disabled={loading}
              onClick={() => decide('rejected')}
            >
              Reject
            </button>
            <button type="button" className={adminBtnGhost} onClick={() => setShowNote((v) => !v)}>
              {showNote ? 'Hide note' : 'Add note'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.decidedBy}
          {request.decisionNote ? ` — "${request.decisionNote}"` : ''}
        </p>
      )}

      {hasPassed(request.endDate) ? (
        <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2">
          {confirmingDelete ? (
            <>
              <span className="text-[11px] text-text-muted">Delete this record? This cannot be undone.</span>
              <button type="button" className={adminBtnDanger} disabled={loading} onClick={runDelete}>
                {loading ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                className={adminBtnGhost}
                disabled={loading}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-[11px] font-medium text-text-muted/60 underline-offset-2 transition hover:text-brand-pink hover:underline"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function AdminPtoRequestsPage() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [requests, setRequests] = useState<EnrichedPtoRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/pto-requests?status=${filter}`);
      const data = (await res.json()) as { requests?: EnrichedPtoRequest[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load requests.');
        return;
      }
      setRequests(data.requests ?? []);
    } catch {
      setError('Could not load requests.');
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">PTO requests</h1>
          <p className={`${adminBody} mt-1`}>Approving creates the calendar event automatically.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={filter === 'pending' ? adminBtnPrimary : adminBtnGhost}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            type="button"
            className={filter === 'all' ? adminBtnPrimary : adminBtnGhost}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {requests === null ? (
        <p className={adminBody}>Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className={adminBody}>
          {filter === 'pending' ? 'No pending requests.' : 'No requests yet.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
