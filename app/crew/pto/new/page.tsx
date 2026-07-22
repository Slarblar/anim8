'use client';

import { NewPtoRequestForm } from '@/components/crew/NewPtoRequestForm';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { crewT } from '@/lib/crew-translations';

export default function NewPtoRequestPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          <HoverTranslate en={crewT.en.ptoPage.newRequestTitle} vn={crewT.vn.ptoPage.newRequestTitle} />
        </h1>
        <p className="mt-1 text-sm text-[#8b95a8]">
          <HoverTranslate en={crewT.en.ptoPage.newRequestSubtitle} vn={crewT.vn.ptoPage.newRequestSubtitle} />
        </p>
      </div>
      <NewPtoRequestForm />
    </div>
  );
}
