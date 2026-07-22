'use client';

import { CrewStatusChart } from '@/components/crew/CrewStatusChart';
import { CrewYourDashboard } from '@/components/crew/CrewYourDashboard';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { crewT } from '@/lib/crew-translations';

export default function CrewStatusPage() {
  return (
    <div className="space-y-10">
      <CrewYourDashboard />

      <div className="space-y-6">
        <div className="crew-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            <HoverTranslate en={crewT.en.statusPage.title} vn={crewT.vn.statusPage.title} />
          </h1>
          <p className="mt-1.5 text-sm text-[#8b95a8] md:text-base">
            <HoverTranslate en={crewT.en.statusPage.subtitle} vn={crewT.vn.statusPage.subtitle} />
          </p>
        </div>
        <CrewStatusChart />
      </div>
    </div>
  );
}
