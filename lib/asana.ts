import {
  CLIENT_STATUS_IN_PROGRESS,
  CLIENT_STATUS_NEW_SUBMISSION,
  DESIGN_PIPELINE_GID,
  FIELD_BILLABLE_HOURS,
  FIELD_CLIENT_STATUS,
  FIELD_COST_ESTIMATE,
  FIELD_PIPELINE_STATUS,
  INTAKE_PROJECT_GID,
  INTAKE_SECTION_APPROVED,
  INTAKE_SECTION_BLOCKED,
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
  /** True when estimates are set and client can approve or reject. */
  needsClientApproval: boolean;
  progress: TaskProgress;
};

export type ClientPortalActiveTask = ClientPortalTask & {
  pipeline: 'Production' | 'Design';
  status: string | null;
};

export type ClientPortalApprovedTask = ClientPortalTask & {
  status: string | null;
};

export type ClientPortalTasks = {
  pending: ClientPortalTask[];
  approved: ClientPortalApprovedTask[];
  active: ClientPortalActiveTask[];
};

type AsanaCustomFieldRaw = {
  gid: string;
  number_value?: number | null;
  display_value?: string | null;
  enum_value?: { gid?: string | null; name?: string | null } | null;
};

type AsanaTaskRaw = {
  gid: string;
  name: string;
  due_on: string | null;
  completed: boolean;
  permalink_url?: string;
  num_subtasks?: number;
  custom_fields?: AsanaCustomFieldRaw[];
};

const TASK_OPT_FIELDS = [
  'name',
  'due_on',
  'completed',
  'permalink_url',
  'num_subtasks',
  'custom_fields.gid',
  'custom_fields.number_value',
  'custom_fields.display_value',
  'custom_fields.enum_value.name',
  'custom_fields.enum_value.gid',
].join(',');

const TASK_DETAIL_OPT_FIELDS = [
  'name',
  'permalink_url',
  'custom_fields.gid',
  'custom_fields.number_value',
  'custom_fields.enum_value.gid',
  'custom_fields.enum_value.name',
].join(',');

function readEnumCustomFieldOptionGid(
  customFields: AsanaCustomFieldRaw[] | undefined,
  fieldGid: string
): string | null {
  const field = customFields?.find((item) => item.gid === fieldGid);
  return field?.enum_value?.gid ?? null;
}

function taskNeedsClientApproval(task: AsanaTaskRaw): boolean {
  if (readEnumCustomFieldOptionGid(task.custom_fields, FIELD_CLIENT_STATUS) !== CLIENT_STATUS_NEW_SUBMISSION) {
    return false;
  }
  return (
    readNumberCustomField(task.custom_fields, FIELD_BILLABLE_HOURS) != null &&
    readNumberCustomField(task.custom_fields, FIELD_COST_ESTIMATE) != null
  );
}

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
      // Portal cards are parent tasks only — subtasks feed progress bars, not the list.
      is_subtask: 'false',
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

/** Cap concurrent Asana reads — unbounded Promise.all trips their simultaneous-request 429. */
const ASANA_READ_CONCURRENCY = 5;
const ASANA_RETRY_MAX = 4;

