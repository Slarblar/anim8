'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /** Optional leading content (emoji, icons) that stays put while the text swaps. */
  children?: ReactNode;
};

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#•01';

function randomScrambleChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

/**
 * "Decrypt" text scramble — cycles each character through random glyphs on a
 * randomized per-character schedule, then locks it to the target character,
 * left to right. Writes straight to the DOM node via requestAnimationFrame
 * instead of React state, so it costs nothing per frame even with many
 * instances animating at once (e.g. a whole page swapping EN → VN).
 * Returns a cancel function.
 */
function scrambleTo(node: HTMLElement, from: string, to: string, totalFrames = 24): () => void {
  const length = Math.max(from.length, to.length);
  const queue = Array.from({ length }, (_, i) => {
    const start = Math.floor(Math.random() * totalFrames * 0.5);
    const end = start + Math.floor(Math.random() * totalFrames * 0.5) + Math.ceil(totalFrames * 0.3);
    return { from: from[i] ?? '', to: to[i] ?? '', start, end, char: '' };
  });

  let frame = 0;
  let raf = 0;

  const tick = () => {
    let output = '';
    let settled = 0;
    for (const cell of queue) {
      if (frame >= cell.end) {
        settled++;
        output += cell.to;
      } else if (frame >= cell.start) {
        if (!cell.char || Math.random() < 0.32) {
          cell.char = randomScrambleChar();
        }
        output += cell.char;
      } else {
        output += cell.from;
      }
    }
    node.textContent = output;
    if (settled < queue.length) {
      frame++;
      raf = requestAnimationFrame(tick);
    }
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Shows the active-language string; on hover/focus (and on the page-wide
 * EN/VN toggle) decrypt-scrambles in place to the other language. Both
 * strings are pre-rendered in a hidden layer so the box never resizes.
 * Always mono so EN↔VN never jumps font metrics.
 */
export function HoverTranslate({ en, vn, className, children }: HoverTranslateProps) {
  const { lang } = useCrewLanguage();
  const primary = lang === 'vn' ? vn : en;
  const other = lang === 'vn' ? en : vn;

  const textRef = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  // Captured once — kept out of subsequent renders so React never resets the
  // ref'd node's textContent out from under our imperative rAF animation.
  const initialTextRef = useRef(primary);
  const reducedMotionRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const animateTo = (target: string) => {
    const node = textRef.current;
    if (!node) return;
    cancelRef.current?.();
    if (reducedMotionRef.current) {
      node.textContent = target;
      return;
    }
    const from = node.textContent ?? target;
    if (from === target) return;
    cancelRef.current = scrambleTo(node, from, target);
  };

  // Page-wide EN/VN toggle — scramble every instance to the new primary string.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    animateTo(primary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => () => cancelRef.current?.(), []);

  // Identical strings (e.g. "KPI", "WFH") — nothing to scramble.
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
      onMouseEnter={() => animateTo(other)}
      onMouseLeave={() => animateTo(primary)}
      onFocus={() => animateTo(other)}
      onBlur={() => animateTo(primary)}
    >
      {children}
      <span className="crew-hover-translate__stack">
        <span className="crew-hover-translate__ghost" aria-hidden="true">
          {en}
        </span>
        <span className="crew-hover-translate__ghost" aria-hidden="true">
          {vn}
        </span>
        <span className="crew-hover-translate__text" ref={textRef}>
          {initialTextRef.current}
        </span>
      </span>
    </span>
  );
}
