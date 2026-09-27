'use client';

import Link from 'next/link';
import { useId } from 'react';
import { portalBtnBrief } from './portal-ui';

export const BRIEF_BUILDER_TOOLTIP =
  'Describe the project in your own words. We’ll ask a few follow-ups, then turn it into a brief you can review before it goes to the team.';

export function BriefBuilderButton({ slug }: { slug: string }) {
  const tipId = useId();

  return (
    <span className="group relative inline-flex w-full min-[480px]:w-auto">
      <Link
        href={`/clients/${slug}/brief`}
        className={portalBtnBrief}
        aria-describedby={tipId}
      >
        Brief builder
      </Link>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-white/15 bg-[#14151f] px-3 py-2 text-left text-[11px] font-medium normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {BRIEF_BUILDER_TOOLTIP}
      </span>
    </span>
  );
}
