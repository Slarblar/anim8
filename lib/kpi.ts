import { unstable_cache } from 'next/cache';
import 'server-only';
import {
  fteRatioForMember,
  listCrewMembers,
  type EmploymentType,
} from './crew-directory';
import {
  performanceBand,
  type PersonKPISummary,
  type PersonMonthlyKPI,
  type RatingCount,
} from './kpi-shared';

export type {
  PerformanceBand,
  PersonKPISummary,
  PersonMonthlyKPI,
  RatingCount,
} from './kpi-shared';
export { performanceBand, performanceBandLabel } from './kpi-shared';

/**
 * Crew KPI dashboard — pulls scored tasks from the 🐸 Anim8 KPI Asana
 * project and rolls them up per-person (matched by Asana assignee email,
 * same email crew members use to sign in at /crew).
 *
 * Includes nested subtasks under project tasks so multi-assignee breakdowns
 * (e.g. Phrogger shot lists) credit each subtask assignee. Parent tasks keep
 * their own score too — the parent assignee tracks supervisor / coordinator
 * ownership on that line item.
 *
 * Scoring follows Anim8 KPI Scoring Documentation 2026 v2 §2 + §5:
 *   Total = ([Effort ÷ FTE] × Quality × Collaboration) + [Delivery ÷ FTE] + R&D
 * where FTE = weekly contracted hours ÷ 40. Quality / Collaboration /
 * R&D are not volume-scaled — only Effort and Delivery are.
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
  parent: { gid: string } | null;
  num_subtasks?: number;
  custom_fields: AsanaCustomField[];
  completed: boolean;
  completed_at: string | null; // ISO timestamp
  modified_at: string; // ISO timestamp
};

const TASK_OPT_FIELDS = [
  'name',
  'assignee.name',
  'assignee.email',
  'parent.gid',
  'num_subtasks',
  'custom_fields.name',
  'custom_fields.type',
  'custom_fields.number_value',
  'custom_fields.date_value',
  'custom_fields.enum_value.name',
  'completed',
  'completed_at',
  'modified_at',
].join(',');

/** Max parallel Asana subtask fetches per refresh — keeps us under rate limits. */
const SUBTASK_FETCH_CONCURRENCY = 8;

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

/**
 * Per-task score with FTE normalization (doc §5).
 * Effort + Delivery are volume-driven → ÷ FTE.
 * Quality/Collaboration multipliers and R&D are schedule-independent → untouched.
 */
function scoreTask(task: AsanaTask, fteRatio: number): number | null {
  const qualityPts = getField(task, 'Quality Points')?.number_value;
  const collabPts = getField(task, 'Collaboration Points')?.number_value;
  const effortPts = getField(task, 'Effort Points')?.number_value ?? 0;
  const deliveryPts = getField(task, 'Delivery Bonus')?.number_value ?? 0;
  const rndPts = getField(task, 'R&D Points')?.number_value ?? 0;
  const asanaTotal = getField(task, 'Total KPI Score')?.number_value;

  if (qualityPts != null && collabPts != null) {
    const qualityMult = qualityPts / 10;
    const collabMult = collabPts / 10;
    return (
      (effortPts / fteRatio) * qualityMult * collabMult + deliveryPts / fteRatio + rndPts
    );
  }

  // Older / incomplete tasks sometimes only have the rolled-up Total KPI Score.
  // At FTE 1.0 that's already correct; otherwise scale as a best-effort approximation.
  if (asanaTotal) {
    return fteRatio === 1 ? asanaTotal : asanaTotal / fteRatio;
  }

  return null;
}

function withBand(month: string, label: string, score: number): PersonMonthlyKPI {
  return { month, label, score: round2(score), band: performanceBand(score) };
}

/** Jan of `now`'s year through `now`'s month, filling in 0 for months with no scored tasks. */
function buildYtdMonthly(monthly: Map<string, number>, now: Date): PersonMonthlyKPI[] {
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const result: PersonMonthlyKPI[] = [];
  for (let month = 1; month <= currentMonth; month++) {
    const key = monthKeyOf(year, month);
    const score = monthly.get(key) ?? 0;
    result.push(withBand(key, MONTHS[month - 1], score));
  }
  return result;
}

/** Fills in every rating bucket (even ones with zero tasks) so charts always show the full 5-point scale. */
function buildRatingBreakdown(counts: Map<string, number>): RatingCount[] {
  return RATING_ORDER.map((rating) => ({ rating, count: counts.get(rating) ?? 0 }));
}

/** The current month + the `count - 1` before it, zero-filled — same window as the rating donuts. */
function buildLastNMonths(monthly: Map<string, number>, now: Date, count: number): PersonMonthlyKPI[] {
  const result: PersonMonthlyKPI[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyOf(ref.getFullYear(), ref.getMonth() + 1);
    const label =
      ref.getFullYear() === now.getFullYear()
        ? MONTHS[ref.getMonth()]
        : `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`;
    result.push(withBand(key, label, monthly.get(key) ?? 0));
  }
  return result;
}

function taskCompletionDate(task: AsanaTask): string | undefined {
  const explicitDate = getField(task, 'Completion Date')?.date_value?.date;
  if (explicitDate) return explicitDate;
  if (task.completed && task.completed_at) return task.completed_at.slice(0, 10);
  if (task.modified_at) return task.modified_at.slice(0, 10);
  return undefined;
}

