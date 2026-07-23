import 'server-only';
import { getCrewMember, listCrewMembers } from '@/lib/crew-directory';
import { getAllKPIData } from '@/lib/kpi';
import type { AdminKpiPerson } from '@/lib/kpi-shared';

export type { AdminKpiPerson };

function toAdminKpiPerson(
  member: {
    email: string;
    name: string;
    role: string;
    level: string;
    active: boolean;
    employmentType: AdminKpiPerson['employmentType'];
    weeklyContractedHours: number;
  },
  summary: AdminKpiPerson['summary']
): AdminKpiPerson {
  return {
    email: member.email,
    name: member.name,
    role: member.role,
    level: member.level,
    active: member.active,
    employmentType: member.employmentType,
    weeklyContractedHours: member.weeklyContractedHours,
    summary,
  };
}

/** Join crew directory with cached Asana KPI aggregates, sorted for the admin board. */
export async function buildAdminKpiBoard(): Promise<AdminKpiPerson[]> {
  const [members, all] = await Promise.all([listCrewMembers(), getAllKPIData()]);
  const people: AdminKpiPerson[] = members.map((m) =>
    toAdminKpiPerson(m, all[m.email.toLowerCase()] ?? null)
  );

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

/** One crew member's KPI profile for /admin/kpi/[email]. */
export async function getAdminKpiPerson(email: string): Promise<AdminKpiPerson | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const [member, all] = await Promise.all([getCrewMember(normalized), getAllKPIData()]);
  if (!member) return null;

  return toAdminKpiPerson(member, all[normalized] ?? null);
}
