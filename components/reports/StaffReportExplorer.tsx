'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CrewReportData } from '@/lib/crew-report';
import {
  buildStaffKpiCsv,
  describeStaffKpiPeriod,
  parseStaffKpiPeriod,
  performanceBandLabel,
  selectableStaffKpiMonths,
  staffKpiBonusLabel,
  staffKpiCsvFilename,
  staffKpiPeriodNote,
  staffKpiSlice,
  type StaffKpiExportPerson,
  type StaffKpiPersonSlice,
} from '@/lib/kpi-shared';
import {
  adminBody,
  adminBtnPrimary,
  adminBtnSecondary,
  adminSelect,
  adminSelectChevronStyle,
} from '@/components/admin/admin-ui';
import { CrewReportView, PrintReportButton } from '@/components/reports/CrewReportView';
import {
  buildStaffAttendanceCsv,
  formatAttendanceDays,
  staffAttendanceCsvFilename,
  staffAttendanceSlice,
  STAFF_ATTENDANCE_NOTE,
  type StaffAttendanceExportPerson,
  type StaffAttendanceSlice,
} from '@/lib/staff-attendance';

const EMPLOYMENT: Record<CrewReportData['member']['employmentType'], string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
};

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Denver',
  });
}

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toExportPerson(report: CrewReportData): StaffKpiExportPerson {
  return {
    name: report.member.name,
    email: report.member.email,
    role: report.member.role,
    level: report.member.level,
    employment: EMPLOYMENT[report.member.employmentType],
    location: report.member.location === 'US' ? 'US' : 'VN',
    fteRatio: report.kpi?.fteRatio ?? null,
    kpi: report.kpi,
  };
}

function toAttendanceExport(report: CrewReportData, slice: StaffAttendanceSlice): StaffAttendanceExportPerson {
  return {
    name: report.member.name,
    email: report.member.email,
    role: report.member.role,
    level: report.member.level,
    employment: EMPLOYMENT[report.member.employmentType],
    location: report.member.location === 'US' ? 'US' : 'VN',
    slice,
  };
}

function periodButtonClass(active: boolean): string {
  return active ? adminBtnPrimary : adminBtnSecondary;
}

export type StaffReportView = 'kpi' | 'attendance';

function reportUrl(period: string, view: StaffReportView): string {
  const params = new URLSearchParams();
  params.set('period', period);
  if (view === 'attendance') params.set('view', 'attendance');
  return `/admin/crew/report?${params}`;
}

