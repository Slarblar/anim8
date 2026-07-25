import { requireAdminSession } from '@/lib/auth-guards';
import { buildCrewReport } from '@/lib/crew-report';
import { CrewReportView } from '@/components/reports/CrewReportView';
import { adminAlertError } from '@/components/admin/admin-ui';

export default async function AdminCrewReportPage({ params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return <p className={adminAlertError}>Unauthorized.</p>;

  const email = decodeURIComponent(params.email);
  const data = await buildCrewReport(email);
  if (!data) return <p className={adminAlertError}>Crew member not found.</p>;

  return <CrewReportView data={data} />;
}
