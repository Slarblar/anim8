import { config } from 'dotenv';
config({ path: '.env.local' });

// google-calendar.ts imports 'server-only', which unconditionally throws
// outside Next's bundler (it's normally aliased away there). Stub it for
// this standalone script.
import Module from 'module';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalLoad = (Module as any)._load;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module as any)._load = function (request: string, ...rest: any[]) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...rest);
};

async function main() {
  const { getCrewMember, setCrewMemberFixedWfh } = await import('../lib/crew-directory');
  const { deleteCalendarEvent } = await import('../lib/google-calendar');

  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx scripts/clear-fixed-wfh.ts <email>');
    process.exit(1);
  }

  const member = await getCrewMember(email);
  if (!member) {
    console.error('No crew member found for', email);
    process.exit(1);
  }

  const ids = Object.values(member.fixedWfhCalendarEventIds).filter(Boolean) as string[];
  console.log(`Deleting ${ids.length} recurring calendar event(s) for ${member.name}:`, ids);
  await Promise.all(ids.map((id) => deleteCalendarEvent(id)));

  const updated = await setCrewMemberFixedWfh(email, [], {});
  console.log('Updated record:', JSON.stringify(updated, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
