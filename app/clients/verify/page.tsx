import { ClientPortalShell } from '@/components/clients/ClientPortalShell';
import {
  formatPortalDisplayName,
  portalBody,
  portalBtnPrimary,
  portalEyebrow,
  portalPageTitle,
  portalTaskCard,
} from '@/components/clients/portal-ui';
import { peekClientLoginToken } from '@/lib/client-portal-auth';
import { getClientBySlug } from '@/lib/client-registry';
import Link from 'next/link';

type PageProps = {
  searchParams: { token?: string };
};

export default async function ClientPortalVerifyPage({ searchParams }: PageProps) {
  const token = searchParams.token?.trim() ?? '';
  const session = token ? await peekClientLoginToken(token) : null;
  const client = session ? await getClientBySlug(session.slug) : null;

  return (
    <ClientPortalShell>
      <div className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3`}>
          {client ? formatPortalDisplayName(client.displayName) : 'Open your portal'}
        </h1>
      </div>

      {client && token ? (
        <form action="/api/clients/verify" method="post" className={`${portalTaskCard} mt-8 max-w-lg`}>
          <p className={portalBody}>
            Confirm to open your projects. Direct links you already have still work
            anytime.
          </p>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={`${portalBtnPrimary} mt-5`}>
            Open my portal
          </button>
        </form>
      ) : (
        <div className={`${portalTaskCard} mt-8 max-w-lg`}>
          <p className={portalBody}>
            This link is invalid or expired. Enter your email and we&apos;ll send a new
            one.
          </p>
          <Link href="/clients" className={`${portalBtnPrimary} mt-5`}>
            Back to sign in
          </Link>
        </div>
      )}
    </ClientPortalShell>
  );
}
