import { config } from 'dotenv';
config({ path: '.env.local' });
import { getKv } from '../lib/kv';
import type { CrewMember, WeekdayCode } from '../lib/crew-directory';

/**
 * One-time migration: fixedWfhCalendarEventIds used to be a flat string[]
 * (positional, matching fixedWfhDays by index). It's now a Partial<Record
 * <WeekdayCode, string>> keyed by day, so diffing on change only touches
 * days that actually flipped. This converts any already-saved array-shaped
 * records to the new map shape, preserving the day->eventId pairing.
 */
async function main() {
  const kv = getKv();
  const keys = await kv.keys('crew-directory:*');

  for (const key of keys) {
    const record = await kv.get<CrewMember>(key);
    if (!record) continue;

    const ids = record.fixedWfhCalendarEventIds as unknown;
    if (!Array.isArray(ids)) continue;

    const map: Partial<Record<WeekdayCode, string>> = {};
    record.fixedWfhDays.forEach((day, i) => {
      if (ids[i]) map[day] = ids[i];
    });

    console.log(`Migrating ${record.email}:`, ids, '->', map);
    await kv.set(key, { ...record, fixedWfhCalendarEventIds: map });
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
