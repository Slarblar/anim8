'use client';

import Link from 'next/link';
import { CrewPtoHistory } from '@/components/crew/CrewPtoHistory';
import { CrewPtoBalance } from '@/components/crew/CrewPtoBalance';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { adminBody, adminBtnPrimary } from '@/components/admin/admin-ui';
import { crewT } from '@/lib/crew-translations';

export default function CrewPtoPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            <HoverTranslate en={crewT.en.ptoPage.title} vn={crewT.vn.ptoPage.title} />
          </h1>
          <p className={`${adminBody} mt-1`}>
            <HoverTranslate en={crewT.en.ptoPage.subtitle} vn={crewT.vn.ptoPage.subtitle} />
          </p>
        </div>
        <Link href="/crew/pto/new" className={adminBtnPrimary}>
          <HoverTranslate en={crewT.en.ptoPage.newRequest} vn={crewT.vn.ptoPage.newRequest} />
        </Link>
      </div>

      <CrewPtoBalance />
      <CrewPtoHistory />
    </div>
  );
}
