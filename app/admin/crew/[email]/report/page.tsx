import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth-guards';
import { getCrewMember } from '@/lib/crew-directory';
import { isExemptFromReports, reportExemptLockReason } from '@/lib/crew-report-eligibility';
import { buildCrewReport } from '@/lib/crew-report';
import { CrewReportView } from '@/components/reports/CrewReportView';
import { adminAlertError, adminBody } from '@/components/admin/admin-ui';

export default async function AdminCrewReportPage({ params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return <p className={adminAlertError}>Unauthorized.</p>;

  const email = decodeURIComponent(params.email);
  const member = await getCrewMember(email);
  if (!member) return <p className={adminAlertError}>Crew member not found.</p>;
  if (isExemptFromReports(member)) {
    const reason = reportExemptLockReason(member) ?? 'This person is marked exempt from reports.';
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">{member.name}</h1>
        <p className={adminBody}>{reason} Staff reports skip this person.</p>
        <Link href="/admin/crew" className="text-sm font-bold text-brand-cyan transition hover:brightness-125">
          Back to crew directory
        </Link>
      </div>
    );
  }

  const data = await buildCrewReport(email);
  if (!data) return <p className={adminAlertError}>Crew member not found.</p>;

  return <CrewReportView data={data} />;
}
