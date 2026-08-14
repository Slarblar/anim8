import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ClientPortalLogin } from '@/components/clients/ClientPortalLogin';
import { ClientPortalShell } from '@/components/clients/ClientPortalShell';
import {
  portalBody,
  portalEyebrow,
  portalPageTitle,
} from '@/components/clients/portal-ui';
import { getClientPortalSession } from '@/lib/client-portal-auth';
import { getClientBySlug } from '@/lib/client-registry';

export default async function ClientsLoginPage() {
  const session = await getClientPortalSession();
  if (session) {
    const client = await getClientBySlug(session.slug);
    if (client) redirect(`/clients/${client.slug}`);
  }

  return (
    <ClientPortalShell>
      <div className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3`}>Welcome back</h1>
        <p className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl`}>
          Enter your email and we&apos;ll send a link to your projects. Direct links you
          already have still work.
        </p>
      </div>
      <Suspense fallback={null}>
        <ClientPortalLogin />
      </Suspense>
    </ClientPortalShell>
  );
}
