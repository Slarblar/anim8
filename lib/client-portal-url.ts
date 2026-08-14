/** Public origins that serve this app (same Vercel deployment). */
export const CLIENT_PORTAL_ORIGINS = [
  'https://anim-8studios.com',
  'https://www.anim-8studios.com',
  'https://anim-8.xyz',
] as const;

export function clientPortalPath(slug: string): string {
  return `/clients/${slug}`;
}

export function clientPortalUrl(slug: string, origin: string = CLIENT_PORTAL_ORIGINS[0]): string {
  return `${origin}${clientPortalPath(slug)}`;
}

/** Origin for links in client emails — prefers .com over a legacy .xyz APP_BASE_URL. */
export function publicAppOrigin(): string {
  const configured = process.env.APP_BASE_URL?.replace(/\/+$/, '');
  if (!configured) {
    return process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? CLIENT_PORTAL_ORIGINS[0]
      : 'http://localhost:3000';
  }
  try {
    const host = new URL(configured).hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'anim-8.xyz') return CLIENT_PORTAL_ORIGINS[0];
  } catch {
    /* keep configured */
  }
  return configured;
}

/** Log every live portal URL (for scripts / provisioning). */
export function logClientPortalLinks(slug: string, label = 'Portal links'): void {
  console.log(`${label}:`);
  for (const origin of CLIENT_PORTAL_ORIGINS) {
    console.log(`  ${clientPortalUrl(slug, origin)}`);
  }
}
