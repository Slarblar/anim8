'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminAlertError,
  adminBtnPrimary,
  adminCard,
  adminInput,
  adminLabel,
} from '@/components/admin/admin-ui';

/** Client-side mirror of lib/pto-requests.ts `countBusinessDays` — kept
 * separate (rather than imported) so this client component doesn't pull
 * server-only KV code into the browser bundle. */
function countBusinessDays(startDate: string, endDate: string): number {
  let count = 0;
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return 0;
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export function NewPtoRequestForm() {
  const router = useRouter();
  const [type, setType] = useState<'PTO' | 'WFH'>('PTO');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceDays, setBalanceDays] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/crew/pto-balance')
      .then((res) => res.json())
      .then((data: { balanceDays: number | null }) => setBalanceDays(data.balanceDays ?? null))
      .catch(() => setBalanceDays(null));
  }, []);

  const requestedDays = useMemo(
    () => (startDate && endDate ? countBusinessDays(startDate, endDate) : 0),
    [startDate, endDate]
  );
  const overdraft = type === 'PTO' && balanceDays !== null && requestedDays > balanceDays;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/crew/pto-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, startDate, endDate, note }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Could not submit request.');
          return;
        }
        router.push('/crew/pto');
      } catch {
        setError('Could not submit request. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [type, startDate, endDate, note, router]
  );

  return (
    <form onSubmit={handleSubmit} className={`${adminCard} space-y-4`}>
      <div>
        <label className={adminLabel}>Type</label>
        <div className="flex gap-2">
          {(['PTO', 'WFH'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition ${
                type === option
                  ? 'border-brand-cyan/50 bg-brand-cyan/15 text-brand-cyan'
                  : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-white/25'
              }`}
            >
              {option === 'PTO' ? 'Time off' : 'Work from home'}
            </button>
          ))}
        </div>
        {type === 'PTO' ? (
          <p className="mt-2 text-xs text-text-muted">
            {balanceDays !== null ? (
              <>
                You have <span className="font-bold text-brand-cyan">{balanceDays}</span> day
                {balanceDays === 1 ? '' : 's'} available
              </>
            ) : (
              'Loading your available balance…'
            )}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <div>
          <label className={adminLabel} htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            className={adminInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            className={adminInput}
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={adminLabel} htmlFor="note">
          Note (optional)
        </label>
        <textarea
          id="note"
          className={`${adminInput} min-h-24 resize-none`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything your admin should know…"
        />
      </div>

      {type === 'PTO' && startDate && endDate ? (
        <p className="text-xs text-text-muted">
          Requesting <span className="font-bold text-white">{requestedDays}</span> working day
          {requestedDays === 1 ? '' : 's'}
        </p>
      ) : null}

      {overdraft ? (
        <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
          ⚠ This request is for {requestedDays} days, more than your {balanceDays} day
          {balanceDays === 1 ? '' : 's'} available. You can still submit it — your admin will review it — but it
          will take your balance negative if approved as-is.
        </p>
      ) : null}

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <button type="submit" className={`${adminBtnPrimary} w-full`} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
