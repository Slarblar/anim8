import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/auth-roles';
import { CrewLanguageProvider } from '@/lib/crew-language';
import { CrewNav } from '@/components/crew/CrewNav';
import { Footer } from '@/components/ui/Footer';

/** Apply saved VN preference before first paint so Futura never renders Vietnamese diacritics. */
const CREW_LANG_BOOT = `(function(){try{var l=localStorage.getItem('crew-lang');if(l==='vn'){document.documentElement.lang='vi';document.documentElement.classList.add('crew-lang-vn');}}catch(e){}})();`;

export default async function CrewLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const admin = isAdminEmail(session?.user?.email);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: CREW_LANG_BOOT }} />
      <CrewLanguageProvider>
        <div className="crew-shell flex min-h-screen flex-col bg-brand-black text-white print:bg-white print:text-black">
          <header className="no-print border-b border-white/10 bg-brand-black/95">
            <CrewNav admin={admin} email={session?.user?.email} />
          </header>
          <main className="container-custom flex-1 py-8 pb-28 min-[640px]:pb-36">{children}</main>
          <div className="no-print mt-auto border-t border-white/10">
            <Footer />
          </div>
        </div>
      </CrewLanguageProvider>
    </>
  );
}
