import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-brand-black text-white">
      <header className="border-b border-white/10 bg-brand-black/95">
        <div className="container-custom flex flex-col gap-3 py-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-black uppercase tracking-tight text-white">
              Anim-8 <span className="text-brand-cyan">Admin</span>
            </span>
            <nav className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Link href="/admin/clients" className="transition hover:text-brand-cyan">
                Clients
              </Link>
              <Link href="/admin/crew" className="transition hover:text-brand-cyan">
                Crew directory
              </Link>
              <Link href="/admin/pto-requests" className="transition hover:text-brand-cyan">
                PTO requests
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="container-custom py-8">{children}</main>
    </div>
  );
}
