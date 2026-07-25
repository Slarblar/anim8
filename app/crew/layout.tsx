import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/auth-roles';
import { CrewLanguageProvider } from '@/lib/crew-language';
import { CrewNav } from '@/components/crew/CrewNav';

/** Apply saved VN preference before first paint so Futura never renders Vietnamese diacritics. */
const CREW_LANG_BOOT = `(function(){try{var l=localStorage.getItem('crew-lang');if(l==='vn'){document.documentElement.lang='vi';document.documentElement.classList.add('crew-lang-vn');}}catch(e){}})();`;

export default async function CrewLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const admin = isAdminEmail(session?.user?.email);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: CREW_LANG_BOOT }} />
      <CrewLanguageProvider>
        <div className="crew-shell min-h-screen bg-brand-black text-white print:bg-white print:text-black">
        <header className="no-print border-b border-white/10 bg-brand-black/95">
          <CrewNav admin={admin} email={session?.user?.email} />
        </header>
        <main className="container-custom py-8">{children}</main>
      </div>
    </CrewLanguageProvider>
    </>
  );
}
