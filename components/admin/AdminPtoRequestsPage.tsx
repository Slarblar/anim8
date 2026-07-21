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

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

function StatusBadge({ status }: { status: PtoRequest['status'] }) {
  if (status === 'approved') return <span className={adminBadgeApproved}>Approved</span>;
  if (status === 'rejected') return <span className={adminBadgeRejected}>Rejected</span>;
  return <span className={adminBadgePending}>Pending</span>;
}

function RequestRow({ request, onChanged }: { request: PtoRequest; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

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
        const data = (await res.json()) as { error?: string; calendarError?: string | null };
        if (!res.ok) {
          setError(data.error ?? 'Action failed.');
          return;
        }
        if (data.calendarError) {
          setError(`Approved, but the calendar event failed: ${data.calendarError}`);
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

  return (
    <li className={`${adminCard} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">
            {request.employeeName}
            <span className="ml-2 text-xs font-normal text-text-muted">{request.employeeEmail}</span>
          </p>
          <p className={adminBody}>
            {request.type === 'PTO' ? 'Time off' : 'Work from home'} ·{' '}
            {formatRange(request.startDate, request.endDate)}
          </p>
          {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
        </div>
        <StatusBadge status={request.status} />
      </div>

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
    </li>
  );
}

export function AdminPtoRequestsPage() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [requests, setRequests] = useState<PtoRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/pto-requests?status=${filter}`);
      const data = (await res.json()) as { requests?: PtoRequest[]; error?: string };
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
