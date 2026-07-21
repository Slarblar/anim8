import {
  DESIGN_PIPELINE_GID,
  FIELD_BILLABLE_HOURS,
  FIELD_COST_ESTIMATE,
  FIELD_PIPELINE_STATUS,
  INTAKE_PROJECT_GID,
  PRODUCTION_PIPELINE_GID,
} from './client-portal-asana-config';
import 'server-only';

const ASANA_BASE = 'https://app.asana.com/api/1.0';
const WORKSPACE_GID =
  process.env.ASANA_WORKSPACE_GID ?? '1210991035370090';

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) {
    throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  }
  return token;
}

async function asanaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    // Client dashboards should always show live status — never cache Asana reads.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Asana API ${path} failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.data as T;
}

export type ClientFieldFilter = { fieldGid: string; optionGid: string };

export type TaskProgress = {
  totalSubtasks: number;
  completedSubtasks: number;
  /** null when no subtasks exist yet (typical for intake). */
  percent: number | null;
};

export type ClientPortalTask = {
  gid: string;
  name: string;
  dueOn: string | null;
  billableHours: number | null;
  costEstimate: number | null;
  progress: TaskProgress;
};

export type ClientPortalActiveTask = ClientPortalTask & {
  pipeline: 'Production' | 'Design';
  status: string | null;
};

export type ClientPortalTasks = {
  pending: ClientPortalTask[];
  active: ClientPortalActiveTask[];
};

type AsanaCustomFieldRaw = {
  gid: string;
  number_value?: number | null;
  display_value?: string | null;
  enum_value?: { name?: string | null } | null;
};

type AsanaTaskRaw = {
  gid: string;
  name: string;
  due_on: string | null;
  completed: boolean;
  custom_fields?: AsanaCustomFieldRaw[];
};

const TASK_OPT_FIELDS = [
  'name',
  'due_on',
  'completed',
  'custom_fields.gid',
  'custom_fields.number_value',
  'custom_fields.display_value',
  'custom_fields.enum_value.name',
].join(',');

function readNumberCustomField(
  customFields: AsanaCustomFieldRaw[] | undefined,
  fieldGid: string
): number | null {
  const field = customFields?.find((item) => item.gid === fieldGid);
  if (field?.number_value == null) return null;
  return field.number_value;
}

function readEnumCustomFieldLabel(
  customFields: AsanaCustomFieldRaw[] | undefined,
  fieldGid: string
): string | null {
  const field = customFields?.find((item) => item.gid === fieldGid);
  const raw = field?.enum_value?.name ?? field?.display_value;
  if (!raw) return null;

  // Strip leading emoji / symbols from Asana labels like "🔄 In Progress".
  const cleaned = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return cleaned || raw.trim();
}
async function searchProjectTasks(
  projectGid: string,
  filters: ClientFieldFilter[]
): Promise<AsanaTaskRaw[]> {
  const seen = new Map<string, AsanaTaskRaw>();

  for (const filter of filters) {
    const params = new URLSearchParams({
      opt_fields: TASK_OPT_FIELDS,
      completed: 'false',
      limit: '100',
    });
    params.set(`custom_fields.${filter.fieldGid}.value`, filter.optionGid);
    params.append('projects.any', projectGid);

    const tasks = await asanaFetch<AsanaTaskRaw[]>(
      `/workspaces/${WORKSPACE_GID}/tasks/search?${params.toString()}`
    );

    for (const task of tasks) seen.set(task.gid, task);
  }

  return sortTasksByDueDate(Array.from(seen.values()));
}

