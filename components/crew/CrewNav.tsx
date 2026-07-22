'use client';

import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { crewT } from '@/lib/crew-translations';
import { CrewLanguageToggle } from './CrewLanguageToggle';
import { HoverTranslate } from './HoverTranslate';

export function CrewNav({ admin, email }: { admin: boolean; email?: string | null }) {
  return (
    <div className="container-custom flex flex-col gap-3 py-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm font-black uppercase tracking-tight text-white">
          Anim-8 <span className="text-brand-cyan">Crew</span>
        </span>
        <nav className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-text-muted">
          <Link href="/crew" className="transition hover:text-brand-cyan">
            <HoverTranslate en={crewT.en.nav.status} vn={crewT.vn.nav.status} />
          </Link>
          <Link href="/crew/pto" className="transition hover:text-brand-cyan">
            <HoverTranslate en={crewT.en.nav.pto} vn={crewT.vn.nav.pto} />
          </Link>
          <Link href="/crew/kpi" className="transition hover:text-brand-cyan">
            <HoverTranslate en={crewT.en.nav.kpi} vn={crewT.vn.nav.kpi} />
          </Link>
          {admin ? (
            <Link href="/admin" className="transition hover:text-brand-cyan">
              <HoverTranslate en={crewT.en.nav.admin} vn={crewT.vn.nav.admin} />
            </Link>
          ) : null}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <CrewLanguageToggle />
        <span>{email}</span>
        <SignOutButton label={<HoverTranslate en={crewT.en.nav.signOut} vn={crewT.vn.nav.signOut} />} />
      </div>
    </div>
  );
}
