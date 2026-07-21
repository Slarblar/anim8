/**
 * Usage: npx tsx scripts/rename-client-slug.ts
 *
 * Edit OLD_SLUG / NEW_SLUG below, then run once.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const OLD_SLUG = 'turnemsideways-2026';
const NEW_SLUG = 'turnemsideways2026';

async function main() {
  const { renameClientLink } = await import('../lib/client-registry');
  const { clientPortalUrl, logClientPortalLinks } = await import('../lib/client-portal-url');

  const record = await renameClientLink(OLD_SLUG, NEW_SLUG);

  console.log(`Renamed ${OLD_SLUG} -> ${record.slug}`);
  logClientPortalLinks(record.slug);
  console.log(`Old link deactivated: ${clientPortalUrl(OLD_SLUG)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
