import { requireCrewSession } from '@/lib/auth-guards';
import { buildCrewReport } from '@/lib/crew-report';
import { CrewReportView } from '@/components/reports/CrewReportView';
import { adminAlertError } from '@/components/admin/admin-ui';

export default async function CrewReportPage() {
  const session = await requireCrewSession();
  if (!session) return <p className={adminAlertError}>Unauthorized.</p>;

  const data = await buildCrewReport(session.email);
  if (!data) return <p className={adminAlertError}>Could not load your report.</p>;

  return <CrewReportView data={data} />;
}
