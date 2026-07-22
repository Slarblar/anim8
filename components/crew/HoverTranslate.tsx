'use client';

import type { ReactNode } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /** Optional leading content (emoji, icons) that stays put while the text swaps. */
  children?: ReactNode;
};

/**
 * Shows the active-language string; on hover/focus crossfades in-place to the
 * other language. Dotted underline marks phrases that can flip — useful for a
 * bilingual EN/VN crew without needing a tooltip.
 */
export function HoverTranslate({ en, vn, className, children }: HoverTranslateProps) {
  const { lang } = useCrewLanguage();
  const primary = lang === 'vn' ? vn : en;
  const other = lang === 'vn' ? en : vn;

  // Identical strings (e.g. "KPI", "WFH") — nothing useful to hover-reveal.
  if (primary === other) {
    return (
      <span className={className}>
        {children}
        {primary}
      </span>
    );
  }

  return (
    <span className={`crew-hover-translate ${className ?? ''}`.trim()} tabIndex={0}>
      {children}
      <span className="crew-hover-translate__swap">
        <span className="crew-hover-translate__primary">{primary}</span>
        <span className="crew-hover-translate__other" aria-hidden="true">
          {other}
        </span>
      </span>
    </span>
  );
}
