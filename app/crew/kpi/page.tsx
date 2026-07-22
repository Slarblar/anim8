'use client';

import { CrewKpiSummary } from '@/components/crew/CrewKpiSummary';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { crewT } from '@/lib/crew-translations';

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
      <CrewKpiSummary />
    </div>
  );
}
