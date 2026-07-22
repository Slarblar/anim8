'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /** Optional leading content (emoji, icons) that stays put while the text swaps. */
  children?: ReactNode;
};

/**
 * Bilingual copy with a stable box (both strings reserve layout space) and a
 * short glitch animation on swap. Always mono so EN↔VN never jumps font metrics.
 */
export function HoverTranslate({ en, vn, className, children }: HoverTranslateProps) {
  const { lang } = useCrewLanguage();
  const primary = lang === 'vn' ? vn : en;
  const other = lang === 'vn' ? en : vn;
  const [showOther, setShowOther] = useState(false);
  const [glitch, setGlitch] = useState(false);

  const visible = showOther ? other : primary;

  const triggerSwap = (next: boolean) => {
    if (next === showOther) return;
    setShowOther(next);
    setGlitch(true);
  };

  useEffect(() => {
    if (!glitch) return;
    const id = window.setTimeout(() => setGlitch(false), 420);
    return () => window.clearTimeout(id);
  }, [glitch]);

  const langReady = useRef(false);

  /* Language toggle — brief glitch so the page-wide swap feels intentional. */
  useEffect(() => {
    if (!langReady.current) {
      langReady.current = true;
      return;
    }
    setShowOther(false);
    setGlitch(true);
  }, [lang]);

  if (primary === other) {
    return (
      <span className={className}>
        {children}
        {primary}
      </span>
    );
  }

  return (
    <span
      className={`crew-hover-translate font-mono ${className ?? ''}`.trim()}
      tabIndex={0}
      onMouseEnter={() => triggerSwap(true)}
      onMouseLeave={() => triggerSwap(false)}
      onFocus={() => triggerSwap(true)}
      onBlur={() => triggerSwap(false)}
    >
      {children}
      <span className="crew-hover-translate__stack">
        <span className="crew-hover-translate__ghost" aria-hidden="true">
          {en}
        </span>
        <span className="crew-hover-translate__ghost" aria-hidden="true">
          {vn}
        </span>
        <span
          className={`crew-hover-translate__text${glitch ? ' crew-hover-translate__text--glitch' : ''}`}
        >
          {visible}
        </span>
      </span>
    </span>
  );
}
