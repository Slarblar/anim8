import { unstable_cache } from 'next/cache';
import 'server-only';

/**
 * Crew KPI dashboard — pulls scored tasks from the 🐸 Anim8 KPI Asana
 * project and rolls them up per-person (matched by Asana assignee email,
 * same email crew members use to sign in at /crew).
 */

// ---- Config -----------------------------------------------------------
const KPI_PROJECT_GID = '1211974912397549'; // 🐸 Anim8 KPI

// How often Asana actually gets hit, in seconds. Everyone who loads the
// page in between gets the cached result instantly. 6 hours is plenty for
// data that only changes when tasks get marked complete.
const REVALIDATE_SECONDS = 60 * 60 * 6;

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) {
    throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  }
  return token;
}

// ---- Types --------------------------------------------------------------
type AsanaCustomField = {
  name: string;
  type: string;
  number_value: number | null;
  date_value: { date: string } | null;
  enum_value: { name: string } | null;
};

type AsanaTask = {
  gid: string;
  name: string;
  assignee: { gid: string; name: string; email: string } | null;
  custom_fields: AsanaCustomField[];
  completed: boolean;
  completed_at: string | null; // ISO timestamp
  modified_at: string; // ISO timestamp
};

export type PersonMonthlyKPI = {
  month: string; // 'YYYY-MM'
  label: string; // 'Jul' or 'Jan 2026' when the year changes
  score: number;
};

/** One rating bucket (Asana enum option, e.g. "5 - Excellent") + how many scored tasks landed in it. */
export type RatingCount = {
  rating: string;
  count: number;
};

export type PersonKPISummary = {
  name: string;
  email: string;
  ytdScore: number;
  ytdTasks: number;
  currentMonthScore: number;
  previousMonthScore: number;
  /** Full history, oldest first — used for long-range trend views. */
  monthly: PersonMonthlyKPI[];
  /** Jan 1 of the current year through the current month, zero-filled — for the YTD line chart. */
  ytdMonthly: PersonMonthlyKPI[];
  qualityRatingsLast3Months: RatingCount[];
  collaborationRatingsLast3Months: RatingCount[];
};

// ---- Helpers --------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Fixed display order for both rating fields — best to worst, matching the Asana enum options exactly. */
const RATING_ORDER = ['5 - Excellent', '4 - Very Good', '3 - Good', '2 - Fair', '1 - Poor'];

