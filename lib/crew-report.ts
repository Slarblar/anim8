import 'server-only';
import {
  annualLeaveEntitlementDays,
  attendanceHistoryFromMember,
  currentMeetingAttendance,
  getCrewMember,
  listCrewMembers,
  type CrewLocation,
  type EmploymentType,
} from './crew-directory';
import { listPtoRequestsForEmployee, ptoDaysForRequest, type PtoRequest } from './pto-requests';
import { getKPIDataForUser, type PersonKPISummary } from './kpi';
import { isExemptFromReports } from './crew-report-eligibility';
import type { AttendanceTimeOffInput } from './staff-attendance';
import { studioTodayDateString } from './studio-date';

export type CrewReportData = {
  member: {
    name: string;
    email: string;
    role: string;
    level: string;
    employmentType: EmploymentType;
    location: CrewLocation;
    startDate: string | null;
  };
  pto: {
    balanceDays: number;
    entitlementDays: number;
    daysTakenYtd: number;
    /** Most recent first, capped so the report stays a page or two. */
    requests: PtoRequest[];
    /** Every approved time-off request, uncapped, for the attendance extract. */
    approvedTimeOff: AttendanceTimeOffInput[];
  };
  attendance: {
    monthKey: string;
    late: number;
    absent: number;
    /** Tardy and missing-day marks by YYYY-MM, oldest first. */
    months: { month: string; late: number; absent: number }[];
  };
  kpi: PersonKPISummary | null;
  generatedAt: string;
};

const MAX_REQUESTS_IN_REPORT = 24;

/**
 * One place both the admin ("view any crew member's report") and crew
 * ("view my own report") routes pull from — keeps the two report views
 * (and the API/print paths) from drifting out of sync on what counts as
 * "PTO taken" or which KPI window to show.
 */
export async function buildCrewReport(email: string): Promise<CrewReportData | null> {
  const member = await getCrewMember(email);
  if (!member) return null;

  const [requests, kpi] = await Promise.all([
    listPtoRequestsForEmployee(email),
    getKPIDataForUser(email).catch(() => null),
  ]);

  const currentYear = Number(studioTodayDateString().slice(0, 4));
  const daysTakenYtd = requests
    .filter(
      (r) => r.type === 'PTO' && r.status === 'approved' && Number(r.startDate.slice(0, 4)) === currentYear
    )
    .reduce((sum, r) => sum + ptoDaysForRequest(r), 0);

  const current = currentMeetingAttendance(member);
  const history = attendanceHistoryFromMember(member);
  return {
    member: {
      name: member.name,
      email: member.email,
      role: member.role,
      level: member.level,
      employmentType: member.employmentType,
      location: member.location,
      startDate: member.startDate,
    },
    pto: {
      balanceDays: member.ptoBalanceDays,
      entitlementDays: annualLeaveEntitlementDays(member.startDate),
      daysTakenYtd,
      requests: requests.slice(0, MAX_REQUESTS_IN_REPORT),
      approvedTimeOff: requests
        .filter((request) => request.type === 'PTO' && request.status === 'approved')
        .map((request) => ({
          id: request.id,
          type: request.type,
          status: request.status,
          startDate: request.startDate,
          endDate: request.endDate,
          dayPortion: request.dayPortion,
          note: request.note,
        })),
    },
    attendance: {
      ...current,
      months: Object.keys(history)
        .sort()
        .map((month) => ({ month, late: history[month]?.late ?? 0, absent: history[month]?.absent ?? 0 })),
    },
    kpi,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Active crew who belong on the accountant packet, alphabetical.
 * Test accounts, US-based crew, and anyone marked exempt are left off.
 */
export async function buildAllCrewReports(): Promise<CrewReportData[]> {
  const members = (await listCrewMembers())
    .filter((member) => member.active && !isExemptFromReports(member))
    .sort((a, b) => a.name.localeCompare(b.name));
  const reports = await Promise.all(members.map((member) => buildCrewReport(member.email)));
  return reports.filter((report): report is CrewReportData => report !== null);
}
