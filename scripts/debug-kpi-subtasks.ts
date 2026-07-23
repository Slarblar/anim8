import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * Smoke-test subtask-inclusive KPI fetch without importing server-only kpi.ts.
 * Usage: npx tsx scripts/debug-kpi-subtasks.ts [parentTaskGid]
 */

const PROJECT_GID = '1211974912397549';
const SUBTASK_FETCH_CONCURRENCY = 8;

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  return token;
}

const TASK_OPT_FIELDS = [
  'name',
  'assignee.name',
  'assignee.email',
  'parent.gid',
  'num_subtasks',
  'custom_fields.name',
  'custom_fields.number_value',
  'custom_fields.date_value',
  'custom_fields.enum_value.name',
  'completed',
  'completed_at',
  'modified_at',
].join(',');

type Task = {
  gid: string;
  name: string;
  assignee: { email: string; name: string } | null;
  parent: { gid: string } | null;
  num_subtasks?: number;
  custom_fields: Array<{
    name: string;
    number_value: number | null;
    date_value: { date: string } | null;
    enum_value: { name: string } | null;
  }>;
  completed: boolean;
  completed_at: string | null;
  modified_at: string;
};

function getField(task: Task, name: string) {
  return task.custom_fields.find((f) => f.name === name);
}

function hasScore(task: Task): boolean {
  const q = getField(task, 'Quality Points')?.number_value;
  const c = getField(task, 'Collaboration Points')?.number_value;
  const total = getField(task, 'Total KPI Score')?.number_value;
  return (q != null && c != null) || Boolean(total);
}

async function fetchPaginated(url: URL): Promise<Task[]> {
  const items: Task[] = [];
  let offset: string | undefined;
  do {
    if (offset) url.searchParams.set('offset', offset);
    else url.searchParams.delete('offset');
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${getToken()}` } });
    const json = (await res.json()) as { data: Task[]; next_page?: { offset: string } };
    items.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);
  return items;
}

async function fetchAllWithSubtasks(): Promise<Task[]> {
  const projectUrl = new URL(`https://app.asana.com/api/1.0/projects/${PROJECT_GID}/tasks`);
  projectUrl.searchParams.set('opt_fields', TASK_OPT_FIELDS);
  projectUrl.searchParams.set('limit', '100');
  const projectTasks = await fetchPaginated(projectUrl);

  const byGid = new Map(projectTasks.map((t) => [t.gid, t]));
  const fetchedSubtasksFor = new Set<string>();
  let queue = [...byGid.keys()];

  while (queue.length > 0) {
    const batch = queue.splice(0, SUBTASK_FETCH_CONCURRENCY);
    const toFetch = batch.filter((gid) => {
      if (fetchedSubtasksFor.has(gid)) return false;
      fetchedSubtasksFor.add(gid);
      return (byGid.get(gid)?.num_subtasks ?? 0) > 0;
    });
    const nested = await Promise.all(
      toFetch.map(async (gid) => {
        const url = new URL(`https://app.asana.com/api/1.0/tasks/${gid}/subtasks`);
        url.searchParams.set('opt_fields', TASK_OPT_FIELDS);
        url.searchParams.set('limit', '100');
        return fetchPaginated(url);
      })
    );
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

async function main() {
  const focusGid = process.argv[2];
  const tasks = await fetchAllWithSubtasks();
  const scored = tasks.filter((t) => hasScore(t) && t.assignee?.email);
  const subtaskOnly = scored.filter((t) => t.parent);

  console.log(
    JSON.stringify(
      {
        totalTasks: tasks.length,
        scoredTasks: scored.length,
        scoredSubtasks: subtaskOnly.length,
        sampleSubtaskCredits: subtaskOnly.slice(0, 8).map((t) => ({
          name: t.name,
          assignee: t.assignee?.email,
          total: getField(t, 'Total KPI Score')?.number_value,
          parentGid: t.parent?.gid,
        })),
        focusParent: focusGid
          ? {
              subtasks: tasks
                .filter((t) => t.parent?.gid === focusGid)
                .map((t) => ({
                  gid: t.gid,
                  name: t.name,
                  assignee: t.assignee?.email,
                  scored: hasScore(t),
                  total: getField(t, 'Total KPI Score')?.number_value,
                })),
            }
          : undefined,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
