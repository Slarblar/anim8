import { AdminKpiProfile } from '@/components/admin/AdminKpiProfile';

export default function AdminKpiProfilePage({ params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  return <AdminKpiProfile email={email} />;
}
