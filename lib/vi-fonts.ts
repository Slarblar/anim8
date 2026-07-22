import { Be_Vietnam_Pro, Noto_Sans } from 'next/font/google';

/** Primary crew/admin Vietnamese UI face — full weight range for headings + body. */
export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

/** Reliable fallback when a glyph/weight isn't in Be Vietnam Pro (or still loading). */
export const notoSans = Noto_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

/** Shared stack for CSS — Be Vietnam Pro first, Noto Sans second, then system. */
export const viFontStack =
  'var(--font-be-vietnam), var(--font-noto-sans), "Segoe UI", system-ui, sans-serif';
