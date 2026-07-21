/**
 * Usage: npx tsx scripts/rename-client-slug.ts
 *
 * Edit OLD_SLUG / NEW_SLUG below, then run once.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const OLD_SLUG = 'turnemsideways-xnp8gtgynu';
const NEW_SLUG = 'turnemsideways-2026';

async function main() {
  const { renameClientLink } = await import('../lib/client-registry');

  const record = await renameClientLink(OLD_SLUG, NEW_SLUG);

  console.log(`Renamed ${OLD_SLUG} -> ${record.slug}`);
  console.log(`Portal link: https://anim8studios.com/clients/${record.slug}`);
  console.log(`Old link deactivated: https://anim8studios.com/clients/${OLD_SLUG}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
