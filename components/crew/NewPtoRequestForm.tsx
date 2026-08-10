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
import {
  isMakeupRequestLate,
  MAKEUP_NOTICE_DAYS,
  normalizeDayPortion,
  requestedWorkingDays,
  type DayPortion,
} from '@/lib/pto-days';
import type { PtoRequest, PtoRequestType } from '@/lib/pto-requests';
import { studioTodayDateString } from '@/lib/studio-date';
import { HoverTranslate } from './HoverTranslate';

type FormInitial = {
  type: PtoRequestType;
  startDate: string;
  endDate: string;
  note: string;
  dayPortion: DayPortion;
  lostDate: string | null;
};

const TYPE_OPTIONS: PtoRequestType[] = ['PTO', 'WFH', 'MAKEUP'];

function typeLabelEn(type: PtoRequestType): string {
  if (type === 'PTO') return crewT.en.ptoPage.typePto;
  if (type === 'WFH') return crewT.en.ptoPage.typeWfh;
  return crewT.en.ptoPage.typeMakeup;
}

function typeLabelVn(type: PtoRequestType): string {
  if (type === 'PTO') return crewT.vn.ptoPage.typePto;
  if (type === 'WFH') return crewT.vn.ptoPage.typeWfh;
  return crewT.vn.ptoPage.typeMakeup;
}

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
  const [type, setType] = useState<PtoRequestType>(initial?.type ?? 'PTO');
  const [dayPortion, setDayPortion] = useState<DayPortion>(initial?.dayPortion ?? 'full');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [lostDate, setLostDate] = useState(initial?.lostDate ?? '');
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

  const selectType = useCallback((next: PtoRequestType) => {
    setType(next);
    if (next === 'MAKEUP') {
      setDayPortion('full');
      if (startDate) setEndDate(startDate);
    }
  }, [startDate]);

  const setStart = useCallback(
    (next: string) => {
      setStartDate(next);
      if (type === 'MAKEUP' || dayPortion === 'half' || !endDate || endDate < next) {
        setEndDate(next);
      }
    },
    [type, dayPortion, endDate]
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

  const effectiveEnd = type === 'MAKEUP' || dayPortion === 'half' ? startDate : endDate;
  const requestedDays = useMemo(
    () =>
      type === 'PTO' && startDate && effectiveEnd
        ? requestedWorkingDays(startDate, effectiveEnd, dayPortion)
        : 0,
    [type, startDate, effectiveEnd, dayPortion]
  );
  const overdraft = type === 'PTO' && balanceDays !== null && requestedDays > balanceDays;
  const makeupLatePreview =
    type === 'MAKEUP' &&
    !!startDate &&
    isMakeupRequestLate({
      type: 'MAKEUP',
      makeupDate: startDate,
      submittedAt: studioTodayDateString(),
    });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      const payload = {
        type,
        startDate,
        endDate: type === 'MAKEUP' || dayPortion === 'half' ? startDate : endDate,
        note,
        dayPortion: type === 'MAKEUP' ? 'full' : dayPortion,
        lostDate: type === 'MAKEUP' ? lostDate || null : null,
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
      lostDate,
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
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectType(option)}
              className={`min-w-[7.5rem] flex-1 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                type === option
                  ? 'border-brand-cyan/50 bg-brand-cyan/15 text-brand-cyan'
                  : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-white/25'
              }`}
            >
              <HoverTranslate en={typeLabelEn(option)} vn={typeLabelVn(option)} />
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
        {type === 'MAKEUP' ? (
          <p className="mt-2 rounded-lg border border-brand-cyan/25 bg-brand-cyan/10 px-3.5 py-2.5 text-xs text-brand-cyan">
            <HoverTranslate
              en={crewT.en.ptoPage.formMakeupInOfficeAdvice}
              vn={crewT.vn.ptoPage.formMakeupInOfficeAdvice}
            />
          </p>
        ) : null}
      </div>

      {type !== 'MAKEUP' ? (
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
      ) : null}

      {type === 'MAKEUP' ? (
        <div className="grid gap-4 min-[480px]:grid-cols-2">
          <div>
            <label className={adminLabel} htmlFor="lostDate">
              <HoverTranslate en={crewT.en.ptoPage.formLostDate} vn={crewT.vn.ptoPage.formLostDate} />
            </label>
            <AdminDatePicker
              id="lostDate"
              value={lostDate}
              onChange={setLostDate}
              placeholder="PTO day"
              required
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="makeupDate">
              <HoverTranslate en={crewT.en.ptoPage.formMakeupDate} vn={crewT.vn.ptoPage.formMakeupDate} />
            </label>
            <AdminDatePicker
              id="makeupDate"
              value={startDate}
              onChange={setStart}
              placeholder="Make-up day"
              required
            />
          </div>
        </div>
      ) : (
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
      )}

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

      {makeupLatePreview ? (
        <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
          <HoverTranslate
            en={crewT.en.ptoPage.formMakeupLateWarning(MAKEUP_NOTICE_DAYS)}
            vn={crewT.vn.ptoPage.formMakeupLateWarning(MAKEUP_NOTICE_DAYS)}
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
    lostDate: request.lostDate ?? null,
  };
}
