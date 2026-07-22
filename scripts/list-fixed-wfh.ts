import { config } from 'dotenv';
config({ path: '.env.local' });
import { listCrewMembers } from '../lib/crew-directory';

async function main() {
  const all = await listCrewMembers();
  for (const m of all) {
    if (m.fixedWfhDays.length > 0) {
      console.log(`${m.name} <${m.email}> — location: ${m.location} — fixed WFH days: ${m.fixedWfhDays.join(', ')}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
