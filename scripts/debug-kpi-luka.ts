import { config } from 'dotenv';

config({ path: '.env.local' });

import { getAllKPIData } from '../lib/kpi';
import { listCrewMembers } from '../lib/crew-directory';

async function main() {
  const [all, crew] = await Promise.all([getAllKPIData(), listCrewMembers()]);
  const lukaCrew = crew.filter((m) => /luka/i.test(m.name) || /luka/i.test(m.email));
  console.log('CREW_LUKA', JSON.stringify(lukaCrew, null, 2));

  const emails = Object.keys(all).filter((e) => /luka/i.test(e) || /luka/i.test(all[e]?.name ?? ''));
  console.log(
    'KPI_MATCHES',
    JSON.stringify(
      emails.map((e) => ({ email: e, summary: all[e] })),
      null,
      2
    )
  );

  const direct = all['luka.trinh@anim-8studios.com'];
  console.log('KPI_DIRECT', JSON.stringify(direct ?? null, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
