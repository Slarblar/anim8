import { Suspense } from 'react';
import { AdminKpiBoard } from '@/components/admin/AdminKpiBoard';
import { AsanaLoadingStatus } from '@/components/admin/AsanaLoadingStatus';
import { buildAdminKpiBoard } from '@/lib/admin-kpi';
import { getKpiFetchedAt } from '@/lib/kpi';

export default function AdminKpiPage() {
  return (
    <Suspense
      fallback={
        <AsanaLoadingStatus
          layout="page"
          title="Gathering information from Asana"
          detail="Loading KPI scores from the Anim8 KPI project. This can take a moment."
        />
      }
    >
      <AdminKpiBoardLoader />
    </Suspense>
  );
}

async function AdminKpiBoardLoader() {
  try {
    const [people, fetchedAt] = await Promise.all([buildAdminKpiBoard(), getKpiFetchedAt()]);
    return <AdminKpiBoard initialPeople={people} initialFetchedAt={fetchedAt} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load KPI board.';
    return (
      <div className="space-y-4">
        <h1 className="text-sm font-black uppercase tracking-widest text-white">KPI board</h1>
        <p className="rounded-lg border border-brand-pink/40 bg-brand-pink/10 px-4 py-3 text-sm text-white">
          {message}
        </p>
      </div>
    );
  }
}
