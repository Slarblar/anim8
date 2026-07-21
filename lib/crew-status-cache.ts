import { getKv } from './kv';

export type CrewStatusEntry = {
  name: string;
  status: 'in' | 'PTO' | 'WFH';
  note?: string;
};

export type CrewStatusSnapshot = {
  date: string;
  entries: CrewStatusEntry[];
  updatedAt: string;
};

const KEY_PREFIX = 'crew-status-snapshot:';

export async function getCrewStatusSnapshot(date: string): Promise<CrewStatusSnapshot | null> {
  return getKv().get<CrewStatusSnapshot>(`${KEY_PREFIX}${date}`);
}

export async function setCrewStatusSnapshot(snapshot: CrewStatusSnapshot): Promise<void> {
  // Keep KV tidy — daily snapshots older than a few days aren't useful.
  await getKv().set(`${KEY_PREFIX}${snapshot.date}`, snapshot, { ex: 60 * 60 * 24 * 3 });
}
