/** Public origins that serve this app (same Vercel deployment). */
export const CLIENT_PORTAL_ORIGINS = [
  'https://anim-8.xyz',
  'https://anim-8studios.com',
  'https://www.anim-8studios.com',
] as const;

export function clientPortalPath(slug: string): string {
  return `/clients/${slug}`;
}

export function clientPortalUrl(slug: string, origin: string = CLIENT_PORTAL_ORIGINS[0]): string {
  return `${origin}${clientPortalPath(slug)}`;
}

/** Log every live portal URL (for scripts / provisioning). */
export function logClientPortalLinks(slug: string, label = 'Portal links'): void {
  console.log(`${label}:`);
  for (const origin of CLIENT_PORTAL_ORIGINS) {
    console.log(`  ${clientPortalUrl(slug, origin)}`);
  }
}
