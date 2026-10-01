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
  isLargeEffort,
  isRushBrief,
  assembleBriefSubtasks,
  MAX_BRIEF_SUBTASKS,
  type BriefAnswer,
  type BriefEffort,
  type BriefFollowUp,
  type BriefIntake,
  type ClientReviewBrief,
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

The client sets piece_count. That number is exact: one finished piece per count. Put that same number on the deliverables line. Do not invent a different quantity.

Write one suggested subtask per piece, numbered through the full piece_count. Do not collapse the count into a single step such as "Cut episode 1". After those pieces, add up to 4 shared setup steps (template, selects, review) that apply to the whole job.

creative_direction should be a cleaned, organized version of the client's notes: tone, must-haves, must-avoids, and brand notes. Drop filler. Keep their constraints.

Example 1 input: "3 Instagram reels for the new drop, due next Friday, punchy, no stock music, refs attached."
Example 1 output shape: title "New drop Instagram reels", category "social-content", effort "M", deliverables listing "3 Instagram reels", creative_direction capturing punchy tone and no stock music, subtasks "Instagram reel 1", "Instagram reel 2", "Instagram reel 3", plus selects and review.

Example 2 input: "Recut the podcast into a 45 minute YouTube episode and a trailer, keep the host's asides, due in two days."
Example 2 output shape: title "Podcast episode recut and trailer", category "podcast-longform-edit", effort "L", deliverables for the long cut and the trailer, subtasks for assembly, trailer, captions, and export.`;

function clientKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validServiceGids(): Set<string> {
  return new Set(
    [...Object.values(SERVICES_CLIENT_GIDS), SERVICES_CLIENT_MISC_GID].filter((gid) => gid.length > 0)
  );
}

export function servicesClientOptionGid(input: {
  displayName: string;
  filters: ClientFieldFilter[];
}): { gid: string | null; usedMisc: boolean } {
  const valid = validServiceGids();
  const fromPortal = input.filters.find((filter) => filter.fieldGid === FIELD_DESIGN_CLIENTS)?.optionGid;
  if (fromPortal && valid.has(fromPortal)) {
    return { gid: fromPortal, usedMisc: fromPortal === SERVICES_CLIENT_MISC_GID };
  }

  const key = clientKey(input.displayName);
  const exact = SERVICES_CLIENT_GIDS[key];
  if (exact) return { gid: exact, usedMisc: false };

  const prefix = Object.entries(SERVICES_CLIENT_GIDS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([name]) => name.length >= 4 && key.startsWith(name));
  if (prefix) return { gid: prefix[1], usedMisc: false };

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
      piece_count: intake.piece_count ?? null,
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

Ask 2 to 4 short questions about anything still fuzzy: how many pieces, format, length, ratio, must-haves, things to avoid, or who it's for. Do not ask about budget, price, or the client's name. Do not repeat a question they already answered.

Write like a producer texting a client you know. Plain words, contractions, one clear question each. No "please provide", "kindly", "utilize", or corporate filler.

If the request is already specific enough to make, set ready to true and questions to an empty array.

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

const EFFORT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function effortSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.CRON_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(effortSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Buffer.from(signature).toString('base64url');
}

/** Signed so a client cannot swap the hour estimate before the brief is sent. */
export async function signBriefEffort(effort: BriefEffort): Promise<string> {
  const payload = Buffer.from(
    JSON.stringify({ effort, exp: Date.now() + EFFORT_TOKEN_TTL_MS })
  ).toString('base64url');
  return `${payload}.${await signPayload(payload)}`;
}

export async function readSignedEffort(token: string): Promise<BriefEffort | null> {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = await signPayload(payload);
  if (!safeEqual(sig, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      effort?: string;
      exp?: number;
    };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.effort !== 'string' || !isBriefEffort(data.effort)) return null;
    return data.effort;
  } catch {
    return null;
  }
}

export async function finalizeBrief(intake: BriefIntake, answers: BriefAnswer[]): Promise<{
  brief: ClientReviewBrief;
  effortToken: string;
  largeJob: boolean;
}> {
  const raw = await anthropicJson<FinalizedBrief>({
    model: SONNET_MODEL,
    cacheSystem: true,
    maxTokens: 4000,
    schema: FINALIZE_SCHEMA,
    system: SONNET_SYSTEM,
    user: `Write the brief from this request.\n\n${intakePayload(intake, answers)}`,
  });

  if (!isBriefCategory(raw.category) || !isBriefEffort(raw.effort)) {
    throw new Error('Model returned a brief outside the schema');
  }

  const deliverables = (raw.deliverables ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  const modelSteps = (raw.suggested_subtasks ?? [])
    .filter((item) => item?.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      description: (item.description ?? '').trim(),
    }));

  const brief: ClientReviewBrief = {
    title: raw.title.trim() || intake.project_type.trim(),
    category: raw.category,
    deliverables: deliverables.length > 0 ? deliverables : [intake.project_type.trim()],
    creative_direction: raw.creative_direction.trim(),
    suggested_subtasks: assembleBriefSubtasks(
      deliverables.length > 0 ? deliverables : [intake.project_type.trim()],
      modelSteps,
      intake.piece_count,
      intake.project_type
    ),
  };

  return {
    brief,
    effortToken: await signBriefEffort(raw.effort),
    largeJob: isLargeEffort(raw.effort),
  };
}

function formatBriefNotes(input: {
  clientName: string;
  intake: BriefIntake;
  brief: ClientReviewBrief;
  effort: BriefEffort;
  rush: boolean;
}): string {
  const { brief, intake, rush, effort } = input;
  const lines = [
    brief.title,
    '',
    `Category: ${CATEGORY_LABELS[brief.category]}`,
    `Effort: ${EFFORT_LABELS[effort]}`,
    `Due: ${intake.due_date}`,
    `Pieces: ${intake.piece_count ?? '—'}`,
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
  brief: ClientReviewBrief;
  effort: BriefEffort;
}): Promise<{ permalinkUrl: string; rush: boolean; emailed: boolean }> {
  const rush = isRushBrief(input.intake.due_date, input.effort);
  const services = servicesClientOptionGid({
    displayName: input.clientName,
    filters: input.filters,
  });

  const customFields: Record<string, string> = {
    [FIELD_CLIENT_STATUS]: CLIENT_STATUS_NEW_SUBMISSION,
    [FIELD_TASK_TYPE]: TASK_TYPE_CLIENT_WORK,
    [FIELD_EFFORT]: EFFORT_OPTION_GIDS[input.effort],
  };

  for (const filter of input.filters) {
    if (filter.fieldGid === FIELD_DESIGN_CLIENTS) continue;
    customFields[filter.fieldGid] = filter.optionGid;
  }
  if (services.gid) customFields[FIELD_DESIGN_CLIENTS] = services.gid;

  const notes = formatBriefNotes({
    clientName: input.clientName,
    intake: input.intake,
    brief: input.brief,
    effort: input.effort,
    rush,
  });

  let fields = customFields;
  let task: { gid: string; permalink_url: string } | null = null;
  for (let attempt = 0; attempt < 4 && !task; attempt += 1) {
    try {
      task = await createBriefIntakeTask({
        name: `[${input.clientName}] ${input.brief.title}`,
        notes,
        dueOn: input.intake.due_date,
        projectGid: INTAKE_PROJECT_GID,
        sectionGid: INTAKE_SECTION_NEW_SUBMISSIONS,
        customFields: fields,
        subtasks: assembleBriefSubtasks(
          input.brief.deliverables,
          input.brief.suggested_subtasks,
          input.intake.piece_count,
          input.intake.project_type
        ).map((item) => ({
          name: item.name,
          notes: item.description,
        })),
        comment: formatReferenceComment(input.intake),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const rejected = message.match(/not:\s*(\d+)/)?.[1];
      if (!rejected) throw err;
      const next = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== rejected));
      if (Object.keys(next).length === Object.keys(fields).length) throw err;
      console.error(`Asana rejected option ${rejected}; retrying without it`);
      fields = next;
    }
  }
  if (!task) throw new Error('Could not create the Asana task');

  let emailed = false;
  try {
    emailed = await notifyClientPortalTeam({
      subject: `[${input.clientName}] Brief: ${input.brief.title}`,
      body: [notes, '', task.permalink_url ? `Asana: ${task.permalink_url}` : ''].filter(Boolean).join('\n'),
    });
  } catch (err) {
    console.error('Brief email failed', err);
  }

  return { permalinkUrl: task.permalink_url, rush, emailed };
}

export function parseApprovedBrief(value: unknown): ClientReviewBrief | null {
  if (!value || typeof value !== 'object') return null;
  const brief = value as Partial<ClientReviewBrief>;
  if (typeof brief.title !== 'string' || !brief.title.trim()) return null;
  if (typeof brief.category !== 'string' || !isBriefCategory(brief.category)) return null;
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
    .slice(0, MAX_BRIEF_SUBTASKS);

  return {
    title: brief.title.trim().slice(0, 140),
    category: brief.category,
    deliverables,
    creative_direction:
      typeof brief.creative_direction === 'string' ? brief.creative_direction.trim().slice(0, 4000) : '',
    suggested_subtasks: subtasks,
  };
}

const SESSION_QUESTIONS_SCHEMA = {
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

const SESSION_BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    brief: { type: 'string' },
  },
  required: ['brief'],
} as const;

export type SessionFollowUp = { prompt: string; answer: string };
export type SessionBriefQuestion = { id: string; prompt: string };

function clipSessionQuestions(questions: SessionBriefQuestion[]): SessionBriefQuestion[] {
  const seen = new Set<string>();
  const next: SessionBriefQuestion[] = [];
  for (const question of questions) {
    const prompt = question.prompt.replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!prompt) continue;
    let id = question.id.replace(/[^\w-]/g, '').slice(0, 40);
    if (!id || seen.has(id)) id = `q${next.length + 1}`;
    seen.add(id);
    next.push({ id, prompt });
    if (next.length >= 3) break;
  }
  return next;
}

/** Turn the creative-session answers into a production brief, asking only for facts that would change the work. */
export async function shapeSessionBrief(input: {
  facts: string;
  followUps: SessionFollowUp[];
}): Promise<{ questions: SessionBriefQuestion[]; brief: string }> {
  const facts = input.facts.trim().slice(0, 8000);
  const followUps = input.followUps
    .map((item) => ({
      prompt: item.prompt.replace(/\s+/g, ' ').trim().slice(0, 220),
      answer: item.answer.replace(/\s+/g, ' ').trim().slice(0, 800),
    }))
    .filter((item) => item.prompt)
    .slice(0, 3);

  if (!followUps.length) {
    const check = await anthropicJson<{ ready: boolean; questions: SessionBriefQuestion[] }>({
      model: HAIKU_MODEL,
      maxTokens: 500,
      schema: SESSION_QUESTIONS_SCHEMA,
      system: `You are a producer at Anim8. Read the client's answers and decide if a team could start the work.