export function StaffReportExplorer({
  initialPeriod,
  initialView,
  reports,
  generatedAt,
}: {
  initialPeriod: string;
  initialView: StaffReportView;
  reports: CrewReportData[];
  generatedAt: string;
}) {
  const [periodParam, setPeriodParam] = useState(initialPeriod);
  const [view, setView] = useState<StaffReportView>(initialView);
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const period = parseStaffKpiPeriod(periodParam, now);
  const kpiWindow = describeStaffKpiPeriod(period, now);
  const months = selectableStaffKpiMonths(
    reports.flatMap((report) => report.kpi?.monthly.map((month) => month.month) ?? []),
    now,
    period.kind === 'month' ? period.month : undefined
  );
  const slices = reports.map((report) => ({
    report,
    slice: staffKpiSlice(report.kpi, kpiWindow, now),
  }));
  const attendanceSlices = reports.map((report) => ({
    report,
    slice: staffAttendanceSlice(report.attendance.months, report.pto.approvedTimeOff, kpiWindow),
  }));
  const csv =
    view === 'attendance'
      ? buildStaffAttendanceCsv(
          attendanceSlices.map(({ report, slice }) => toAttendanceExport(report, slice)),
          kpiWindow.label
        )
      : buildStaffKpiCsv(reports.map(toExportPerson), kpiWindow, now);
  const csvFilename =
    view === 'attendance' ? staffAttendanceCsvFilename(kpiWindow) : staffKpiCsvFilename(kpiWindow, now);

  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      setPeriodParam(params.get('period') ?? initialPeriod);
      setView(params.get('view') === 'attendance' ? 'attendance' : 'kpi');
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initialPeriod]);

  function selectPeriod(next: string) {
    if (next === periodParam) return;
    setPeriodParam(next);
    window.history.pushState(null, '', reportUrl(next, view));
  }

  function selectView(next: StaffReportView) {
    if (next === view) return;
    setView(next);
    window.history.pushState(null, '', reportUrl(periodParam, next));
  }

  return (
    <div className="space-y-8">
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
              <Link href="/admin/crew" className="transition hover:text-brand-cyan">
                Crew directory
              </Link>
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Staff report</h1>
            <p className={`${adminBody} mt-1`}>
              {reports.length} active crew on this report · {view === 'attendance' ? 'Attendance' : 'KPI'} ·{' '}
              {kpiWindow.label}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Test accounts, US-based crew, and anyone marked exempt in the crew directory are left off.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => downloadCsv(csvFilename, csv)}
            >
              Download CSV
            </button>
            <PrintReportButton />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report type">
          <button
            type="button"
            className={periodButtonClass(view === 'kpi')}
            aria-pressed={view === 'kpi'}
            onClick={() => selectView('kpi')}
          >
            KPI
          </button>
          <button
            type="button"
            className={periodButtonClass(view === 'attendance')}
            aria-pressed={view === 'attendance'}
            onClick={() => selectView('attendance')}
          >
            Attendance
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report period">
          <button
            type="button"
            className={periodButtonClass(period.kind === 'mtd')}
            aria-pressed={period.kind === 'mtd'}
            title="Month to date"
            onClick={() => selectPeriod('mtd')}
          >
            MTD
          </button>
          <div className="w-44">
            <select
              aria-label="Select month"
              className={`${adminSelect} ${period.kind === 'month' ? 'ring-2 ring-brand-cyan/40' : ''}`}
              style={adminSelectChevronStyle}
              value={period.kind === 'month' ? period.month : ''}
              onChange={(event) => {
                if (event.target.value) selectPeriod(event.target.value);
              }}
            >
              {period.kind === 'month' ? null : <option value="">Select month</option>}
              {months.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={periodButtonClass(period.kind === 'ytd')}
            aria-pressed={period.kind === 'ytd'}
            title="Year to date"
            onClick={() => selectPeriod('ytd')}
          >
            YTD
          </button>
          <button
            type="button"
            className={periodButtonClass(period.kind === 'all')}
            aria-pressed={period.kind === 'all'}
            title="Every scored month on record"
            onClick={() => selectPeriod('all')}
          >
            All time
          </button>
        </div>
        <p className="text-xs text-text-muted">
          {view === 'attendance'
            ? 'CSV is one row per person per month, with tardy marks, missing days, and approved PTO days.'
            : 'CSV is one row per person per month. Bonus eligibility is Good or above (55+) on a closed month.'}
        </p>
      </div>

      <section className="crew-report-summary space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-cyan print:text-black">
            Anim-8 <span className="text-white print:text-black">— {view === 'attendance' ? 'Staff attendance' : 'Staff KPI'}</span>
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white print:text-black">
            {kpiWindow.label}
          </h2>
          <p className={`${adminBody} mt-1 print:text-black/70`}>
            {view === 'attendance' ? STAFF_ATTENDANCE_NOTE : staffKpiPeriodNote(kpiWindow)}
          </p>
          <p className="mt-1 text-[11px] text-text-muted/70 print:text-black/50">
            {reports.length} active crew · Generated {formatGeneratedAt(generatedAt)}
          </p>
        </header>

        {reports.length === 0 ? (
          <p className={adminBody}>No active crew members to report.</p>
        ) : view === 'attendance' ? (
          <AttendanceSummaryTable rows={attendanceSlices} />
        ) : (
          <KpiSummaryTable singleMonth={kpiWindow.singleMonth} rows={slices} />
        )}
      </section>

      {reports.length > 0 ? (
        <div className="crew-report-batch space-y-16">
          {view === 'attendance'
            ? attendanceSlices.map(({ report, slice }) => (
                <CrewReportView
                  key={report.member.email}
                  data={report}
                  embedded
                  reportMode="attendance"
                  attendancePeriod={{ window: kpiWindow, slice }}
                />
              ))
            : slices.map(({ report, slice }) => (
                <CrewReportView
                  key={report.member.email}
                  data={report}
                  embedded
                  kpiPeriod={{ window: kpiWindow, slice }}
                />
              ))}
        </div>
      ) : null}
    </div>
  );
}

