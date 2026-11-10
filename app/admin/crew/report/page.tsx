import { requireAdminSession } from '@/lib/auth-guards';
import { buildAllCrewReports } from '@/lib/crew-report';
import { parseStaffKpiPeriod, staffKpiPeriodParam } from '@/lib/kpi-shared';
import { StaffReportExplorer } from '@/components/reports/StaffReportExplorer';
import { adminAlertError } from '@/components/admin/admin-ui';

export default async function AdminCrewBatchReportPage({
  searchParams,
}: {
  searchParams: { period?: string | string[]; view?: string | string[] };
}) {
  const admin = await requireAdminSession();
  if (!admin) return <p className={adminAlertError}>Unauthorized.</p>;

  const period = parseStaffKpiPeriod(searchParams.period);
  const viewParam = Array.isArray(searchParams.view) ? searchParams.view[0] : searchParams.view;
  const reports = await buildAllCrewReports();

  return (
    <StaffReportExplorer
      initialPeriod={staffKpiPeriodParam(period)}
      initialView={viewParam === 'attendance' ? 'attendance' : 'kpi'}
      reports={reports}
      generatedAt={new Date().toISOString()}
    />
  );
}
