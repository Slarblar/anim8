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
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { HoverTranslate } from './HoverTranslate';

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
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
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
          setError(data.error ?? c.formSubmitError);
          return;
        }
        router.push('/crew/pto');
      } catch {
        setError(c.formSubmitErrorRetry);
      } finally {
        setSubmitting(false);
      }
    },
    [type, startDate, endDate, note, router, c.formSubmitError, c.formSubmitErrorRetry]
  );

  return (
    <form onSubmit={handleSubmit} className={`${adminCard} space-y-4`}>
      <div>
        <label className={adminLabel}>
          <HoverTranslate en={crewT.en.ptoPage.formTypeLabel} vn={crewT.vn.ptoPage.formTypeLabel} />
        </label>
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
              <HoverTranslate
                en={option === 'PTO' ? crewT.en.ptoPage.typePto : crewT.en.ptoPage.typeWfh}
                vn={option === 'PTO' ? crewT.vn.ptoPage.typePto : crewT.vn.ptoPage.typeWfh}
              />
            </button>
          ))}
        </div>
        {type === 'PTO' ? (
          <p className="mt-2 text-xs text-text-muted">
            {balanceDays !== null ? (
              <HoverTranslate
                en={crewT.en.ptoPage.formHaveAvailable(balanceDays)}
                vn={crewT.vn.ptoPage.formHaveAvailable(balanceDays)}
              />
            ) : (
              <HoverTranslate en={crewT.en.ptoPage.formLoadingBalance} vn={crewT.vn.ptoPage.formLoadingBalance} />
            )}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <div>
          <label className={adminLabel} htmlFor="startDate">
            <HoverTranslate en={crewT.en.ptoPage.formStartDate} vn={crewT.vn.ptoPage.formStartDate} />
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
            <HoverTranslate en={crewT.en.ptoPage.formEndDate} vn={crewT.vn.ptoPage.formEndDate} />
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
          <HoverTranslate en={crewT.en.ptoPage.formNoteOptional} vn={crewT.vn.ptoPage.formNoteOptional} />
        </label>
        <textarea
          id="note"
          className={`${adminInput} min-h-24 resize-none`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={lang === 'vn' ? crewT.vn.ptoPage.formNotePlaceholder : crewT.en.ptoPage.formNotePlaceholder}
        />
      </div>

      {type === 'PTO' && startDate && endDate ? (
        <p className="text-xs text-text-muted">
          <HoverTranslate
            en={crewT.en.ptoPage.formRequestingDays(requestedDays)}
            vn={crewT.vn.ptoPage.formRequestingDays(requestedDays)}
          />
        </p>
      ) : null}

      {overdraft ? (
        <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
          <HoverTranslate
            en={crewT.en.ptoPage.formOverdraftWarning(requestedDays, balanceDays ?? 0)}
            vn={crewT.vn.ptoPage.formOverdraftWarning(requestedDays, balanceDays ?? 0)}
          />
        </p>
      ) : null}

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <button type="submit" className={`${adminBtnPrimary} w-full`} disabled={submitting}>
        <HoverTranslate
          en={submitting ? crewT.en.ptoPage.formSubmitting : crewT.en.ptoPage.formSubmit}
          vn={submitting ? crewT.vn.ptoPage.formSubmitting : crewT.vn.ptoPage.formSubmit}
        />
      </button>
    </form>
  );
}
