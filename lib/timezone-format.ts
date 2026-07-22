/**
 * Shared timezone-formatting for anywhere we show a specific clock time
 * (PTO request submitted/decided timestamps) to people split between
 * Vietnam (crew) and the US (admin leadership) — one instant, but every
 * reader's own wall-clock time is different.
 *
 * Rather than an unlabeled "local" time (ambiguous — whose local time is
 * it?) or picking one fixed zone (wrong for half the audience), we always
 * show BOTH, explicitly labeled. This matters most in emails, which are
 * static HTML and can't detect the reader's timezone at all, but we use the
 * same formatting on decision confirmation pages too for consistency.
 *
 * No `server-only` import here on purpose — this is plain, side-effect-free
 * date math with no server-only APIs, so it can be called directly from
 * server code (emails, API routes) *and* imported into a 'use client'
 * component if a page ever needs it client-side.
 */

/** Matches STUDIO_TIME_ZONE in lib/studio-date.ts — kept as a separate constant to avoid pulling in that module's server-only-adjacent surface. */
export const STUDIO_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/**
 * Defaults to Mountain Time. Override with NEXT_PUBLIC_ADMIN_TIME_ZONE (an
 * IANA zone name, e.g. "America/New_York") if leadership is based elsewhere.
 * Uses the NEXT_PUBLIC_ prefix so the same value is available both in
 * server code and in the browser, since Next.js only inlines
 * NEXT_PUBLIC_-prefixed env vars into client bundles.
 */
export const ADMIN_TIME_ZONE = process.env.NEXT_PUBLIC_ADMIN_TIME_ZONE || 'America/Denver';

function formatInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** e.g. "Jul 22, 2:15 PM GMT+7 · Jul 21, 11:15 PM MDT" */
export function formatBothTimeZones(iso: string): string {
  return `${formatInZone(iso, STUDIO_TIME_ZONE)} · ${formatInZone(iso, ADMIN_TIME_ZONE)}`;
}
