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
import { AdminDatePicker } from '@/components/admin/AdminDatePicker';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { normalizeDayPortion, requestedWorkingDays, type DayPortion } from '@/lib/pto-days';
import type { PtoRequest } from '@/lib/pto-requests';
import { HoverTranslate } from './HoverTranslate';

type FormInitial = {
  type: 'PTO' | 'WFH';
  startDate: string;
  endDate: string;
  note: string;
  dayPortion: DayPortion;
};

export function NewPtoRequestForm({
  mode = 'create',
  requestId,
  initial,
}: {
  mode?: 'create' | 'edit';
  requestId?: string;
  initial?: FormInitial;
}) {
  const router = useRouter();
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
  const [type, setType] = useState<'PTO' | 'WFH'>(initial?.type ?? 'PTO');
  const [dayPortion, setDayPortion] = useState<DayPortion>(initial?.dayPortion ?? 'full');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceDays, setBalanceDays] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/crew/pto-balance')
      .then((res) => res.json())
      .then((data: { balanceDays: number | null }) => setBalanceDays(data.balanceDays ?? null))
      .catch(() => setBalanceDays(null));
  }, []);

  const setStart = useCallback(
    (next: string) => {
      setStartDate(next);
      if (dayPortion === 'half' || !endDate || endDate < next) {
        setEndDate(next);
      }
    },
    [dayPortion, endDate]
  );

  const setPortion = useCallback(
    (next: DayPortion) => {
      setDayPortion(next);
      if (next === 'half' && startDate) {
        setEndDate(startDate);
      }
    },
    [startDate]
  );

  const effectiveEnd = dayPortion === 'half' ? startDate : endDate;
  const requestedDays = useMemo(
    () =>
      startDate && effectiveEnd
        ? requestedWorkingDays(startDate, effectiveEnd, dayPortion)
        : 0,
    [startDate, effectiveEnd, dayPortion]
  );
  const overdraft = type === 'PTO' && balanceDays !== null && requestedDays > balanceDays;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      const payload = {
        type,
        startDate,
        endDate: dayPortion === 'half' ? startDate : endDate,
        note,
        dayPortion,
      };

      try {
        const res = await fetch(
          mode === 'edit' && requestId
            ? `/api/crew/pto-requests/${encodeURIComponent(requestId)}`
            : '/api/crew/pto-requests',
          {
            method: mode === 'edit' ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? (mode === 'edit' ? c.formEditError : c.formSubmitError));
          return;
        }
        router.push('/crew/pto');
      } catch {
        setError(mode === 'edit' ? c.formEditErrorRetry : c.formSubmitErrorRetry);
      } finally {
        setSubmitting(false);
      }
    },
    [
      type,
      startDate,
      endDate,
      note,
      dayPortion,
      mode,
      requestId,
      router,
      c.formSubmitError,
      c.formSubmitErrorRetry,
      c.formEditError,
      c.formEditErrorRetry,
    ]
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

      <div>
        <label className={adminLabel}>
          <HoverTranslate en={crewT.en.ptoPage.formDurationLabel} vn={crewT.vn.ptoPage.formDurationLabel} />
        </label>
        <div className="flex gap-2">
          {(['full', 'half'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPortion(option)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition ${
                dayPortion === option
                  ? 'border-brand-cyan/50 bg-brand-cyan/15 text-brand-cyan'
                  : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-white/25'
              }`}
            >
              <HoverTranslate
                en={option === 'full' ? crewT.en.ptoPage.formFullDay : crewT.en.ptoPage.formHalfDay}
                vn={option === 'full' ? crewT.vn.ptoPage.formFullDay : crewT.vn.ptoPage.formHalfDay}
              />
            </button>
          ))}
        </div>
        {dayPortion === 'half' ? (
          <p className="mt-2 text-xs text-text-muted">
            <HoverTranslate en={crewT.en.ptoPage.formHalfDayHint} vn={crewT.vn.ptoPage.formHalfDayHint} />
          </p>
        ) : null}
      </div>

      <div className={`grid gap-4 ${dayPortion === 'half' ? '' : 'min-[480px]:grid-cols-2'}`}>
        <div>
          <label className={adminLabel} htmlFor="startDate">
            <HoverTranslate
              en={dayPortion === 'half' ? crewT.en.ptoPage.formDate : crewT.en.ptoPage.formStartDate}
              vn={dayPortion === 'half' ? crewT.vn.ptoPage.formDate : crewT.vn.ptoPage.formStartDate}
            />
          </label>
          <AdminDatePicker
            id="startDate"
            value={startDate}
            onChange={setStart}
            placeholder={dayPortion === 'half' ? 'Date' : 'Start date'}
            required
          />
        </div>
        {dayPortion === 'full' ? (
          <div>
            <label className={adminLabel} htmlFor="endDate">
              <HoverTranslate en={crewT.en.ptoPage.formEndDate} vn={crewT.vn.ptoPage.formEndDate} />
            </label>
            <AdminDatePicker
              id="endDate"
              value={endDate}
              onChange={setEndDate}
              min={startDate || undefined}
              placeholder="End date"
              required
            />
          </div>
        ) : null}
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

      {type === 'PTO' && startDate && effectiveEnd ? (
        <p className="text-xs text-text-muted">
          <HoverTranslate
            en={crewT.en.ptoPage.formRequestingDays(requestedDays)}
            vn={crewT.vn.ptoPage.formRequestingDays(requestedDays)}
          />
        </p>
      ) : null}

      {mode === 'edit' ? (
        <p className="rounded-lg border border-brand-cyan/25 bg-brand-cyan/10 px-3.5 py-2.5 text-xs text-brand-cyan">
          <HoverTranslate en={crewT.en.ptoPage.formEditResubmitNote} vn={crewT.vn.ptoPage.formEditResubmitNote} />
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
          en={
            submitting
              ? mode === 'edit'
                ? crewT.en.ptoPage.formUpdating
                : crewT.en.ptoPage.formSubmitting
              : mode === 'edit'
                ? crewT.en.ptoPage.formUpdate
                : crewT.en.ptoPage.formSubmit
          }
          vn={
            submitting
              ? mode === 'edit'
                ? crewT.vn.ptoPage.formUpdating
                : crewT.vn.ptoPage.formSubmitting
              : mode === 'edit'
                ? crewT.vn.ptoPage.formUpdate
                : crewT.vn.ptoPage.formSubmit
          }
        />
      </button>
    </form>
  );
}

export function initialFromRequest(request: PtoRequest): FormInitial {
  return {
    type: request.type,
    startDate: request.startDate,
    endDate: request.endDate,
    note: request.note,
    dayPortion: normalizeDayPortion(request.dayPortion),
  };
}
