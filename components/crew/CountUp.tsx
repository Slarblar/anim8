'use client';

import { useEffect, useRef } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Shared count-up driver — animates 0 -> value with requestAnimationFrame,
 * writing straight to the node's textContent (no React re-render per frame).
 * Stays cheap even with a dozen stat cards animating at once. Restarts from
 * 0 on every value change (mount, KPI refresh, tab switch, etc).
 */
function useCountUpNode<T extends { textContent: string | null }>(
  value: number,
  decimals: number,
  duration: number
) {
  const ref = useRef<T | null>(null);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(rafRef.current);

    if (!Number.isFinite(value)) {
      node.textContent = '—';
      return;
    }
    if (reducedMotionRef.current) {
      node.textContent = value.toFixed(decimals);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      node.textContent = (value * easeOutCubic(t)).toFixed(decimals);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, decimals, duration]);

  return ref;
}

type CountUpProps = {
  value: number;
  /** Decimal places to show — 0 for counts, 2 for KPI scores. */
  decimals?: number;
  /** Animation length in ms. */
  duration?: number;
  className?: string;
};

/** Counts up from 0 -> value on mount and on every value change (e.g. a KPI refresh). */
export function CountUp({ value, decimals = 0, duration = 900, className }: CountUpProps) {
  const ref = useCountUpNode<HTMLSpanElement>(value, decimals, duration);
  return (
    <span ref={ref} className={className}>
      {(0).toFixed(decimals)}
    </span>
  );
}

/** Same animation, rendered as an SVG <tspan> for numbers drawn inside chart <text> elements. */
export function CountUpTspan({ value, decimals = 0, duration = 900, className }: CountUpProps) {
  const ref = useCountUpNode<SVGTSpanElement>(value, decimals, duration);
  return (
    <tspan ref={ref} className={className}>
      {(0).toFixed(decimals)}
    </tspan>
  );
}
