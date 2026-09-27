import 'server-only';
import { createBriefIntakeTask } from './asana';
import type { ClientFieldFilter } from './asana';
import {
  CLIENT_STATUS_NEW_SUBMISSION,
  EFFORT_OPTION_GIDS,
  FIELD_CLIENT_STATUS,
  FIELD_DESIGN_CLIENTS,
  FIELD_EFFORT,
  FIELD_TASK_TYPE,
  INTAKE_PROJECT_GID,
  INTAKE_SECTION_NEW_SUBMISSIONS,
  SERVICES_CLIENT_GIDS,
  SERVICES_CLIENT_MISC_GID,
  TASK_TYPE_CLIENT_WORK,
} from './client-portal-asana-config';
import { notifyClientPortalTeam } from './client-portal-notify';
import {
  BRIEF_CATEGORIES,
  BRIEF_EFFORTS,
  CATEGORY_LABELS,
  EFFORT_LABELS,
  isBriefCategory,
  isBriefEffort,
  isRushBrief,
  type BriefAnswer,
  type BriefEffort,
  type BriefFollowUp,
  type BriefIntake,
  type FinalizedBrief,
} from './brief-schema';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const REFINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ready: { type: 'boolean' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['id', 'prompt'],
      },
    },
  },
  required: ['ready', 'questions'],
} as const;

const FINALIZE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    category: { type: 'string', enum: [...BRIEF_CATEGORIES] },
    deliverables: { type: 'array', items: { type: 'string' } },
    effort: { type: 'string', enum: [...BRIEF_EFFORTS] },
    creative_direction: { type: 'string' },
    suggested_subtasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    },
  },
  required: ['title', 'category', 'deliverables', 'effort', 'creative_direction', 'suggested_subtasks'],
} as const;

const SONNET_SYSTEM = `You turn a retainer client's request into a production brief for Anim-8, a motion, edit, and design studio.

Return only the structured brief. Do not invent a budget, a price, or a rush fee. Do not include the client name in the title — the app prefixes the task name itself.

Category must be one of: ${BRIEF_CATEGORIES.join(', ')}.
Effort must be one of: S (0.5-2 hrs), M (2-8 hrs), L (8-16 hrs), XL (16-32 hrs), XXL (4-5 days). Estimate fresh from this request. There are no category defaults.

Write 3 to 6 suggested subtasks a producer could assign. Each subtask name is short. Each description says what "done" looks like.

creative_direction should be a cleaned, organized version of the client's notes: tone, must-haves, must-avoids, and brand notes. Drop filler. Keep their constraints.

Example 1 input: "3 Instagram reels for the new drop, due next Friday, punchy, no stock music, refs attached."
Example 1 output shape: title "New drop Instagram reels", category "social-content", effort "M", deliverables listing 3 cutdowns, creative_direction capturing punchy tone and no stock music, subtasks for selects, cut, captions, and review.

Example 2 input: "Recut the podcast into a 45 minute YouTube episode and a trailer, keep the host's asides, due in two days."
Example 2 output shape: title "Podcast episode recut and trailer", category "podcast-longform-edit", effort "L", deliverables for the long cut and the trailer, subtasks for assembly, trailer, captions, and export.`;

function clientKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function servicesClientOptionGid(input: {
  displayName: string;
  filters: ClientFieldFilter[];
}): { gid: string | null; usedMisc: boolean } {
  const fromPortal = input.filters.find((filter) => filter.fieldGid === FIELD_DESIGN_CLIENTS)?.optionGid;
  if (fromPortal) {
    return { gid: fromPortal, usedMisc: fromPortal === SERVICES_CLIENT_MISC_GID };
  }

  const fromName = SERVICES_CLIENT_GIDS[clientKey(input.displayName)];
  if (fromName) return { gid: fromName, usedMisc: false };

  if (SERVICES_CLIENT_MISC_GID) return { gid: SERVICES_CLIENT_MISC_GID, usedMisc: true };
  return { gid: null, usedMisc: true };
}

type AnthropicContent = { type: string; text?: string };