async function fetchPaginatedAsanaTasks(url: URL): Promise<AsanaTask[]> {
  const tasks: AsanaTask[] = [];
  let offset: string | undefined;

  do {
    if (offset) url.searchParams.set('offset', offset);
    else url.searchParams.delete('offset');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      throw new Error(`Asana API error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as { data: AsanaTask[]; next_page?: { offset: string } };
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks;
}

async function fetchSubtasksForTask(taskGid: string): Promise<AsanaTask[]> {
  const url = new URL(`https://app.asana.com/api/1.0/tasks/${taskGid}/subtasks`);
  url.searchParams.set('opt_fields', TASK_OPT_FIELDS);
  url.searchParams.set('limit', '100');
  return fetchPaginatedAsanaTasks(url);
}

/** Every task in the KPI project, plus all nested subtasks (deduped by gid). */
async function fetchAllKPITasks(): Promise<AsanaTask[]> {
  const projectUrl = new URL(`https://app.asana.com/api/1.0/projects/${KPI_PROJECT_GID}/tasks`);
  projectUrl.searchParams.set('opt_fields', TASK_OPT_FIELDS);
  projectUrl.searchParams.set('limit', '100');

  const projectTasks = await fetchPaginatedAsanaTasks(projectUrl);
  const byGid = new Map<string, AsanaTask>();
  for (const task of projectTasks) byGid.set(task.gid, task);

  const fetchedSubtasksFor = new Set<string>();
  let queue = [...byGid.keys()];

  while (queue.length > 0) {
    const batch = queue.splice(0, SUBTASK_FETCH_CONCURRENCY);
    const toFetch = batch.filter((gid) => {
      if (fetchedSubtasksFor.has(gid)) return false;
      fetchedSubtasksFor.add(gid);
      return (byGid.get(gid)?.num_subtasks ?? 0) > 0;
    });

    const nested = await Promise.all(toFetch.map((gid) => fetchSubtasksForTask(gid)));
    for (const subtasks of nested) {
      for (const subtask of subtasks) {
        if (!byGid.has(subtask.gid)) {
          byGid.set(subtask.gid, subtask);
          queue.push(subtask.gid);
        }
      }
    }
  }

  return [...byGid.values()];
}

type FteLookup = {
  fteRatio: number;
  weeklyContractedHours: number;
  employmentType: EmploymentType;
};

// ---- Aggregate into a per-person, per-month KPI map ------------------------
function aggregateByPerson(
  tasks: AsanaTask[],
  fteByEmail: Record<string, FteLookup>
): Record<string, PersonKPISummary> {
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
    fte: FteLookup;
  };
  const byPerson = new Map<string, Draft>();

  for (const task of tasks) {
    if (!task.assignee?.email) continue;

    const email = task.assignee.email;
    const emailKey = email.toLowerCase();
    const fte = fteByEmail[emailKey] ?? {
      fteRatio: 1,
      weeklyContractedHours: 40,
      employmentType: 'full_time' as const,
    };

    const score = scoreTask(task, fte.fteRatio);
    if (score == null || score === 0) continue; // not scored yet, nothing to bucket

    const dateStr = taskCompletionDate(task);
    if (!dateStr) continue;

    const monthKey = dateStr.slice(0, 7);
    const year = Number(dateStr.slice(0, 4));

    if (!byPerson.has(email)) {
      byPerson.set(email, {
        name: task.assignee.name,
        email,
        monthly: new Map(),
        ytdTasks: 0,
        ytdScore: 0,
        qualityRatings: new Map(),
        collaborationRatings: new Map(),
        fte,
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
      return withBand(m, label, person.monthly.get(m)!);
    });

    const currentMonthScore = person.monthly.get(currentMonthKey) ?? 0;
    const previousMonthScore = person.monthly.get(prevMonthKey) ?? 0;

    result[email] = {
      name: person.name,
      email,
      ytdScore: round2(person.ytdScore),
      ytdTasks: person.ytdTasks,
      currentMonthScore: round2(currentMonthScore),
      previousMonthScore: round2(previousMonthScore),
      currentMonthBand: performanceBand(currentMonthScore),
      previousMonthBand: performanceBand(previousMonthScore),
      fteRatio: round2(person.fte.fteRatio),
      weeklyContractedHours: person.fte.weeklyContractedHours,
      employmentType: person.fte.employmentType,
      monthly,
      lastThreeMonthly: buildLastNMonths(person.monthly, now, 3),
      ytdMonthly: buildYtdMonthly(person.monthly, now),
      qualityRatingsLast3Months: buildRatingBreakdown(person.qualityRatings),
      collaborationRatingsLast3Months: buildRatingBreakdown(person.collaborationRatings),
    };
  }

  return result;
}

async function buildFteLookup(): Promise<Record<string, FteLookup>> {
  const members = await listCrewMembers();
  const lookup: Record<string, FteLookup> = {};
  for (const member of members) {
    lookup[member.email.toLowerCase()] = {
      fteRatio: fteRatioForMember(member),
      weeklyContractedHours: member.weeklyContractedHours,
      employmentType: member.employmentType,
    };
  }
  return lookup;
}

// ---- Public API -------------------------------------------------------
// Cached across ALL visitors — Asana only gets hit once per revalidation
// window no matter how many crew members load the page.
export const getAllKPIData = unstable_cache(
  async () => {
    const [tasks, fteByEmail] = await Promise.all([fetchAllKPITasks(), buildFteLookup()]);
    return aggregateByPerson(tasks, fteByEmail);
  },
  ['crew-kpi-data-v5-bands-v2'],
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
