import 'server-only';
import {
  annualLeaveEntitlementDays,
  currentMeetingAttendance,
  getCrewMember,
  type CrewLocation,
  type EmploymentType,
} from './crew-directory';
import { countBusinessDays, listPtoRequestsForEmployee, type PtoRequest } from './pto-requests';
import { getKPIDataForUser, type PersonKPISummary } from './kpi';
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
  };
  attendance: {
    monthKey: string;
    late: number;
    absent: number;
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
    .reduce((sum, r) => sum + countBusinessDays(r.startDate, r.endDate), 0);

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
    },
    attendance: currentMeetingAttendance(member),
    kpi,
    generatedAt: new Date().toISOString(),
  };
}
