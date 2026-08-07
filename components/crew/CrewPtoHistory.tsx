'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { canEditPtoRequest } from '@/lib/pto-days';
import type { PtoRequest } from '@/lib/pto-requests';
import { studioTodayDateString } from '@/lib/studio-date';
import {
  adminAlertError,
  adminBadgeApproved,
  adminBadgePending,
  adminBadgeRejected,
  adminBody,
  adminBtnDanger,
  adminBtnGhost,
  adminCard,
} from '@/components/admin/admin-ui';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { HoverTranslate } from './HoverTranslate';

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

/** Server re-validates against studio-local "today" — this just gates the button, so a plain local-date check is fine. */
function hasPassed(endDate: string): boolean {
  return endDate < new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: PtoRequest['status'] }) {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
  if (status === 'approved') return <span className={adminBadgeApproved}>{c.statusApproved}</span>;
  if (status === 'rejected') return <span className={adminBadgeRejected}>{c.statusRejected}</span>;
  return <span className={adminBadgePending}>{c.statusPending}</span>;
}

function HistoryRow({ request, onDeleted }: { request: PtoRequest; onDeleted: () => void }) {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canEditPtoRequest(request, studioTodayDateString());

  const runDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/crew/pto-requests/${request.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? c.deleteError);
        return;
      }
      onDeleted();
    } catch {
      setError(c.deleteError);
    } finally {
      setDeleting(false);
    }
  }, [request.id, onDeleted, c.deleteError]);

  return (
    <li className={`${adminCard} flex flex-wrap items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="font-bold text-white">
          <HoverTranslate
            en={request.type === 'PTO' ? crewT.en.ptoPage.typePto : crewT.en.ptoPage.typeWfh}
            vn={request.type === 'PTO' ? crewT.vn.ptoPage.typePto : crewT.vn.ptoPage.typeWfh}
          />
          {request.dayPortion === 'half' ? (
            <span className="ml-2 text-xs font-normal text-text-muted">
              ·{' '}
              <HoverTranslate en={crewT.en.ptoPage.halfDayLabel} vn={crewT.vn.ptoPage.halfDayLabel} />
            </span>
          ) : null}
        </p>
        <p className={adminBody}>{formatRange(request.startDate, request.endDate)}</p>
        {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
        {request.status === 'rejected' && request.decisionNote ? (
          <p className="mt-1 text-xs text-brand-pink">
            <HoverTranslate en={crewT.en.ptoPage.noteLabel} vn={crewT.vn.ptoPage.noteLabel} />
            {`: ${request.decisionNote}`}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-brand-pink">{error}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge status={request.status} />
        <div className="flex items-center gap-2">
          {editable ? (
            <Link
              href={`/crew/pto/${encodeURIComponent(request.id)}/edit`}
              className={`${adminBtnGhost} !px-2.5 !py-1 !text-[11px]`}
            >
              {c.editButton}
            </Link>
          ) : null}
          {hasPassed(request.endDate) ? (
            confirming ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted">{c.deleteConfirm}</span>
                <button
                  type="button"
                  className={adminBtnDanger}
                  disabled={deleting}
                  onClick={runDelete}
                >
                  {c.deleteConfirmYes}
                </button>
                <button type="button" className={adminBtnGhost} disabled={deleting} onClick={() => setConfirming(false)}>
                  {c.deleteConfirmCancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="text-[11px] font-medium text-text-muted/60 underline-offset-2 transition hover:text-brand-pink hover:underline"
                onClick={() => setConfirming(true)}
              >
                {c.deleteButton}
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
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
        <HistoryRow key={request.id} request={request} onDeleted={load} />
      ))}
    </ul>
  );
}
