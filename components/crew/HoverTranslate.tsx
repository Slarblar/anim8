'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useCrewLanguage } from '@/lib/crew-language';

type HoverTranslateProps = {
  en: string;
  vn: string;
  className?: string;
  /**
   * `stable` (default) — reserve max(EN, VN) width so layout never shifts (buttons, headlines).
   * `badge` — size to the active language and animate width on hover/toggle (pills only).
   */
  fit?: 'stable' | 'badge';
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
 * EN/VN toggle) decrypt-scrambles in place to the other language.
 * Always mono so EN↔VN never jumps font metrics.
 */
export function HoverTranslate({
  en,
  vn,
  className,
  fit = 'stable',
  children,
}: HoverTranslateProps) {
  const { lang } = useCrewLanguage();
  const primary = lang === 'vn' ? vn : en;
  const other = lang === 'vn' ? en : vn;
  const isBadge = fit === 'badge';

  const wrapRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
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

  /** Measure content width for a target string without leaving scramble mid-state. */
  const measureWidthFor = (target: string): number => {
    const textNode = textRef.current;
    const content = contentRef.current;
    if (!textNode || !content) return 0;
    const prev = textNode.textContent;
    textNode.textContent = target;
    const width = content.offsetWidth;
    textNode.textContent = prev;
    return width;
  };

  const setBadgeWidth = (width: number, animate: boolean) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (!animate || reducedMotionRef.current) {
      wrap.style.transition = 'none';
      wrap.style.width = `${width}px`;
      // Restore transition on next frame so later hovers still animate.
      requestAnimationFrame(() => {
        wrap.style.transition = '';
      });
      return;
    }
    wrap.style.width = `${width}px`;
  };

  const animateTo = (target: string) => {
    const node = textRef.current;
    const wrap = wrapRef.current;
    if (!node) return;
    cancelRef.current?.();

    if (isBadge && wrap) {
      const fromWidth = wrap.offsetWidth || measureWidthFor(node.textContent ?? target);
      const toWidth = measureWidthFor(target);
      // Lock current width, then ease to the target language's width while scrambling.
      wrap.style.transition = 'none';
      wrap.style.width = `${fromWidth}px`;
      void wrap.offsetWidth;
      if (reducedMotionRef.current) {
        wrap.style.width = `${toWidth}px`;
      } else {
        wrap.style.transition = '';
        requestAnimationFrame(() => {
          wrap.style.width = `${toWidth}px`;
        });
      }
    }

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

  // Badge: snap initial width to the active language (no dual-string reservation).
  useLayoutEffect(() => {
    if (!isBadge) return;
    const width = measureWidthFor(primary);
    if (width > 0) setBadgeWidth(width, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBadge, en, vn, primary]);

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

  if (isBadge) {
    return (
      <span
        ref={wrapRef}
        className={`crew-hover-translate crew-hover-translate--badge inline-flex items-center justify-center font-mono ${className ?? ''}`.trim()}
        tabIndex={0}
        onMouseEnter={() => animateTo(other)}
        onMouseLeave={() => animateTo(primary)}
        onFocus={() => animateTo(other)}
        onBlur={() => animateTo(primary)}
      >
        <span ref={contentRef} className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
          {children}
          <span className="crew-hover-translate__text" ref={textRef}>
            {initialTextRef.current}
          </span>
        </span>
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
