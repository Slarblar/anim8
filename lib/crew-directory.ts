import { getKv } from './kv';

export type CrewMember = {
  email: string;
  name: string;
  /** Free-text job title, e.g. "3D Artist", "Producer". */
  role: string;
  startDate: string | null;
  active: boolean;
  createdAt: string;
};

const KEY_PREFIX = 'crew-directory:';

function keyFor(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

export async function getCrewMember(email: string): Promise<CrewMember | null> {
  if (!email) return null;
  return getKv().get<CrewMember>(keyFor(email));
}

/** Gate check for /crew access — safe to call from edge middleware. */
export async function isCrewMemberEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const member = await getCrewMember(email);
  return !!member?.active;
}

/** Admin — full crew directory, newest first. */
export async function listCrewMembers(): Promise<CrewMember[]> {
  const keys = await getKv().keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return [];

  const records = await Promise.all(keys.map((key) => getKv().get<CrewMember>(key)));
  return records
    .filter((record): record is CrewMember => !!record)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addOrUpdateCrewMember(input: {
  email: string;
  name: string;
  role: string;
  startDate?: string | null;
}): Promise<CrewMember> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    throw new Error('Name and email are required.');
  }

  const existing = await getCrewMember(email);
  const record: CrewMember = {
    email,
    name,
    role: input.role.trim(),
    startDate: input.startDate ?? existing?.startDate ?? null,
    active: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  await getKv().set(keyFor(email), record);
  return record;
}

export async function setCrewMemberActive(email: string, active: boolean): Promise<void> {
  const existing = await getCrewMember(email);
  if (!existing) throw new Error(`No crew member found for email: ${email}`);
  await getKv().set(keyFor(email), { ...existing, active });
}
