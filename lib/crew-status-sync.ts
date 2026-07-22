import { getCrewEventsForDate } from './google-calendar';
import { listCrewMembers } from './crew-directory';
import {
  setCrewStatusSnapshot,
  type CrewStatusEntry,
  type CrewStatusSnapshot,
} from './crew-status-cache';

/** Pulls today's calendar events and merges them with the crew directory into a status snapshot. */
export async function syncCrewStatusForDate(date: string): Promise<CrewStatusSnapshot> {
  const [events, members] = await Promise.all([getCrewEventsForDate(date), listCrewMembers()]);

  const outByName = new Map<string, CrewStatusEntry>();
  for (const event of events) {
    const key = event.name.trim().toLowerCase();
    // A one-off PTO request always wins over a standing fixed-WFH day if they land on the same date.
    if (outByName.get(key)?.status === 'PTO' && event.type === 'WFH') continue;
    outByName.set(key, {
      name: event.name,
      status: event.type,
      note: event.note,
    });
  }

  const activeMembers = members.filter((member) => member.active);
  const entries: CrewStatusEntry[] = activeMembers.map((member) => {
    const key = member.name.trim().toLowerCase();
    return outByName.get(key) ?? { name: member.name, status: 'in' };
  });

  // Anyone out/WFH on the calendar but not (yet) in the directory — surface them anyway.
  const directoryNames = new Set(activeMembers.map((member) => member.name.trim().toLowerCase()));
  for (const [key, entry] of outByName) {
    if (!directoryNames.has(key)) entries.push(entry);
  }

  const snapshot: CrewStatusSnapshot = {
    date,
    entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
    updatedAt: new Date().toISOString(),
  };

  await setCrewStatusSnapshot(snapshot);
  return snapshot;
}
