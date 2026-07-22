import 'server-only';
import { listCrewMembers } from '@/lib/crew-directory';
import { getAllKPIData } from '@/lib/kpi';
import type { AdminKpiPerson } from '@/lib/kpi-shared';

export type { AdminKpiPerson };

/** Join crew directory with cached Asana KPI aggregates, sorted for the admin board. */
export async function buildAdminKpiBoard(): Promise<AdminKpiPerson[]> {
  const [members, all] = await Promise.all([listCrewMembers(), getAllKPIData()]);
  const people: AdminKpiPerson[] = members.map((m) => {
    const email = m.email.toLowerCase();
    return {
      email: m.email,
      name: m.name,
      role: m.role,
      active: m.active,
      employmentType: m.employmentType,
      weeklyContractedHours: m.weeklyContractedHours,
      summary: all[email] ?? null,
    };
  });

  // Active crew first, then highest this-month score — empty KPI rows sink to the bottom.
  people.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const aScore = a.summary?.currentMonthScore ?? -1;
    const bScore = b.summary?.currentMonthScore ?? -1;
    if (bScore !== aScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });

  return people;
}
