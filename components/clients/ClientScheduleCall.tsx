'use client';

import { ANIM8_CALENDAR_URL } from '@/lib/client-portal-asana-config';
import Link from 'next/link';
import { useState } from 'react';
import { ClientPortalShell } from './ClientPortalShell';
import {
  portalBody,
  portalBtnPrimary,
  portalBtnSecondary,
  portalCallout,
  portalEyebrow,
  formatPortalDisplayName,
  portalPageTitle,
  portalSectionTitle,
  portalTaskCard,
} from './portal-ui';

type ClientScheduleCallProps = {
  slug: string;
  displayName: string;
};

export function ClientScheduleCall({ slug, displayName }: ClientScheduleCallProps) {
  const [embedBlocked, setEmbedBlocked] = useState(false);

  return (
    <ClientPortalShell slug={slug} backHref={`/clients/${slug}`} backLabel="← Portal" wide>
      <div className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4">
        <p className={portalEyebrow}>Client portal</p>
        <h1 className={`${portalPageTitle} mt-2 min-[480px]:mt-3`}>Schedule a call</h1>
        <p className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl text-white/90`}>
          Book time with the Anim-8 team for {formatPortalDisplayName(displayName)}. Choose a slot that works for you —
          you&apos;ll get a calendar invite by email.
        </p>
      </div>

      <section id="booking-calendar" className="mt-6 min-[480px]:mt-8 scroll-mt-8">
        <h2 className={portalSectionTitle}>Select a time</h2>

        <div className={`${portalTaskCard} mt-4 min-[480px]:mt-5 overflow-hidden p-0`}>
          {!embedBlocked ? (
            <iframe
              src={ANIM8_CALENDAR_URL}
              title="Book a call with Anim-8"
              className="min-h-[480px] w-full border-0 bg-white min-[480px]:min-h-[560px] md:min-h-[640px] lg:min-h-[720px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setEmbedBlocked(true)}
            />
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <p className="text-lg font-bold text-white">Calendar embed unavailable</p>
              <p className={portalBody}>
                Use the button below to open Google Calendar booking in a new tab.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className={`${portalCallout} mt-6`}>
        <p className="font-bold text-white">
          {embedBlocked
            ? 'The calendar works best in a new tab.'
            : 'Pick a time using the calendar above, or open it in a new tab.'}
        </p>
        {!embedBlocked ? (
          <p className={`${portalBody} mt-2 text-white/90`}>
            Scroll inside the frame to see all available slots. If the embed doesn&apos;t load,
            use <strong className="font-bold text-white">Open booking calendar</strong> — that
            always works.
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 min-[480px]:mt-4 min-[480px]:flex-row min-[480px]:flex-wrap">
          <a
            href={ANIM8_CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={portalBtnPrimary}
          >
            Open booking calendar ↗
          </a>
          <Link href={`/clients/${slug}`} className={portalBtnSecondary}>
            Back to portal
          </Link>
        </div>
      </div>
    </ClientPortalShell>
  );
}
