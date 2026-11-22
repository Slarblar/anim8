import { Suspense } from 'react';
import { AdminKpiProfile } from '@/components/admin/AdminKpiProfile';
import { AsanaLoadingStatus } from '@/components/admin/AsanaLoadingStatus';
import { getAdminKpiPerson } from '@/lib/admin-kpi';

export default function AdminKpiProfilePage({ params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  return (
    <Suspense
      fallback={
        <AsanaLoadingStatus
          layout="page"
          title="Gathering information from Asana"
          detail="Loading this person's scored tasks from the Anim8 KPI project."
        />
      }
    >
      <AdminKpiProfileLoader email={email} />
    </Suspense>
  );
}

async function AdminKpiProfileLoader({ email }: { email: string }) {
  try {
    const person = await getAdminKpiPerson(email);
    if (!person) {
      return <AdminKpiProfile email={email} initialPerson={null} initialError="Crew member not found." />;
    }
    return <AdminKpiProfile email={email} initialPerson={person} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load KPI profile.';
    return <AdminKpiProfile email={email} initialError={message} />;
  }
}
