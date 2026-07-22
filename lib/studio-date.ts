/**
 * "Today" for the crew status board — anchored to the studio's local day
 * (Vietnam, where most of the crew is based) rather than raw UTC. Using
 * `new Date().toISOString().slice(0, 10)` (as this used to do) drifts a
 * calendar day off from Vietnam's actual day for a chunk of every 24h
 * (VN is UTC+7, so VN flips to a new day while UTC is still on the
 * previous one), which could show the wrong recurring WFH/PTO events as
 * "today" for part of the day.
 */
const STUDIO_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function studioTodayDateString(now: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD directly, no manual reformatting needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TIME_ZONE }).format(now);
}