const EMPTY_PROGRESS: TaskProgress = {
  totalSubtasks: 0,
  completedSubtasks: 0,
  percent: null,
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
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

    let attempt = 0;
    let json: {
      data?: Array<{ completed: boolean }>;
      next_page?: { offset?: string };
    } | null = null;

    while (attempt <= ASANA_RETRY_MAX) {
      const res = await fetch(
        `${ASANA_BASE}/tasks/${taskGid}/subtasks?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        json = (await res.json()) as {
          data?: Array<{ completed: boolean }>;
          next_page?: { offset?: string };
        };
        break;
      }

      const body = await res.text().catch(() => '');
      if (res.status === 429 && attempt < ASANA_RETRY_MAX) {
        const retryAfterSec = Number(res.headers.get('Retry-After'));
        const delayMs = Number.isFinite(retryAfterSec)
          ? retryAfterSec * 1000
          : 400 * 2 ** attempt;
        await sleep(delayMs);
        attempt += 1;
        continue;
      }

      throw new Error(`Asana subtasks ${taskGid} failed: ${res.status} ${body}`);
    }

    if (!json) {
      throw new Error(`Asana subtasks ${taskGid} failed: exhausted retries`);
    }

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

/** Progress fetch that never fails the portal — one bad task stays empty. */
async function getSubtaskProgressSafe(taskGid: string): Promise<TaskProgress> {
  try {
    return await getSubtaskProgress(taskGid);
  } catch (err) {
    console.error(`Subtask progress failed for ${taskGid}`, err);
    return EMPTY_PROGRESS;
  }
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
    needsClientApproval: taskNeedsClientApproval(task),
    progress,
  };
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
 * Pending = intake + New Submission. Approved = intake + client approved (pre-pipeline).
 * Active = production or design pipeline.
 *
 * Subtask progress is only fetched for active pipeline tasks (shown in the UI).
 * Pending/approved use empty progress so large intake lists don't 429 Asana.
 */
export async function getClientPortalTasks(
  filters: ClientFieldFilter[],
  intakeProjectGid: string = INTAKE_PROJECT_GID
): Promise<ClientPortalTasks> {
  const [intakeRaw, productionRaw, designRaw] = await Promise.all([
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
  const intakeOnlyRaw = intakeRaw.filter((task) => !activeGids.has(task.gid));

  const pendingRaw = intakeOnlyRaw.filter(
    (task) =>
      readEnumCustomFieldOptionGid(task.custom_fields, FIELD_CLIENT_STATUS) ===
      CLIENT_STATUS_NEW_SUBMISSION
  );
  const approvedRaw = intakeOnlyRaw.filter(
    (task) =>
      readEnumCustomFieldOptionGid(task.custom_fields, FIELD_CLIENT_STATUS) !==
      CLIENT_STATUS_NEW_SUBMISSION
  );

  const sortedActiveRaw = sortTasksByDueDate(Array.from(activeRaw.values()));

  const pending = pendingRaw.map((task) => toPortalTask(task, EMPTY_PROGRESS));
  const approved = approvedRaw.map((task) => ({
    ...toPortalTask(task, EMPTY_PROGRESS),
    status: readEnumCustomFieldLabel(task.custom_fields, FIELD_CLIENT_STATUS),
  }));
  // Skip subtask fan-out when Asana already says there are none — otherwise
  // large client boards (100+ tasks) burn the serverless timeout on empty GETs.
  const activeWithProgress = await mapWithConcurrency(
    sortedActiveRaw,
    ASANA_READ_CONCURRENCY,
    async (task) => {
      const progress =
        (task.num_subtasks ?? 0) > 0
          ? await getSubtaskProgressSafe(task.gid)
          : EMPTY_PROGRESS;
      return {
        ...toPortalTask(task, progress),
        pipeline: task.pipeline,
        status: readEnumCustomFieldLabel(task.custom_fields, FIELD_PIPELINE_STATUS),
      };
    }
  );

  return { pending, approved, active: activeWithProgress };
}

/** @deprecated Use getClientPortalTasks. */
export async function getClientTasks(filters: ClientFieldFilter[]) {
  return getClientPortalTasks(filters);
}

/** Admin — quick "view in Asana" links for a client, across intake + both pipelines. */
export async function getClientTaskLinks(
  filters: ClientFieldFilter[],
  intakeProjectGid: string = INTAKE_PROJECT_GID
): Promise<Array<{ gid: string; name: string; permalinkUrl: string }>> {
  const [intakeRaw, productionRaw, designRaw] = await Promise.all([
    searchProjectTasks(intakeProjectGid, filters),
    searchProjectTasks(PRODUCTION_PIPELINE_GID, filters),
    searchProjectTasks(DESIGN_PIPELINE_GID, filters),
  ]);

  const seen = new Map<string, AsanaTaskRaw>();
  for (const task of [...intakeRaw, ...productionRaw, ...designRaw]) {
    seen.set(task.gid, task);
  }

  return Array.from(seen.values()).map((task) => ({
    gid: task.gid,
    name: displayTaskName(task.name),
    permalinkUrl: task.permalink_url ?? '',
  }));
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

type ClientOwnedTask = {
  gid: string;
  name: string;
  permalink_url: string;
  billableHours: number | null;
  costEstimate: number | null;
};

export async function getClientOwnedTask(
  taskGid: string,
  filters: ClientFieldFilter[]
): Promise<ClientOwnedTask | null> {
  type TaskDetail = {
    gid: string;
    name: string;
    permalink_url: string;
    custom_fields?: AsanaCustomFieldRaw[];
  };

  let task: TaskDetail;
  try {
    task = await asanaFetch<TaskDetail>(
      `/tasks/${taskGid}?opt_fields=${TASK_DETAIL_OPT_FIELDS}`
    );
  } catch {
    return null;
  }

  for (const filter of filters) {
    if (readEnumCustomFieldOptionGid(task.custom_fields, filter.fieldGid) !== filter.optionGid) {
      return null;
    }
  }

  return {
    gid: task.gid,
    name: task.name,
    permalink_url: task.permalink_url,
    billableHours: readNumberCustomField(task.custom_fields, FIELD_BILLABLE_HOURS),
    costEstimate: readNumberCustomField(task.custom_fields, FIELD_COST_ESTIMATE),
  };
}

async function updateTaskCustomFields(
  taskGid: string,
  customFields: Record<string, string>
): Promise<void> {
  await asanaFetch(`/tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { custom_fields: customFields } }),
  });
}

