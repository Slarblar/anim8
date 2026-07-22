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
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { HoverTranslate } from './HoverTranslate';

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

function StatusBadge({ status }: { status: PtoRequest['status'] }) {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
  if (status === 'approved') return <span className={adminBadgeApproved}>{c.statusApproved}</span>;
  if (status === 'rejected') return <span className={adminBadgeRejected}>{c.statusRejected}</span>;
  return <span className={adminBadgePending}>{c.statusPending}</span>;
}

export function CrewPtoHistory() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
  const [requests, setRequests] = useState<PtoRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/crew/pto-requests');
      const data = (await res.json()) as { requests?: PtoRequest[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? c.historyLoadError);
        return;
      }
      setRequests(data.requests ?? []);
    } catch {
      setError(c.historyLoadError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className={adminAlertError}>{error}</p>;
  if (requests === null) return <p className={adminBody}>{c.historyLoading}</p>;
  if (requests.length === 0) return <p className={adminBody}>{c.historyEmpty}</p>;

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className={`${adminCard} flex flex-wrap items-start justify-between gap-3`}>
          <div className="min-w-0">
            <p className="font-bold text-white">
              <HoverTranslate
                en={request.type === 'PTO' ? crewT.en.ptoPage.typePto : crewT.en.ptoPage.typeWfh}
                vn={request.type === 'PTO' ? crewT.vn.ptoPage.typePto : crewT.vn.ptoPage.typeWfh}
              />
            </p>
            <p className={adminBody}>{formatRange(request.startDate, request.endDate)}</p>
            {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
            {request.status === 'rejected' && request.decisionNote ? (
              <p className="mt-1 text-xs text-brand-pink">
                <HoverTranslate en={crewT.en.ptoPage.noteLabel} vn={crewT.vn.ptoPage.noteLabel} />
                {`: ${request.decisionNote}`}
              </p>
            ) : null}
          </div>
          <StatusBadge status={request.status} />
        </li>
      ))}
    </ul>
  );
}
