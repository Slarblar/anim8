import dotenv from 'dotenv';
import { createRequire } from 'node:module';

dotenv.config({ path: '.env.local', override: true });

// Allow server-only modules to execute under tsx for this local diagnostic.
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
} as NodeModule;

type ClientFieldFilter = { fieldGid: string; optionGid: string };
type RawTask = { gid: string; name: string };

const ASANA_BASE = 'https://app.asana.com/api/1.0';
const WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID ?? '1210991035370090';
const TASK_OPT_FIELDS = [
  'name',
  'due_on',
  'completed',
  'permalink_url',
  'custom_fields.gid',
  'custom_fields.number_value',
  'custom_fields.display_value',
  'custom_fields.enum_value.name',
  'custom_fields.enum_value.gid',
].join(',');

function token(): string {
  const value = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!value) throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  return value;
}

async function searchProjectTasks(projectGid: string, filters: ClientFieldFilter[]) {
  const tasks = new Map<string, RawTask>();
  for (const filter of filters) {
    const params = new URLSearchParams({
      opt_fields: TASK_OPT_FIELDS,
      completed: 'false',
      limit: '100',
    });
    params.set(`custom_fields.${filter.fieldGid}.value`, filter.optionGid);
    params.append('projects.any', projectGid);
    const path = `/workspaces/${WORKSPACE_GID}/tasks/search?${params.toString()}`;
    const response = await fetch(`${ASANA_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Asana API ${path} failed: ${response.status} ${body}`);
    for (const task of JSON.parse(body).data as RawTask[]) tasks.set(task.gid, task);
  }
  return [...tasks.values()];
}

async function main() {
  const { getClientBySlug } = await import('../lib/client-registry');
  const { getClientPortalTasks } = await import('../lib/asana');
  const { FIELD_DESIGN_CLIENTS } = await import('../lib/client-portal-asana-config');

  const slug = 'turnemsideways2026';
  const client = await getClientBySlug(slug);
  if (!client) throw new Error(`No active client record for ${slug}`);

  console.log(
    'CLIENT',
    JSON.stringify(
      {
        slug: client.slug,
        displayName: client.displayName,
        filters: client.filters,
        intakeProjectGid: client.intakeProjectGid,
      },
      null,
      2
    )
  );

  const fieldRes = await fetch(
    `${ASANA_BASE}/custom_fields/${FIELD_DESIGN_CLIENTS}?opt_fields=enum_options.name,enum_options.gid,enum_options.enabled`,
    { headers: { Authorization: `Bearer ${token()}` } }
  );
  const fieldBody = await fieldRes.json();
  const option = (fieldBody.data?.enum_options ?? []).find(
    (item: { gid: string }) => item.gid === client.filters[0]?.optionGid
  );
  console.log('DESIGN_CLIENTS_OPTION', JSON.stringify(option ?? null));

  for (const [name, projectGid] of [
    ['intake', client.intakeProjectGid],
    ['production', '1211367100593569'],
    ['design', '1212054441677535'],
  ] as const) {
    const tasks = await searchProjectTasks(projectGid, client.filters);
    console.log(`SEARCH_${name.toUpperCase()}`, `count=${tasks.length}`);
    console.log(
      `SAMPLE_${name.toUpperCase()}`,
      tasks.slice(0, 10).map((task) => task.name)
    );
  }

  const started = Date.now();
  try {
    const tasks = await getClientPortalTasks(client.filters, client.intakeProjectGid);
    console.log(
      'GET_CLIENT_PORTAL_TASKS_OK',
      JSON.stringify({
        ms: Date.now() - started,
        pending: tasks.pending.length,
        approved: tasks.approved.length,
        active: tasks.active.length,
        activeSample: tasks.active.slice(0, 10).map((task) => ({
          name: task.name,
          pipeline: task.pipeline,
          status: task.status,
          percent: task.progress.percent,
        })),
      })
    );
  } catch (error) {
    console.error(
      'GET_CLIENT_PORTAL_TASKS_ERROR',
      `ms=${Date.now() - started}`,
      error instanceof Error ? error.message : String(error)
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('DEBUG_FATAL', error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
