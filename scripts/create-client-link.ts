/**
 * Usage: npx tsx scripts/create-client-link.ts
 *
 * Edit the `displayName` / `contactEmail` / `filters` below for the next
 * client you provision, run once, send them the printed link.
 *
 * Optional: pass `slug: 'clientname2026'` for a readable link instead of
 * a random slug.
 * Requires Redis env vars in .env.local — copy from Vercel Storage → your
 * Redis store → ".env.local" tab. Uses STORAGE_KV_REST_API_URL / TOKEN
 * (or KV_REST_API_URL / KV_REST_API_TOKEN if you renamed them).
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

function requireRedisEnv(): void {
  const url =
    process.env.STORAGE_KV_REST_API_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.STORAGE_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) return;

  console.error(
    [
      'Missing Redis credentials in .env.local.',
      '',
      'Your file should include (paste from Vercel Storage → Redis → .env.local tab):',
      '  STORAGE_KV_REST_API_URL=...',
      '  STORAGE_KV_REST_API_TOKEN=...',
      '',
      `Loaded from: ${resolve(process.cwd(), '.env.local')}`,
    ].join('\n')
  );
  process.exit(1);
}

async function main() {
  requireRedisEnv();

  const { createClientLink } = await import('../lib/client-registry');
  const { logClientPortalLinks } = await import('../lib/client-portal-url');

  const record = await createClientLink({
    displayName: 'TurnEmSideways',
    contactEmail: 'support@turnemsideways.gg',
    filters: [
      // Design Clients field -> TurnEmSideways option
      { fieldGid: '1212054697251949', optionGid: '1216688707029422' },
    ],
  });

  logClientPortalLinks(record.slug);
}

main();