Ask up to 3 follow-up questions only when a missing fact would change what gets made: how many pieces, finished length, aspect ratio, what they are starting from, or a must-have or must-avoid. Do not ask about budget, price, the client's name, or anything already answered. Do not ask "tell us more."

If the answers are already specific enough to start, set ready to true and questions to an empty array.

Write like a producer texting a client. One clear question each.`,
      user: facts,
    });
    const questions = check.ready ? [] : clipSessionQuestions(check.questions ?? []);
    if (questions.length) return { questions, brief: '' };
  }

  const payload = followUps.length
    ? `${facts}\n\nFollow-up answers:\n${followUps.map((item) => `${item.prompt}\n${item.answer || '(left open)'}`).join('\n\n')}`
    : facts;

  const written = await anthropicJson<{ brief: string }>({
    model: SONNET_MODEL,
    maxTokens: 1800,
    schema: SESSION_BRIEF_SCHEMA,
    system: `You write the production brief Anim8 will use to do the work. Use only facts in the payload. Do not invent a budget, a price, a date, a quantity, a format, or a deliverable the client did not state.

Write short labeled sections, in this order:

The job
What we're making
Specs
Creative direction
References
Still open

The job: one or two sentences on the outcome, from their idea and goal.
What we're making: each service and category, with the exact counts, lengths, and outputs they named.
Specs: every answered question, phrased as a production note.
Creative direction: their tone, borrowed qualities, and constraints. Drop filler.
References: pinned studio work, their images, and their links. Include what they asked to borrow when they said so.
Still open: only gaps that would change the work. If nothing material is missing, write "None. Ready to scope."

Plain sentences. No marketing language. No invented shot list.`,
    user: payload,
  });

  return { questions: [], brief: written.brief.replace(/\r\n/g, '\n').trim().slice(0, 6000) };
}
