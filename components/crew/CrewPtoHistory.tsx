'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PtoRequest } from '@/lib/pto-requests';
import {
  adminAlertError,
  adminBadgeApproved,
  adminBadgePending,
  adminBadgeRejected,
  adminBody,
  adminCard,
} from '@/components/admin/admin-ui';

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

function StatusBadge({ status }: { status: PtoRequest['status'] }) {
  if (status === 'approved') return <span className={adminBadgeApproved}>Approved</span>;
  if (status === 'rejected') return <span className={adminBadgeRejected}>Rejected</span>;
  return <span className={adminBadgePending}>Pending</span>;
}

export function CrewPtoHistory() {
  const [requests, setRequests] = useState<PtoRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/crew/pto-requests');
      const data = (await res.json()) as { requests?: PtoRequest[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load your requests.');
        return;
      }
      setRequests(data.requests ?? []);
    } catch {
      setError('Could not load your requests.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className={adminAlertError}>{error}</p>;
  if (requests === null) return <p className={adminBody}>Loading your requests…</p>;
  if (requests.length === 0) return <p className={adminBody}>You haven&apos;t submitted any requests yet.</p>;

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className={`${adminCard} flex flex-wrap items-start justify-between gap-3`}>
          <div className="min-w-0">
            <p className="font-bold text-white">
              {request.type === 'PTO' ? 'Time off' : 'Work from home'}
            </p>
            <p className={adminBody}>{formatRange(request.startDate, request.endDate)}</p>
            {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
            {request.status === 'rejected' && request.decisionNote ? (
              <p className="mt-1 text-xs text-brand-pink">Note: {request.decisionNote}</p>
            ) : null}
          </div>
          <StatusBadge status={request.status} />
        </li>
      ))}
    </ul>
  );
}
