import { getCrewEventsForDate, type CalendarStatusEntry } from './google-calendar';
import { listPendingPtoRequests, type PtoRequest } from './pto-requests';
import { listCurrentMeetingAttendance } from './crew-directory';
import { studioTodayDateString } from './studio-date';

export type WeeklyDigestAttendanceRow = {
  email: string;
  name: string;
  monthKey: string;
  late: number;
  absent: number;
};

export type WeeklyDigest = {
  weekStart: string;
  scheduleByDate: Array<{ date: string; entries: CalendarStatusEntry[] }>;
  pending: PtoRequest[];
  /** Current studio-month meeting late/absent counts (anyone with > 0). */
  meetingAttendance: WeeklyDigestAttendanceRow[];
};

/**
 * Monday of the week containing `asOf`, anchored to the studio's local day
 * (Vietnam) rather than raw UTC — the cron fires at 01:00 UTC (08:00 VN)
 * Monday, so this rarely disagrees in practice today, but pinning it to the
 * same studio-day helper used everywhere else keeps it correct if the cron
 * schedule ever moves closer to UTC midnight.
 */
function mondayOfWeek(asOf: Date): Date {
  const date = new Date(`${studioTodayDateString(asOf)}T00:00:00Z`);
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

/** This week's (Mon–Fri) approved PTO/WFH schedule, plus anything still awaiting approval. */
export async function buildWeeklyDigest(asOf: Date = new Date()): Promise<WeeklyDigest> {
  const monday = mondayOfWeek(asOf);
  const weekdays = [0, 1, 2, 3, 4].map((offset) => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });

  const [entriesByDate, pending, meetingAttendance] = await Promise.all([
    Promise.all(weekdays.map((date) => getCrewEventsForDate(date))),
    listPendingPtoRequests(),
    listCurrentMeetingAttendance(),
  ]);

  return {
    weekStart: weekdays[0],
    scheduleByDate: weekdays.map((date, i) => ({ date, entries: entriesByDate[i] })),
    pending,
    meetingAttendance,
  };
}