async function moveTaskToSection(taskGid: string, sectionGid: string): Promise<void> {
  await asanaFetch(`/sections/${sectionGid}/addTask`, {
    method: 'POST',
    body: JSON.stringify({ data: { task: taskGid } }),
  });
}

async function addTaskStory(taskGid: string, text: string): Promise<void> {
  await asanaFetch(`/tasks/${taskGid}/stories`, {
    method: 'POST',
    body: JSON.stringify({ data: { text } }),
  });
}

export async function approveClientEstimate(
  taskGid: string,
  filters: ClientFieldFilter[],
  clientName: string
): Promise<void> {
  const task = await getClientOwnedTask(taskGid, filters);
  if (!task) {
    throw new Error('Task not found');
  }
  if (task.billableHours == null || task.costEstimate == null) {
    throw new Error('Estimate not ready');
  }

  await updateTaskCustomFields(taskGid, {
    [FIELD_CLIENT_STATUS]: CLIENT_STATUS_IN_PROGRESS,
  });
  await moveTaskToSection(taskGid, INTAKE_SECTION_APPROVED);
  await addTaskStory(
    taskGid,
    `[Client portal] ${clientName} approved the estimate (${task.billableHours} hrs · $${task.costEstimate.toLocaleString('en-US')}).`
  );
}

export async function rejectClientEstimate(input: {
  taskGid: string;
  filters: ClientFieldFilter[];
  clientName: string;
  contactEmail?: string;
  reason: string;
}): Promise<void> {
  const task = await getClientOwnedTask(input.taskGid, input.filters);
  if (!task) {
    throw new Error('Task not found');
  }

  const storyLines = [
    `[Client portal] ${input.clientName} rejected the estimate.`,
    `Reason: ${input.reason.trim()}`,
  ];
  if (input.contactEmail?.trim()) {
    storyLines.push(`Contact: ${input.contactEmail.trim()}`);
  }
  if (task.billableHours != null && task.costEstimate != null) {
    storyLines.push(
      `Estimate shown: ${task.billableHours} hrs · $${task.costEstimate.toLocaleString('en-US')}`
    );
  }

  await moveTaskToSection(input.taskGid, INTAKE_SECTION_BLOCKED);
  await addTaskStory(input.taskGid, storyLines.join('\n'));
}

export type AsanaEnumOption = { gid: string; name: string; enabled: boolean };

/** Admin — existing values of an enum custom field (e.g. "Design Clients"). */
export async function getCustomFieldEnumOptions(fieldGid: string): Promise<AsanaEnumOption[]> {
  const field = await asanaFetch<{ enum_options?: AsanaEnumOption[] }>(
    `/custom_fields/${fieldGid}?opt_fields=enum_options.name,enum_options.enabled`
  );
  return field.enum_options ?? [];
}

/** Admin — add a brand-new client to an enum custom field (e.g. new "Design Clients" option). */
export async function createCustomFieldEnumOption(
  fieldGid: string,
  name: string
): Promise<AsanaEnumOption> {
  return asanaFetch<AsanaEnumOption>(`/custom_fields/${fieldGid}/enum_options`, {
    method: 'POST',
    body: JSON.stringify({ data: { name } }),
  });
}
