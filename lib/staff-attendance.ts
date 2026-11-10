import type { DayPortion } from './pto-days';
import { requestedWorkingDays } from './pto-days';
import type { StaffKpiWindow } from './kpi-shared';

export type AttendanceMarkMonth = {
  month: string;
  late: number;
  absent: number;
};

export type AttendanceTimeOffInput = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  dayPortion?: DayPortion | null;
  note?: string;
};

export type StaffAttendanceMonth = {
  month: string;
  label: string;
  late: number;
  absent: number;
  ptoDays: number;
};

export type StaffAttendanceTimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  note: string;
};

export type StaffAttendanceSlice = {
  /** Meeting late marks in the window. */
  late: number;
  /** Meeting absent marks in the window — unplanned missing days. */
  absent: number;
  /** Approved PTO working days that fall inside the window. */
  ptoDays: number;
  months: StaffAttendanceMonth[];
  timeOff: StaffAttendanceTimeOff[];
};

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const anchor = new Date(Date.UTC(year, month - 1, 15));
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(anchor);
}

function lastDayOfMonth(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${key}-${String(last).padStart(2, '0')}`;
}

function monthsTouched(startDate: string, endDate: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    return [];
  }
  const keys: string[] = [];
  let year = Number(startDate.slice(0, 4));
  let month = Number(startDate.slice(5, 7));
  const endKey = endDate.slice(0, 7);
  while (keys.length < 240) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    keys.push(key);
    if (key >= endKey) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

/** Approved PTO working days of this request that fall inside one calendar month. */
export function ptoDaysInMonth(request: AttendanceTimeOffInput, monthKey: string): number {
  if (request.type !== 'PTO' || request.status !== 'approved') return 0;
  if (!MONTH_KEY.test(monthKey)) return 0;
  const from = request.startDate > `${monthKey}-01` ? request.startDate : `${monthKey}-01`;
  const monthEnd = lastDayOfMonth(monthKey);
  const to = request.endDate < monthEnd ? request.endDate : monthEnd;
  if (from > to) return 0;
  return requestedWorkingDays(from, to, request.dayPortion ?? 'full');
}

function ptoDaysInKeys(request: AttendanceTimeOffInput, keys: string[]): number {
  return keys.reduce((sum, key) => sum + ptoDaysInMonth(request, key), 0);
}

export function staffAttendanceSlice(
  marks: AttendanceMarkMonth[],
  timeOff: AttendanceTimeOffInput[],
  window: StaffKpiWindow
): StaffAttendanceSlice {
  const byMonth = new Map(marks.filter((row) => MONTH_KEY.test(row.month)).map((row) => [row.month, row]));
  let keys: string[];
  if (window.monthKeys) {
    keys = window.monthKeys;
  } else {
    const touched = new Set<string>(byMonth.keys());
    for (const request of timeOff) {
      if (request.type !== 'PTO' || request.status !== 'approved') continue;
      for (const key of monthsTouched(request.startDate, request.endDate)) touched.add(key);
    }
    keys = [...touched].sort();
  }

  const months: StaffAttendanceMonth[] = keys.map((key) => {
    const mark = byMonth.get(key);
    const ptoDays = timeOff.reduce((sum, request) => sum + ptoDaysInMonth(request, key), 0);
    return {
      month: key,
      label: monthLabel(key),
      late: mark?.late ?? 0,
      absent: mark?.absent ?? 0,
      ptoDays,
    };
  });

  const approved = timeOff
    .map((request) => ({
      id: request.id,
      startDate: request.startDate,
      endDate: request.endDate,
      days: ptoDaysInKeys(request, keys),
      note: request.note ?? '',
    }))
    .filter((request) => request.days > 0)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return {
    late: months.reduce((sum, month) => sum + month.late, 0),
    absent: months.reduce((sum, month) => sum + month.absent, 0),
    ptoDays: months.reduce((sum, month) => sum + month.ptoDays, 0),
    months,
    timeOff: approved,
  };
}

export function formatAttendanceDays(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export type StaffAttendanceExportPerson = {
  name: string;
  email: string;
  role: string;
  level: string;
  employment: string;
  location: string;
  slice: StaffAttendanceSlice;
};

export function buildStaffAttendanceCsv(people: StaffAttendanceExportPerson[], periodLabel: string): string {
  const header = [
    'Name',
    'Email',
    'Role',
    'Level',
    'Employment',
    'Location',
    'Period',
    'Month',
    'Tardy',
    'Missing days',
    'PTO days',
  ];
  const lines = [header.join(',')];
  for (const person of people) {
    const rows = person.slice.months.length > 0 ? person.slice.months : [null];
    for (const month of rows) {
      const cells = [
        person.name,
        person.email,
        person.role,
        person.level,
        person.employment,
        person.location,
        periodLabel,
        month?.month ?? '',
        String(month?.late ?? 0),
        String(month?.absent ?? 0),
        formatAttendanceDays(month?.ptoDays ?? 0),
      ];
      lines.push(cells.map(csvCell).join(','));
    }
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function staffAttendanceCsvFilename(window: StaffKpiWindow): string {
  switch (window.period.kind) {
    case 'mtd':
      return `anim8-staff-attendance-mtd-${window.monthKeys?.[0] ?? 'current'}.csv`;
    case 'ytd':
      return `anim8-staff-attendance-ytd-${window.monthKeys?.[0]?.slice(0, 4) ?? 'current'}.csv`;
    case 'all':
      return 'anim8-staff-attendance-all-time.csv';
    case 'month':
      return `anim8-staff-attendance-${window.period.month}.csv`;
  }
}

export const STAFF_ATTENDANCE_NOTE =
  'Tardy is a late meeting mark. Missing days are absent marks. Approved time off is listed on its own so planned leave is not counted as a missing day. Tardy and missing marks are stored for the current studio month and each month after it closes; earlier months were not kept.';
