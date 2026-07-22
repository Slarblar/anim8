'use client';

import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { CrewLanguageToggle } from './CrewLanguageToggle';

export function CrewNav({ admin, email }: { admin: boolean; email?: string | null }) {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].nav;

  return (
    <div className="container-custom flex flex-col gap-3 py-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm font-black uppercase tracking-tight text-white">
          Anim-8 <span className="text-brand-cyan">Crew</span>
        </span>
        <nav className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-text-muted">
          <Link href="/crew" className="transition hover:text-brand-cyan">
            {c.status}
          </Link>
          <Link href="/crew/pto" className="transition hover:text-brand-cyan">
            {c.pto}
          </Link>
          <Link href="/crew/kpi" className="transition hover:text-brand-cyan">
            {c.kpi}
          </Link>
          {admin ? (
            <Link href="/admin" className="transition hover:text-brand-cyan">
              {c.admin}
            </Link>
          ) : null}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <CrewLanguageToggle />
        <span>{email}</span>
        <SignOutButton label={c.signOut} />
      </div>
    </div>
  );
}