async function anthropicJson<T>(input: {
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  cacheSystem?: boolean;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const system = input.cacheSystem
    ? [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }]
    : input.system;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens ?? 1400,
      system,
      messages: [{ role: 'user', content: input.user }],
      output_config: {
        format: { type: 'json_schema', schema: input.schema },
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic ${input.model} failed: ${res.status} ${raw.slice(0, 500)}`);
  }

  const message = JSON.parse(raw) as { content?: AnthropicContent[] };
  const text = message.content?.find((block) => block.type === 'text' && block.text)?.text;
  if (!text) throw new Error('Model returned no JSON');
  return JSON.parse(text) as T;
}

function intakePayload(intake: BriefIntake, answers: BriefAnswer[]) {
  return JSON.stringify(
    {
      project_type: intake.project_type,
      description: intake.description,
      due_date: intake.due_date,
      creative_direction: intake.creative_direction,
      reference_link_count: intake.reference_links.length,
      reference_upload_count: intake.reference_uploads.length,
      answers,
    },
    null,
    2
  );
}

export async function refineBrief(intake: BriefIntake, answers: BriefAnswer[]): Promise<{
  ready: boolean;
  questions: BriefFollowUp[];
}> {
  const result = await anthropicJson<{ ready: boolean; questions: BriefFollowUp[] }>({
    model: HAIKU_MODEL,
    maxTokens: 700,
    schema: REFINE_SCHEMA,
    system: `You help a retainer client finish a creative brief for Anim-8. You only ask follow-up questions. You do not write the brief.

Ask 2 to 4 short questions about missing or vague production details: deliverable count, format, length, aspect ratio, must-include, must-avoid, or who the piece is for. Do not ask about budget, price, or the client's name. Do not repeat a question they already answered.

If the request is already specific enough to produce from, set ready to true and questions to an empty array.

The current form state and answers are the whole conversation. Do not assume anything from a previous turn that is not in this payload.`,
    user: intakePayload(intake, answers),
  });

  const questions = Array.isArray(result.questions)
    ? result.questions
        .filter((item) => item && typeof item.prompt === 'string' && item.prompt.trim())
        .slice(0, 4)
        .map((item, index) => ({
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q${index + 1}`,
          prompt: item.prompt.trim(),
        }))
    : [];

  if (result.ready || questions.length === 0) {
    return { ready: true, questions: [] };
  }
  return { ready: false, questions };
}

