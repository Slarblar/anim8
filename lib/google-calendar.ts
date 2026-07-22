import { google } from 'googleapis';
import 'server-only';
import type { WeekdayCode } from './crew-directory';

/**
 * Google Calendar sync for PTO/WFH — uses a service account (not domain-wide
 * delegation). The service account must be added as an editor on your shared
 * team calendar: Calendar settings -> "Share with specific people" -> add the
 * service account email with "Make changes to events" permission.
 *
 * Required env vars: GOOGLE_CALENDAR_SA_EMAIL, GOOGLE_CALENDAR_SA_PRIVATE_KEY,
 * GOOGLE_CALENDAR_ID. See .env.local.example.
 */

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getAuth() {
  const email = process.env.GOOGLE_CALENDAR_SA_EMAIL;
  const rawKey = process.env.GOOGLE_CALENDAR_SA_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      'Missing GOOGLE_CALENDAR_SA_EMAIL / GOOGLE_CALENDAR_SA_PRIVATE_KEY env vars.'
    );
  }

  // Env vars often store the PEM key with literal "\n" — unescape if needed.
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  return new google.auth.JWT({ email, key: privateKey, scopes: SCOPES });
}

function getCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw new Error('Missing GOOGLE_CALENDAR_ID env var.');
  return id;
}

function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

/** All-day events are exclusive on the end date in the Calendar API. */
function nextDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export type PtoCalendarEventInput = {
  type: 'PTO' | 'WFH';
  employeeName: string;
  startDate: string;
  endDate: string;
  requestId: string;
  note?: string;
};

export async function createPtoCalendarEvent(input: PtoCalendarEventInput): Promise<string> {
  const calendar = getCalendarClient();
  const emoji = input.type === 'PTO' ? '🌴' : '🏠';

  const res = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: `${emoji} ${input.type} — ${input.employeeName}`,
      description: input.note || undefined,
      start: { date: input.startDate },
      end: { date: nextDay(input.endDate) },
      // 11 = tomato (red) for PTO, 9 = blueberry for WFH — Google's fixed colorId palette.
      colorId: input.type === 'PTO' ? '11' : '9',
      extendedProperties: {
        private: {
          anim8PortalRequestId: input.requestId,
          anim8PortalType: input.type,
          anim8PortalEmployeeName: input.employeeName,
        },
      },
    },
  });

  if (!res.data.id) throw new Error('Google Calendar did not return an event id.');
  return res.data.id;
}

const WEEKDAY_RRULE_CODE: Record<WeekdayCode, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
};

// JS Date#getUTCDay(): Sun=0, Mon=1, ... Sat=6.
const WEEKDAY_NUMBER: Record<WeekdayCode, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

/** Next date (today included) that falls on the given weekday, as YYYY-MM-DD (UTC). */
function nextOccurrenceOf(day: WeekdayCode): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diff = (WEEKDAY_NUMBER[day] - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Creates a weekly-recurring all-day WFH event for a standing (fixed)
 * schedule day — e.g. "every Monday". One event series per selected weekday
 * (simpler and more predictable than a single multi-BYDAY series). Returns
 * the master event ID, which also deletes the whole series via
 * deleteCalendarEvent when the schedule changes.
 */
export async function createFixedWfhCalendarEvent(input: {
  employeeName: string;
  day: WeekdayCode;
}): Promise<string> {
  const calendar = getCalendarClient();
  const startDate = nextOccurrenceOf(input.day);

  const res = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: `🏠 WFH — ${input.employeeName}`,
      description: 'Standing work-from-home day (fixed schedule) — set in the Anim-8 admin portal.',
      start: { date: startDate },
      end: { date: nextDay(startDate) },
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${WEEKDAY_RRULE_CODE[input.day]}`],
      // 9 = blueberry, same colorId used for ad-hoc WFH requests.
      colorId: '9',
      extendedProperties: {
        private: {
          anim8PortalType: 'WFH',
          anim8PortalEmployeeName: input.employeeName,
          anim8PortalFixedSchedule: 'true',
        },
      },
    },
  });

  if (!res.data.id) throw new Error('Google Calendar did not return an event id.');
  return res.data.id;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient();
  try {
    await calendar.events.delete({ calendarId: getCalendarId(), eventId });
  } catch {
    // Already deleted or not found — safe to ignore.
  }
}

export type CalendarStatusEntry = {
  name: string;
  type: 'PTO' | 'WFH';
  note?: string;
};

/**
 * Reads a single day's events and classifies them by the private metadata
 * this portal writes, with a documented naming-convention fallback ("PTO —
 * Name" / "WFH — Name") for anything added directly in Google Calendar.
 */
export async function getCrewEventsForDate(dateStr: string): Promise<CalendarStatusEntry[]> {
  const calendar = getCalendarClient();

  const res = await calendar.events.list({
    calendarId: getCalendarId(),
    timeMin: `${dateStr}T00:00:00Z`,
    timeMax: `${nextDay(dateStr)}T00:00:00Z`,
    singleEvents: true,
    maxResults: 250,
  });

  const entries: CalendarStatusEntry[] = [];

  for (const event of res.data.items ?? []) {
    const props = event.extendedProperties?.private;
    const portalType = props?.anim8PortalType;
    const summary = event.summary ?? '';

    if (portalType === 'PTO' || portalType === 'WFH') {
      entries.push({
        name: props?.anim8PortalEmployeeName || summary,
        type: portalType,
        note: event.description ?? undefined,
      });
      continue;
    }

    const fallbackMatch = summary.match(/(?:^|\s)(PTO|WFH)\s*[—-]\s*(.+)$/i);
    if (fallbackMatch) {
      entries.push({
        name: fallbackMatch[2].trim(),
        type: fallbackMatch[1].toUpperCase() as 'PTO' | 'WFH',
      });
    }
  }

  return entries;
}
