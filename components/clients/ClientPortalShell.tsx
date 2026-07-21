import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClientPortalFloatingCards } from './ClientPortalFloatingCards';
import { portalBackLink } from './portal-ui';

type ClientPortalShellProps = {
  slug: string;
  backHref?: string;
  backLabel?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export function ClientPortalShell({
  slug,
  backHref,
  backLabel = '← Back to portal',
  headerAction,
  children,
  wide = false,
}: ClientPortalShellProps) {
  return (
    <div className="client-portal-shell relative isolate min-h-screen">
      <ClientPortalFloatingCards slug={slug} />

      <header className="glass-nav relative z-20">
        <div className="client-portal-header container-custom !px-4 sm:!px-6 lg:!px-8">
          <div className="client-portal-header-inner mx-auto flex flex-col gap-3 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-4 md:py-4 lg:py-5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 self-start opacity-90 transition hover:opacity-100"
              aria-label="Anim-8 home (opens in new tab)"
            >
              <Image
                src="/images/logos/anim-8-completewordmark-white-01.svg"
                alt="Anim-8"
                width={120}
                height={20}
                className="h-4 w-auto min-[480px]:h-5"
                priority
              />
            </Link>

            <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:justify-end min-[480px]:gap-3 sm:gap-4">
              {backHref ? (
                <Link href={backHref} className={`${portalBackLink} self-start min-[480px]:self-auto`}>
                  {backLabel}
                </Link>
              ) : null}
              {headerAction}
            </div>
          </div>
        </div>
      </header>

      <main
        className={`client-portal-main container-custom relative z-10 !px-4 sm:!px-6 lg:!px-8 ${
          wide ? 'client-portal-main-inner--wide' : ''
        } client-portal-main-inner mx-auto`}
      >
        {children}
      </main>
    </div>
  );
}