async function listSubtasks(taskGid: string): Promise<Array<{ completed: boolean }>> {
  const items: Array<{ completed: boolean }> = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({
      opt_fields: 'completed',
      limit: '100',
    });
    if (offset) params.set('offset', offset);

    const res = await fetch(
      `${ASANA_BASE}/tasks/${taskGid}/subtasks?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Asana subtasks ${taskGid} failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as {
      data?: Array<{ completed: boolean }>;
      next_page?: { offset?: string };
    };

    items.push(...(json.data ?? []));
    offset = json.next_page?.offset;
  } while (offset);

  return items;
}

async function getSubtaskProgress(taskGid: string): Promise<TaskProgress> {
  const subtasks = await listSubtasks(taskGid);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;

  return {
    totalSubtasks,
    completedSubtasks,
    percent:
      totalSubtasks === 0
        ? null
        : Math.round((completedSubtasks / totalSubtasks) * 100),
  };
}

function displayTaskName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, '').trim() || name;
}

function toPortalTask(task: AsanaTaskRaw, progress: TaskProgress): ClientPortalTask {
  return {
    gid: task.gid,
    name: displayTaskName(task.name),
    dueOn: task.due_on,
    billableHours: readNumberCustomField(task.custom_fields, FIELD_BILLABLE_HOURS),
    costEstimate: readNumberCustomField(task.custom_fields, FIELD_COST_ESTIMATE),
    progress,
  };
}

async function enrichTasksWithProgress(
  tasks: AsanaTaskRaw[]
): Promise<ClientPortalTask[]> {
  return Promise.all(
    tasks.map(async (task) => toPortalTask(task, await getSubtaskProgress(task.gid)))
  );
}
function sortTasksByDueDate<T extends { due_on: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_on && !b.due_on) return 0;
    if (!a.due_on) return 1;
    if (!b.due_on) return -1;
    return a.due_on.localeCompare(b.due_on);
  });
}

/**
 * Pending tasks live in CLIENT INTAKE. Active tasks are in the production
 * or design pipeline. Tasks still attached to intake after kickoff are
 * excluded from pending once they appear in a pipeline.
 */
export async function getClientPortalTasks(
  filters: ClientFieldFilter[],
  intakeProjectGid: string = INTAKE_PROJECT_GID
): Promise<ClientPortalTasks> {
  const [pendingRaw, productionRaw, designRaw] = await Promise.all([
    searchProjectTasks(intakeProjectGid, filters),
    searchProjectTasks(PRODUCTION_PIPELINE_GID, filters),
    searchProjectTasks(DESIGN_PIPELINE_GID, filters),
  ]);

  const activeRaw = new Map<string, AsanaTaskRaw & { pipeline: 'Production' | 'Design' }>();
  for (const task of productionRaw) {
    activeRaw.set(task.gid, { ...task, pipeline: 'Production' });
  }
  for (const task of designRaw) {
    if (!activeRaw.has(task.gid)) {
      activeRaw.set(task.gid, { ...task, pipeline: 'Design' });
    }
  }

  const activeGids = new Set(activeRaw.keys());
  const intakeOnlyRaw = pendingRaw.filter((task) => !activeGids.has(task.gid));
  const sortedActiveRaw = sortTasksByDueDate(Array.from(activeRaw.values()));

  const [pending, activeWithProgress] = await Promise.all([
    enrichTasksWithProgress(intakeOnlyRaw),
    Promise.all(
      sortedActiveRaw.map(async (task) => ({
        ...toPortalTask(task, await getSubtaskProgress(task.gid)),
        pipeline: task.pipeline,
        status: readEnumCustomFieldLabel(task.custom_fields, FIELD_PIPELINE_STATUS),
      }))
    ),
  ]);

  return { pending, active: activeWithProgress };
}

/** @deprecated Use getClientPortalTasks. */
export async function getClientTasks(filters: ClientFieldFilter[]) {
  return getClientPortalTasks(filters);
}

export async function createClientSubmission(input: {
  name: string;
  notes: string;
  dueOn?: string;
  projectGid: string;
  sectionGid?: string;
  customFields: Record<string, string>; // fieldGid -> enum option gid or text value
}): Promise<{ gid: string; permalink_url: string }> {
  const task = await asanaFetch<{ gid: string; permalink_url: string }>(`/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        name: input.name,
        notes: input.notes,
        due_on: input.dueOn,
        projects: [input.projectGid],
        custom_fields: input.customFields,
      },
    }),
  });

  // Section membership is set as a separate call in the Asana API — a task
  // can't be created directly into a section, only added to one after.
  if (input.sectionGid) {
    await asanaFetch(`/sections/${input.sectionGid}/addTask`, {
      method: 'POST',
      body: JSON.stringify({ data: { task: task.gid } }),
    });
  }

  return task;
}

/**
 * Streams a file straight through to Asana's attachment endpoint —
 * nothing touches our own storage or the client's browser twice.
 */
export async function attachFileToTask(taskGid: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file, file.name);

  const res = await fetch(`${ASANA_BASE}/tasks/${taskGid}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Attachment upload failed: ${res.status} ${body}`);
  }
}