function KpiSummaryTable({
  singleMonth,
  rows,
}: {
  singleMonth: boolean;
  rows: { report: CrewReportData; slice: StaffKpiPersonSlice }[];
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm print:min-w-0">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-muted print:border-black/20 print:text-black/50">
            <th className="py-2 pr-3">Person</th>
            <th className="py-2 pr-3">FTE</th>
            <th className="py-2 pr-3">{singleMonth ? 'Score' : 'Total points'}</th>
            <th className="py-2 pr-3">{singleMonth ? 'Band' : 'Months scored'}</th>
            <th className="py-2 pr-3">Tasks</th>
            <th className="py-2 pr-3">{singleMonth ? 'Bonus' : 'Avg month'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ report, slice }) => {
            const member = report.member;
            const detail = [
              EMPLOYMENT[member.employmentType],
              member.location === 'US' ? 'US' : 'VN',
              member.level,
              member.role,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <tr
                key={member.email}
                className="border-b border-white/5 align-top text-text-muted print:border-black/10 print:text-black/80"
              >
                <td className="py-2 pr-3">
                  <p className="font-semibold text-white print:text-black">{member.name}</p>
                  <p className="text-[11px] text-text-muted print:text-black/60">{member.email}</p>
                  {detail ? <p className="text-[11px] text-text-muted print:text-black/60">{detail}</p> : null}
                </td>
                <td className="py-2 pr-3 font-mono">{report.kpi ? report.kpi.fteRatio.toFixed(2) : '—'}</td>
                <td className="py-2 pr-3 font-mono text-white print:text-black">{slice.score.toFixed(1)}</td>
                <td className="py-2 pr-3">
                  {singleMonth
                    ? slice.band
                      ? performanceBandLabel(slice.band)
                      : 'No score'
                    : slice.monthsScored}
                </td>
                <td className="py-2 pr-3 font-mono">{slice.tasks == null ? '—' : slice.tasks}</td>
                <td className="py-2 pr-3 font-mono">
                  {singleMonth
                    ? staffKpiBonusLabel(slice.bonus ?? 'none')
                    : slice.averageScored != null
                      ? slice.averageScored.toFixed(1)
                      : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceSummaryTable({
  rows,
}: {
  rows: { report: CrewReportData; slice: StaffAttendanceSlice }[];
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm print:min-w-0">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-muted print:border-black/20 print:text-black/50">
            <th className="py-2 pr-3">Person</th>
            <th className="py-2 pr-3">Tardy</th>
            <th className="py-2 pr-3">Missing days</th>
            <th className="py-2 pr-3">PTO days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ report, slice }) => {
            const member = report.member;
            const detail = [
              EMPLOYMENT[member.employmentType],
              member.location === 'US' ? 'US' : 'VN',
              member.level,
              member.role,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <tr
                key={member.email}
                className="border-b border-white/5 align-top text-text-muted print:border-black/10 print:text-black/80"
              >
                <td className="py-2 pr-3">
                  <p className="font-semibold text-white print:text-black">{member.name}</p>
                  <p className="text-[11px] text-text-muted print:text-black/60">{member.email}</p>
                  {detail ? <p className="text-[11px] text-text-muted print:text-black/60">{detail}</p> : null}
                </td>
                <td className="py-2 pr-3 font-mono text-white print:text-black">{slice.late}</td>
                <td className="py-2 pr-3 font-mono text-white print:text-black">{slice.absent}</td>
                <td className="py-2 pr-3 font-mono">{formatAttendanceDays(slice.ptoDays)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