export async function finalizeBrief(intake: BriefIntake, answers: BriefAnswer[]): Promise<{
  brief: FinalizedBrief;
  rush: boolean;
}> {
  const raw = await anthropicJson<FinalizedBrief>({
    model: SONNET_MODEL,
    cacheSystem: true,
    maxTokens: 2500,
    schema: FINALIZE_SCHEMA,
    system: SONNET_SYSTEM,
    user: `Write the brief from this request.\n\n${intakePayload(intake, answers)}`,
  });

  if (!isBriefCategory(raw.category) || !isBriefEffort(raw.effort)) {
    throw new Error('Model returned a brief outside the schema');
  }

  const deliverables = (raw.deliverables ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  const subtasks = (raw.suggested_subtasks ?? [])
    .filter((item) => item?.name?.trim())
    .slice(0, 6)
    .map((item) => ({
      name: item.name.trim(),
      description: (item.description ?? '').trim(),
    }));

  const brief: FinalizedBrief = {
    title: raw.title.trim() || intake.project_type.trim(),
    category: raw.category,
    deliverables: deliverables.length > 0 ? deliverables : [intake.project_type.trim()],
    effort: raw.effort,
    creative_direction: raw.creative_direction.trim(),
    suggested_subtasks: subtasks,
  };

  return { brief, rush: isRushBrief(intake.due_date, brief.effort) };
}

function formatBriefNotes(input: {
  clientName: string;
  intake: BriefIntake;
  brief: FinalizedBrief;
  rush: boolean;
}): string {
  const { brief, intake, rush } = input;
  const lines = [
    brief.title,
    '',
    `Category: ${CATEGORY_LABELS[brief.category]}`,
    `Effort: ${EFFORT_LABELS[brief.effort]}`,
    `Due: ${intake.due_date}`,
    `Rush fee: ${rush ? 'Yes — due in under 48 hours on a large request' : 'No'}`,
    '',
    'Deliverables:',
    ...brief.deliverables.map((item) => `- ${item}`),
    '',
    'Creative direction:',
    brief.creative_direction || 'None provided.',
  ];
  return lines.join('\n');
}

function formatReferenceComment(intake: BriefIntake): string {
  const links = intake.reference_links.length
    ? intake.reference_links.map((url) => `- ${url}`).join('\n')
    : '- None';
  const uploads = intake.reference_uploads.length
    ? intake.reference_uploads.map((url) => `- ${url}`).join('\n')
    : '- None';

  // TODO: auto-fill Drive folder link once client config supports it
  return [
    'Reference material',
    '',
    'Links:',
    links,
    '',
    'Uploaded files:',
    uploads,
    '',
    'Client Drive folder: not linked yet. Add the input/output folder link once this client is onboarded.',
  ].join('\n');
}

export async function deliverBrief(input: {
  clientName: string;
  filters: ClientFieldFilter[];
  intake: BriefIntake;
  brief: FinalizedBrief;
}): Promise<{ permalinkUrl: string; rush: boolean; emailed: boolean }> {
  const rush = isRushBrief(input.intake.due_date, input.brief.effort);
  const services = servicesClientOptionGid({
    displayName: input.clientName,
    filters: input.filters,
  });

  const customFields: Record<string, string> = {
    [FIELD_CLIENT_STATUS]: CLIENT_STATUS_NEW_SUBMISSION,
    [FIELD_TASK_TYPE]: TASK_TYPE_CLIENT_WORK,
    [FIELD_EFFORT]: EFFORT_OPTION_GIDS[input.brief.effort],
  };

  for (const filter of input.filters) {
    customFields[filter.fieldGid] = filter.optionGid;
  }
  if (services.gid) customFields[FIELD_DESIGN_CLIENTS] = services.gid;

  const notes = formatBriefNotes({
    clientName: input.clientName,
    intake: input.intake,
    brief: input.brief,
    rush,
  });

  const task = await createBriefIntakeTask({
    name: `[${input.clientName}] ${input.brief.title}`,
    notes,
    dueOn: input.intake.due_date,
    projectGid: INTAKE_PROJECT_GID,
    sectionGid: INTAKE_SECTION_NEW_SUBMISSIONS,
    customFields,
    subtasks: input.brief.suggested_subtasks.map((item) => ({
      name: item.name,
      notes: item.description,
    })),
    comment: formatReferenceComment(input.intake),
  });

  const emailed = await notifyClientPortalTeam({
    subject: `[${input.clientName}] Brief: ${input.brief.title}`,
    body: [notes, '', task.permalink_url ? `Asana: ${task.permalink_url}` : ''].filter(Boolean).join('\n'),
  });

  return { permalinkUrl: task.permalink_url, rush, emailed };
}

export function parseApprovedBrief(value: unknown): FinalizedBrief | null {
  if (!value || typeof value !== 'object') return null;
  const brief = value as Partial<FinalizedBrief>;
  if (typeof brief.title !== 'string' || !brief.title.trim()) return null;
  if (typeof brief.category !== 'string' || !isBriefCategory(brief.category)) return null;
  if (typeof brief.effort !== 'string' || !isBriefEffort(brief.effort)) return null;
  if (!Array.isArray(brief.deliverables)) return null;

  const deliverables = brief.deliverables
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (deliverables.length === 0) return null;

  const subtasks = (Array.isArray(brief.suggested_subtasks) ? brief.suggested_subtasks : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as { name?: unknown; description?: unknown };
      if (typeof record.name !== 'string' || !record.name.trim()) return null;
      return {
        name: record.name.trim(),
        description: typeof record.description === 'string' ? record.description.trim() : '',
      };
    })
    .filter((item): item is { name: string; description: string } => item !== null)
    .slice(0, 6);

  return {
    title: brief.title.trim().slice(0, 140),
    category: brief.category,
    deliverables,
    effort: brief.effort as BriefEffort,
    creative_direction:
      typeof brief.creative_direction === 'string' ? brief.creative_direction.trim().slice(0, 4000) : '',
    suggested_subtasks: subtasks,
  };
}
