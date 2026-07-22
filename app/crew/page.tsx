'use client';

import { CrewStatusChart } from '@/components/crew/CrewStatusChart';
import { CrewYourDashboard } from '@/components/crew/CrewYourDashboard';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';

export default function CrewStatusPage() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].statusPage;

  return (
    <div className="space-y-10">
      <CrewYourDashboard />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">{c.title}</h1>
          <p className="mt-1 text-sm text-[#8b95a8]">{c.subtitle}</p>
        </div>
        <CrewStatusChart />
      </div>
    </div>
  );
}
