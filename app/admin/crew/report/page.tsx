import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth-guards';
import { buildAllCrewReports } from '@/lib/crew-report';
import { lastCompleteKpiMonth } from '@/lib/kpi-shared';
import { CrewReportView, PrintReportButton } from '@/components/reports/CrewReportView';
import { adminAlertError, adminBody } from '@/components/admin/admin-ui';

export default async function AdminCrewBatchReportPage() {
  const admin = await requireAdminSession();
  if (!admin) return <p className={adminAlertError}>Unauthorized.</p>;

  const reports = await buildAllCrewReports();
  const reported = lastCompleteKpiMonth();

  return (
    <div className="space-y-8">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">
            <Link href="/admin/crew" className="transition hover:text-brand-cyan">
              Crew directory
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Staff report</h1>
          <p className={`${adminBody} mt-1`}>
            {reports.length} active crew · KPI for {reported.label}, the last complete month.
          </p>
        </div>
        <PrintReportButton />
      </div>

      {reports.length === 0 ? (
        <p className={adminBody}>No active crew members to report.</p>
      ) : (
        <div className="crew-report-batch space-y-16">
          {reports.map((report) => (
            <CrewReportView key={report.member.email} data={report} embedded />
          ))}
        </div>
      )}
    </div>
  );
}
