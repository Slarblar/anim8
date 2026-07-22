import { config } from 'dotenv';
config({ path: '.env.local' });
import { getKv } from '../lib/kv';

async function main() {
  const target = process.argv[2] ?? 'hello@anim-8studios.com';
  const kv = getKv();

  const keys = await kv.keys('crew-directory:*');
  console.log('All crew-directory keys:', keys);

  const normalized = `crew-directory:${target.trim().toLowerCase()}`;
  console.log('Looking up key:', normalized);
  const record = await kv.get(normalized);
  console.log('Record:', JSON.stringify(record, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
