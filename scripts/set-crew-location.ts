import { config } from 'dotenv';
config({ path: '.env.local' });
import { setCrewMemberLocation, getCrewMember, type CrewLocation } from '../lib/crew-directory';

async function main() {
  const [email, location] = process.argv.slice(2) as [string, CrewLocation];
  if (!email || (location !== 'US' && location !== 'VN')) {
    console.error('Usage: tsx scripts/set-crew-location.ts <email> <US|VN>');
    process.exit(1);
  }
  const updated = await setCrewMemberLocation(email, location);
  console.log('Updated:', await getCrewMember(updated.email));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
