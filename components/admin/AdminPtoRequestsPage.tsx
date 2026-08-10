'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DayPortion, PtoRequest } from '@/lib/pto-requests';
import { requestedWorkingDays } from '@/lib/pto-days';
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
  adminLabel,
} from './admin-ui';
import { AdminDatePicker } from './AdminDatePicker';

type EnrichedPtoRequest = PtoRequest & {
  employeeBalanceDays: number | null;
  requestedDays: number | null;
  isLate?: boolean;
};

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

function typeLabel(type: PtoRequest['type']): string {
  if (type === 'PTO') return 'Time off';
  if (type === 'WFH') return 'Work from home';
  return 'Make-up day';
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
  const [editing, setEditing] = useState(false);

  const [editType, setEditType] = useState<PtoRequest['type']>(request.type);
  const [editPortion, setEditPortion] = useState<DayPortion>(request.dayPortion ?? 'full');
  const [editStart, setEditStart] = useState(request.startDate);
  const [editEnd, setEditEnd] = useState(request.endDate);
  const [editLostDate, setEditLostDate] = useState(request.lostDate ?? '');
  const [editNote, setEditNote] = useState(request.note);

  const openEdit = useCallback(() => {
    setEditType(request.type);
    setEditPortion(request.dayPortion ?? 'full');
    setEditStart(request.startDate);
    setEditEnd(request.endDate);
    setEditLostDate(request.lostDate ?? '');
    setEditNote(request.note);
    setEditing(true);
    setError(null);
    setConfirmingDelete(false);
  }, [request]);

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

  const saveEdit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pto-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edit: true,
          type: editType,
          dayPortion: editType === 'MAKEUP' ? 'full' : editPortion,
          startDate: editStart,
          endDate: editType === 'MAKEUP' || editPortion === 'half' ? editStart : editEnd,
          note: editNote,
          lostDate: editType === 'MAKEUP' ? editLostDate || null : null,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        calendarError?: string | null;
        balanceError?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not update request.');
        return;
      }
      const issues = [data.calendarError, data.balanceError].filter(Boolean);
      if (issues.length > 0) {
        setError(`Saved, but: ${issues.join(' ')}`);
      }
      setEditing(false);
      onChanged();
    } catch {
      setError('Could not update request. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [request.id, editType, editPortion, editStart, editEnd, editLostDate, editNote, onChanged]);

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

  const editRequestedDays =
    editType === 'PTO' && editStart
      ? requestedWorkingDays(editStart, editPortion === 'half' ? editStart : editEnd, editPortion)
      : null;

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
            {typeLabel(request.type)}
            {request.dayPortion === 'half' ? ' · Half day' : ''} ·{' '}
            {formatRange(request.startDate, request.endDate)}
          </p>
          {request.type === 'MAKEUP' && request.lostDate ? (
            <p className="mt-1 text-xs text-text-muted">Making up for {request.lostDate}</p>
          ) : null}
          {request.type === 'PTO' && request.employeeBalanceDays !== null ? (
            <p className="mt-1 text-xs text-text-muted">
              Requesting {request.requestedDays} working day{request.requestedDays === 1 ? '' : 's'} ·
              Balance: {request.employeeBalanceDays} day{request.employeeBalanceDays === 1 ? '' : 's'}
            </p>
          ) : null}
          {request.note ? <p className="mt-1 text-xs text-text-muted">{request.note}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={request.status} />
          {request.isLate ? (
            <span className="inline-flex items-center justify-center rounded-full border border-brand-pink/40 bg-brand-pink/15 px-2.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono">
              Late
            </span>
          ) : null}
        </div>
      </div>

      {overdraft ? (
        <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
          ⚠ This would take {request.employeeName.split(' ')[0]}&apos;s balance negative (
          {((request.employeeBalanceDays ?? 0) - (request.requestedDays ?? 0)).toFixed(1)} days) — approve
          only if that&apos;s expected.
        </p>
      ) : null}

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {editing ? (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div>
            <p className={adminLabel}>Type</p>
            <div className="flex flex-wrap gap-2">
              {(['PTO', 'WFH', 'MAKEUP'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEditType(option);
                    if (option === 'MAKEUP') {
                      setEditPortion('full');
                      setEditEnd(editStart);
                    }
                  }}
                  className={`min-w-[6.5rem] flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    editType === option
                      ? 'border-brand-cyan/50 bg-brand-cyan/15 text-brand-cyan'
                      : 'border-white/10 text-text-muted hover:border-white/25'
                  }`}
                >
                  {typeLabel(option)}
                </button>
              ))}
            </div>
          </div>

          {editType !== 'MAKEUP' ? (
          <div>
            <p className={adminLabel}>Duration</p>
            <div className="flex gap-2">
              {(['full', 'half'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEditPortion(option);
                    if (option === 'half') setEditEnd(editStart);
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    editPortion === option
                      ? 'border-brand-cyan/50 bg-brand-cyan/15 text-brand-cyan'
                      : 'border-white/10 text-text-muted hover:border-white/25'
                  }`}
                >
                  {option === 'full' ? 'Full day' : 'Half day'}
                </button>
              ))}
            </div>
          </div>
          ) : null}

          {editType === 'MAKEUP' ? (
            <div className="grid gap-3 min-[480px]:grid-cols-2">
              <div>
                <p className={adminLabel}>Day lost</p>
                <AdminDatePicker value={editLostDate} onChange={setEditLostDate} required />
              </div>
              <div>
                <p className={adminLabel}>Make-up day</p>
                <AdminDatePicker
                  value={editStart}
                  onChange={(next) => {
                    setEditStart(next);
                    setEditEnd(next);
                  }}
                  required
                />
              </div>
            </div>
          ) : (
          <div className={`grid gap-3 ${editPortion === 'half' ? '' : 'min-[480px]:grid-cols-2'}`}>
            <div>
              <p className={adminLabel}>{editPortion === 'half' ? 'Date' : 'Start date'}</p>
              <AdminDatePicker
                value={editStart}
                onChange={(next) => {
                  setEditStart(next);
                  if (editPortion === 'half' || !editEnd || editEnd < next) setEditEnd(next);
                }}
                required
              />
            </div>
            {editPortion === 'full' ? (
              <div>
                <p className={adminLabel}>End date</p>
                <AdminDatePicker
                  value={editEnd}
                  onChange={setEditEnd}
                  min={editStart || undefined}
                  required
                />
              </div>
            ) : null}
          </div>
          )}

          <div>
            <p className={adminLabel}>Note</p>
            <input
              className={adminInput}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Optional note"
              disabled={loading}
            />
          </div>

          {editRequestedDays !== null ? (
            <p className="text-xs text-text-muted">
              {editRequestedDays === 0.5
                ? 'Will use ½ working day of PTO if approved'
                : `Will use ${editRequestedDays} working day${editRequestedDays === 1 ? '' : 's'} of PTO if approved`}
            </p>
          ) : null}

          {request.status === 'approved' ? (
            <p className="text-xs text-text-muted">
              Saving updates the calendar event and PTO balance to match these dates.
            </p>
          ) : null}
          {request.status === 'rejected' ? (
            <p className="text-xs text-brand-cyan">
              Saving moves this back to pending so you can approve the corrected request.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminBtnPrimary} disabled={loading} onClick={saveEdit}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className={adminBtnGhost}
              disabled={loading}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
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

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/5 pt-2">
            <button
              type="button"
              className="text-[11px] font-medium text-brand-cyan underline-offset-2 transition hover:underline"
              onClick={openEdit}
              disabled={loading}
            >
              Edit
            </button>
            {confirmingDelete ? (
              <>
                <span className="text-[11px] text-text-muted">
                  Delete request + calendar event? Crew will need to re-submit.
                </span>
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
                disabled={loading}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
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
          <p className={`${adminBody} mt-1`}>
            Approving creates the calendar event automatically. Edit or delete anytime — delete removes
            the calendar entry too.
          </p>
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
