/**
 * Usage: npx tsx scripts/bulk-add-crew.ts "C:\path\to\file.csv"
 *
 * CSV format, no header required: `email,role` per line, e.g.
 *   Thi.do@anim-8studios.com,Content Manager
 *
 * Name is derived from the email's local part (dot-separated -> Title Case),
 * e.g. "thai.nguyen@..." -> "Thai Nguyen". No start date is set (the CSV
 * doesn't have one) — set each person's actual hire date afterward in
 * /admin/crew so monthly PTO accrual (which skips members with no
 * startDate) picks them up correctly.
 *
 * Requires Redis env vars in .env.local — see scripts/create-client-link.ts.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

function requireRedisEnv(): void {
  const url = process.env.STORAGE_KV_REST_API_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.STORAGE_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return;

  console.error(
    [
      'Missing Redis credentials in .env.local.',
      '',
      'Your file should include (paste from Vercel Storage → Redis → .env.local tab):',
      '  STORAGE_KV_REST_API_URL=...',
      '  STORAGE_KV_REST_API_TOKEN=...',
    ].join('\n')
  );
  process.exit(1);
}

function nameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  return localPart
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

type Row = { email: string; role: string; name: string };

function parseCsv(path: string): Row[] {
  const raw = readFileSync(path, 'utf-8');
  const rows: Row[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [emailRaw, roleRaw = ''] = trimmed.split(',');
    const email = emailRaw.trim().toLowerCase();
    if (!email || !email.includes('@')) continue; // skips blank/header rows

    rows.push({ email, role: roleRaw.trim(), name: nameFromEmail(email) });
  }

  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/bulk-add-crew.ts "C:\\path\\to\\file.csv"');
    process.exit(1);
  }

  requireRedisEnv();

  const { addOrUpdateCrewMember } = await import('../lib/crew-directory');
  const rows = parseCsv(resolve(csvPath));

  console.log(`Found ${rows.length} crew member(s) in ${csvPath}\n`);

  for (const row of rows) {
    try {
      await addOrUpdateCrewMember({ email: row.email, name: row.name, role: row.role });
      console.log(`✓ ${row.name.padEnd(20)} ${row.email.padEnd(35)} ${row.role}`);
    } catch (err) {
      console.error(`✗ ${row.email} — ${err instanceof Error ? err.message : 'failed'}`);
    }
  }

  console.log(
    '\nDone. Start dates were NOT set (CSV has none) — set each person\'s hire date in ' +
      '/admin/crew so monthly PTO accrual picks them up.'
  );
}

main();
