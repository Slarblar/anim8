import Link from 'next/link';
import {
  portalBody,
  portalEyebrow,
  portalPageTitle,
  portalTaskCard,
} from '@/components/clients/portal-ui';

export default function ClientPortalNotFound() {
  return (
    <div className="client-portal-shell relative flex min-h-screen flex-col items-center justify-center py-16">
      <main className="container-custom max-w-lg text-center">
        <div className={`${portalTaskCard} w-full`}>
          <p className={portalEyebrow}>Anim-8</p>
          <h1 className={`${portalPageTitle} mt-4 text-2xl md:text-3xl`}>Portal not found</h1>
          <p className={`${portalBody} mt-4`}>
            This link may be invalid or no longer active. Contact Anim-8 if you need a new link.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-brand-cyan transition hover:text-brand-lime font-mono"
          >
            ← anim-8.xyz
          </Link>
        </div>
      </main>
    </div>
  );
}