function getField(task: AsanaTask, name: string) {
  return task.custom_fields.find((f) => f.name === name);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function monthKeyOf(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, '0')}`;
}

/** Jan of `now`'s year through `now`'s month, filling in 0 for months with no scored tasks. */
function buildYtdMonthly(monthly: Map<string, number>, now: Date): PersonMonthlyKPI[] {
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const result: PersonMonthlyKPI[] = [];
  for (let month = 1; month <= currentMonth; month++) {
    const key = monthKeyOf(year, month);
    result.push({ month: key, label: MONTHS[month - 1], score: round2(monthly.get(key) ?? 0) });
  }
  return result;
}

/** Fills in every rating bucket (even ones with zero tasks) so charts always show the full 5-point scale. */
function buildRatingBreakdown(counts: Map<string, number>): RatingCount[] {
  return RATING_ORDER.map((rating) => ({ rating, count: counts.get(rating) ?? 0 }));
}

// ---- Fetch every task in the KPI project (paginated) ----------------------
async function fetchAllKPITasks(): Promise<AsanaTask[]> {
  const tasks: AsanaTask[] = [];
  let offset: string | undefined;

  const optFields = [
    'name',
    'assignee.name',
    'assignee.email',
    'custom_fields.name',
    'custom_fields.type',
    'custom_fields.number_value',
    'custom_fields.date_value',
    'custom_fields.enum_value.name',
    'completed',
    'completed_at',
    'modified_at',
  ].join(',');

  do {
    const url = new URL(`https://app.asana.com/api/1.0/projects/${KPI_PROJECT_GID}/tasks`);
    url.searchParams.set('opt_fields', optFields);
    url.searchParams.set('limit', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      throw new Error(`Asana API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks;
}

// ---- Aggregate into a per-person, per-month KPI map ------------------------
function aggregateByPerson(tasks: AsanaTask[]): Record<string, PersonKPISummary> {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevRef.getFullYear()}-${String(prevRef.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = now.getFullYear();

  // "Last 3 months" for the rating donuts = current calendar month + the two before it.
  const last3MonthsRef = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const last3MonthsCutoffKey = monthKeyOf(last3MonthsRef.getFullYear(), last3MonthsRef.getMonth() + 1);

  type Draft = {
    name: string;
    email: string;
    monthly: Map<string, number>;
    ytdTasks: number;
    ytdScore: number;
    qualityRatings: Map<string, number>;
    collaborationRatings: Map<string, number>;
  };
  const byPerson = new Map<string, Draft>();

  for (const task of tasks) {
    if (!task.assignee?.email) continue;

    const scoreField = getField(task, 'Total KPI Score');
    const score = scoreField?.number_value ?? 0;
    if (!score) continue; // not scored yet, nothing to bucket

    // Date fallback chain, most reliable first:
    // 1. Explicit "Completion Date" field, when someone's filled it in
    // 2. Asana's own completed_at timestamp (only moves when the task is
    //    actually checked off, so it stays meaningful for older tasks)
    // 3. modified_at as a last resort, for scored tasks never formally
    //    marked complete in Asana
    const dateField = getField(task, 'Completion Date');
    const explicitDate = dateField?.date_value?.date;

    let dateStr: string | undefined;
    if (explicitDate) {
      dateStr = explicitDate;
    } else if (task.completed && task.completed_at) {
      dateStr = task.completed_at.slice(0, 10);
    } else if (task.modified_at) {
      dateStr = task.modified_at.slice(0, 10);
    }

    if (!dateStr) continue;

    const monthKey = dateStr.slice(0, 7);
    const year = Number(dateStr.slice(0, 4));
    const email = task.assignee.email;

    if (!byPerson.has(email)) {
      byPerson.set(email, {
        name: task.assignee.name,
        email,
        monthly: new Map(),
        ytdTasks: 0,
        ytdScore: 0,
        qualityRatings: new Map(),
        collaborationRatings: new Map(),
      });
    }

    const person = byPerson.get(email)!;
    person.monthly.set(monthKey, (person.monthly.get(monthKey) ?? 0) + score);

    if (year === currentYear) {
      person.ytdScore += score;
      person.ytdTasks += 1;
    }

    if (monthKey >= last3MonthsCutoffKey) {
      const quality = getField(task, 'Quality Rating')?.enum_value?.name;
      if (quality) person.qualityRatings.set(quality, (person.qualityRatings.get(quality) ?? 0) + 1);

      const collaboration = getField(task, 'Collaboration Rating')?.enum_value?.name;
      if (collaboration) {
        person.collaborationRatings.set(collaboration, (person.collaborationRatings.get(collaboration) ?? 0) + 1);
      }
    }
  }

  const result: Record<string, PersonKPISummary> = {};

  for (const [email, person] of byPerson) {
    const sortedMonths = Array.from(person.monthly.keys()).sort();
    let lastYear: number | null = null;

    const monthly: PersonMonthlyKPI[] = sortedMonths.map((m) => {
      const [yStr, mStr] = m.split('-');
      const year = Number(yStr);
      const monthNum = Number(mStr);
      const label = lastYear === null || year !== lastYear ? `${MONTHS[monthNum - 1]} ${year}` : MONTHS[monthNum - 1];
      lastYear = year;
      return { month: m, label, score: round2(person.monthly.get(m)!) };
    });

    result[email] = {
      name: person.name,
      email,
      ytdScore: round2(person.ytdScore),
      ytdTasks: person.ytdTasks,
      currentMonthScore: round2(person.monthly.get(currentMonthKey) ?? 0),
      previousMonthScore: round2(person.monthly.get(prevMonthKey) ?? 0),
      monthly,
      ytdMonthly: buildYtdMonthly(person.monthly, now),
      qualityRatingsLast3Months: buildRatingBreakdown(person.qualityRatings),
      collaborationRatingsLast3Months: buildRatingBreakdown(person.collaborationRatings),
    };
  }

  return result;
}

// ---- Public API -------------------------------------------------------
// Cached across ALL visitors — Asana only gets hit once per revalidation
// window no matter how many crew members load the page.
export const getAllKPIData = unstable_cache(
  async () => {
    const tasks = await fetchAllKPITasks();
    return aggregateByPerson(tasks);
  },
  ['crew-kpi-data'],
  { revalidate: REVALIDATE_SECONDS, tags: ['kpi'] }
);

/**
 * Testing-only account -> real Asana email overrides. The `hello@` login is
 * a shared test account (not a real crew member with tasks assigned in
 * Asana), so it borrows a real person's KPI data to exercise the dashboard.
 * Remove the relevant entry once the test account isn't needed anymore.
 */
const TEST_ACCOUNT_OVERRIDES: Record<string, string> = {
  'hello@anim-8studios.com': 'thi.do@anim-8studios.com',
};

export async function getKPIDataForUser(email: string): Promise<PersonKPISummary | null> {
  const normalized = email.toLowerCase();
  const lookupEmail = TEST_ACCOUNT_OVERRIDES[normalized] ?? normalized;

  const all = await getAllKPIData();
  return all[lookupEmail] ?? all[email] ?? null;
}
