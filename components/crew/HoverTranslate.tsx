'use client';

import type { ReactNode } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /** Optional leading/trailing content (emoji, icons) that shouldn't be in the tooltip. */
  children?: ReactNode;
};

/**
 * Shows the active-language string; on hover/focus reveals the other language
 * in a small tooltip. Dotted underline + help cursor tip people off that a
 * translation is one hover away — useful for a bilingual EN/VN crew.
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
    <span className={`crew-hover-translate ${className ?? ''}`.trim()} data-translate={other} tabIndex={0}>
      {children}
      {primary}
    </span>
  );
}
