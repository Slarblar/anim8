import { config } from 'dotenv';

config({ path: '.env.local' });

const TASK_GID = process.argv[2] ?? '1216816153363284';
const PROJECT_GID = '1211974912397549';

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  return token;
}

function getField(task: { custom_fields?: Array<{ name: string; number_value: number | null; date_value: { date: string } | null; enum_value: { name: string } | null }> }, name: string) {
  return task.custom_fields?.find((f) => f.name === name);
}

async function main() {
  const token = getToken();
  const optFields = [
    'name',
    'assignee.name',
    'assignee.email',
    'parent.name',
    'parent.gid',
    'memberships.project.gid',
    'custom_fields.name',
    'custom_fields.type',
    'custom_fields.number_value',
    'custom_fields.date_value',
    'custom_fields.enum_value.name',
    'completed',
    'completed_at',
    'modified_at',
  ].join(',');

  const taskRes = await fetch(`https://app.asana.com/api/1.0/tasks/${TASK_GID}?opt_fields=${optFields}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const taskJson = (await taskRes.json()) as { data?: Record<string, unknown>; errors?: unknown };
  if (!taskRes.ok) {
    console.error('Task fetch failed', taskRes.status, taskJson);
    process.exit(1);
  }

  const task = taskJson.data as {
    gid: string;
    name: string;
    assignee: { name: string; email: string } | null;
    parent: { gid: string; name: string } | null;
    memberships?: Array<{ project?: { gid: string } }>;
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

  let inProjectList = false;
  let projectTaskCount = 0;
  let offset: string | undefined;
  do {
    const url = new URL(`https://app.asana.com/api/1.0/projects/${PROJECT_GID}/tasks`);
    url.searchParams.set('opt_fields', 'gid');
    url.searchParams.set('limit', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { data: Array<{ gid: string }>; next_page?: { offset: string } };
    projectTaskCount += json.data.length;
    if (json.data.some((t) => t.gid === TASK_GID)) inProjectList = true;
    offset = json.next_page?.offset;
  } while (offset);

  const qualityPts = getField(task, 'Quality Points')?.number_value;
  const collabPts = getField(task, 'Collaboration Points')?.number_value;
  const asanaTotal = getField(task, 'Total KPI Score')?.number_value;
  const completionDate = getField(task, 'Completion Date')?.date_value?.date;

  const reasons: string[] = [];
  if (!inProjectList) reasons.push('NOT_IN_PROJECT_TASK_LIST (likely a subtask not added to the KPI project)');
  if (!task.assignee?.email) reasons.push('NO_ASSIGNEE_EMAIL');
  if (qualityPts == null || collabPts == null) {
    if (!asanaTotal) reasons.push('NOT_SCORED (missing Quality/Collaboration Points and Total KPI Score)');
    else if (asanaTotal === 0) reasons.push('TOTAL_KPI_SCORE_IS_ZERO');
  }
  if (!completionDate && !(task.completed && task.completed_at) && !task.modified_at) {
    reasons.push('NO_DATE_FOR_MONTH_BUCKET');
  }

  console.log(
    JSON.stringify(
      {
        taskGid: TASK_GID,
        name: task.name,
        assignee: task.assignee,
        parent: task.parent,
        inProjectTaskList: inProjectList,
        projectTaskCount,
        completed: task.completed,
        completed_at: task.completed_at,
        modified_at: task.modified_at,
        completionDate,
        qualityPoints: qualityPts,
        collaborationPoints: collabPts,
        totalKpiScore: asanaTotal,
        effortPoints: getField(task, 'Effort Points')?.number_value,
        deliveryBonus: getField(task, 'Delivery Bonus')?.number_value,
        qualityRating: getField(task, 'Quality Rating')?.enum_value?.name,
        collaborationRating: getField(task, 'Collaboration Rating')?.enum_value?.name,
        wouldBeSkippedBecause: reasons.length ? reasons : ['SHOULD_COUNT (check assignee email matches crew directory + cache)'],
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
