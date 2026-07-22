'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /** Optional leading content (emoji, icons) that stays put while the text swaps. */
  children?: ReactNode;
};

/**
 * Shows the active-language string; on hover/focus swaps in-place to the other
 * language. Vietnamese copy uses the system mono stack so diacritics never
 * fall through to Futura (see .crew-vi-text in globals.css).
 */
export function HoverTranslate({ en, vn, className, children }: HoverTranslateProps) {
  const { lang } = useCrewLanguage();
  const primary = lang === 'vn' ? vn : en;
  const other = lang === 'vn' ? en : vn;
  const [showOther, setShowOther] = useState(false);

  if (primary === other) {
    return (
      <span className={className}>
        {children}
        {primary}
      </span>
    );
  }

  const visible = showOther ? other : primary;
  const viClass = visible === vn ? 'crew-vi-text font-mono' : '';

  return (
    <span
      className={`crew-hover-translate ${viClass} ${className ?? ''}`.trim()}
      tabIndex={0}
      onMouseEnter={() => setShowOther(true)}
      onMouseLeave={() => setShowOther(false)}
      onFocus={() => setShowOther(true)}
      onBlur={() => setShowOther(false)}
    >
      {children}
      {visible}
    </span>
  );
}
