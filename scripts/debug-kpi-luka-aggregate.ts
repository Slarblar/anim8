import { config } from 'dotenv';

config({ path: '.env.local' });

const PROJECT_GID = '1211974912397549';
const TARGET_EMAIL = 'luka.trinh@anim-8studios.com';
const TARGET_TASK = '1216816153363284';

function getToken(): string {
  const token = process.env.ASANA_ACCESS_TOKEN ?? process.env.ASANA_PAT;
  if (!token) throw new Error('ASANA_ACCESS_TOKEN or ASANA_PAT is not set');
  return token;
}

function getField(
  task: { custom_fields: Array<{ name: string; number_value: number | null; date_value: { date: string } | null; enum_value: { name: string } | null }> },
  name: string
) {
  return task.custom_fields.find((f) => f.name === name);
}

function scoreTask(task: Parameters<typeof getField>[0], fteRatio = 1): number | null {
  const qualityPts = getField(task, 'Quality Points')?.number_value;
  const collabPts = getField(task, 'Collaboration Points')?.number_value;
  const effortPts = getField(task, 'Effort Points')?.number_value ?? 0;
  const deliveryPts = getField(task, 'Delivery Bonus')?.number_value ?? 0;
  const rndPts = getField(task, 'R&D Points')?.number_value ?? 0;
  const asanaTotal = getField(task, 'Total KPI Score')?.number_value;

  if (qualityPts != null && collabPts != null) {
    const qualityMult = qualityPts / 10;
    const collabMult = collabPts / 10;
    return (effortPts / fteRatio) * qualityMult * collabMult + deliveryPts / fteRatio + rndPts;
  }
  if (asanaTotal) return fteRatio === 1 ? asanaTotal : asanaTotal / fteRatio;
  return null;
}

async function fetchAllKPITasks() {
  const token = getToken();
  const tasks = [];
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
    const url = new URL(`https://app.asana.com/api/1.0/projects/${PROJECT_GID}/tasks`);
    url.searchParams.set('opt_fields', optFields);
    url.searchParams.set('limit', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { data: unknown[]; next_page?: { offset: string } };
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks as Array<{
    gid: string;
    name: string;
    assignee: { email: string; name: string } | null;
    custom_fields: Array<{
      name: string;
      number_value: number | null;
      date_value: { date: string } | null;
      enum_value: { name: string } | null;
    }>;
    completed: boolean;
    completed_at: string | null;
    modified_at: string;
  }>;
}

async function main() {
  const tasks = await fetchAllKPITasks();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let julyScore = 0;
  let julyTasks = 0;
  let ytdScore = 0;
  let ytdTasks = 0;
  const included: Array<{ gid: string; name: string; score: number; month: string }> = [];
  const skipped: Array<{ gid: string; name: string; reason: string }> = [];

  for (const task of tasks) {
    if (task.assignee?.email?.toLowerCase() !== TARGET_EMAIL) continue;

    const score = scoreTask(task);
    if (score == null || score === 0) {
      skipped.push({ gid: task.gid, name: task.name, reason: 'no score' });
      continue;
    }

    const explicitDate = getField(task, 'Completion Date')?.date_value?.date;
    let dateStr: string | undefined;
    if (explicitDate) dateStr = explicitDate;
    else if (task.completed && task.completed_at) dateStr = task.completed_at.slice(0, 10);
    else if (task.modified_at) dateStr = task.modified_at.slice(0, 10);

    if (!dateStr) {
      skipped.push({ gid: task.gid, name: task.name, reason: 'no date' });
      continue;
    }

    const monthKey = dateStr.slice(0, 7);
    included.push({ gid: task.gid, name: task.name, score, month: monthKey });

    if (monthKey === currentMonthKey) {
      julyScore += score;
      julyTasks += 1;
    }
    if (dateStr.slice(0, 4) === String(now.getFullYear())) {
      ytdScore += score;
      ytdTasks += 1;
    }
  }

  const targetIncluded = included.find((t) => t.gid === TARGET_TASK);

  console.log(
    JSON.stringify(
      {
        targetEmail: TARGET_EMAIL,
        currentMonthKey,
        freshAggregation: {
          currentMonthScore: Math.round(julyScore * 100) / 100,
          currentMonthTasks: julyTasks,
          ytdScore: Math.round(ytdScore * 100) / 100,
          ytdTasks,
        },
        targetTaskIncluded: targetIncluded ?? null,
        allIncludedTasks: included,
        skippedForLuka: skipped,
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
