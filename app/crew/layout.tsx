import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/auth-roles';
import { CrewLanguageProvider } from '@/lib/crew-language';
import { CrewNav } from '@/components/crew/CrewNav';

export default async function CrewLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const admin = isAdminEmail(session?.user?.email);

  return (
    <CrewLanguageProvider>
      <div className="crew-shell min-h-screen bg-brand-black text-white">
        <header className="border-b border-white/10 bg-brand-black/95">
          <CrewNav admin={admin} email={session?.user?.email} />
        </header>
        <main className="container-custom py-8">{children}</main>
      </div>
    </CrewLanguageProvider>
  );
}
