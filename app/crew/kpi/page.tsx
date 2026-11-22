import { Suspense } from 'react';
import { AsanaLoadingStatus } from '@/components/admin/AsanaLoadingStatus';
import { CrewKpiSummary } from '@/components/crew/CrewKpiSummary';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoKpiSummary, isCrewDemoUser } from '@/lib/crew-demo';
import { crewT } from '@/lib/crew-translations';
import { getKPIDataForUser, getKpiFetchedAt } from '@/lib/kpi';

export default function CrewKpiPage() {
  return (
    <div className="space-y-6">
      <div className="crew-fade-in-up">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          <HoverTranslate en={crewT.en.kpiPage.title} vn={crewT.vn.kpiPage.title} />
        </h1>
        <p className="mt-1.5 text-sm text-[#8b95a8] md:text-base">
          <HoverTranslate en={crewT.en.kpiPage.subtitle} vn={crewT.vn.kpiPage.subtitle} />
        </p>
      </div>
      <Suspense
        fallback={
          <AsanaLoadingStatus
            layout="page"
            title="Gathering information from Asana"
            detail="Loading your KPI scores from the Anim8 KPI project."
          />
        }
      >
        <CrewKpiLoader />
      </Suspense>
    </div>
  );
}

async function CrewKpiLoader() {
  const session = await requireCrewSession();
  if (!session) {
    return <CrewKpiSummary initialError="You need to be signed in to view KPI scores." />;
  }

  if (isCrewDemoUser(session.email)) {
    return (
      <CrewKpiSummary initialSummary={getDemoKpiSummary(session.email)} initialEmail={session.email} />
    );
  }

  try {
    const [summary, fetchedAt] = await Promise.all([
      getKPIDataForUser(session.email),
      getKpiFetchedAt(),
    ]);
    return (
      <CrewKpiSummary initialSummary={summary} initialEmail={session.email} initialFetchedAt={fetchedAt} />
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load KPI data.';
    return <CrewKpiSummary initialEmail={session.email} initialError={message} />;
  }
}
