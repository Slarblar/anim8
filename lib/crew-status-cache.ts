import type { CrewLocation, EmploymentType } from './crew-directory';
import { getKv } from './kv';

export type CrewStatusEntry = {
  name: string;
  status: 'in' | 'PTO' | 'WFH';
  note?: string;
  /** Crew directory email, when this entry came from a directory member — used to look up their Asana avatar. */
  email?: string;
  /** US / VN office — from the crew directory. Missing for calendar-only names not yet in the directory. */
  location?: CrewLocation;
  /** Full-time / part-time / contractor — from the crew directory. */
  employmentType?: EmploymentType;
  /** Contracted hours — used to map contractors to full- vs part-time on /crew. */
  weeklyContractedHours?: number;
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
