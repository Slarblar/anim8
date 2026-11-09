import 'server-only';
import { z } from 'zod';
import { getKv } from './kv';
import {
  briefSchema,
  createEmptyBrief,
  type ConversationalBrief,
} from './conversational-brief';

const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 180;
const KEY_PREFIX = 'client-brief-draft:';

export const chatMessageSchema = z.object({
  id: z.string().min(1).max(160),
  role: z.enum(['client', 'assistant']),
  text: z.string().max(12000),
  createdAt: z.string().datetime(),
  status: z.enum(['sent', 'pending', 'failed']),
  attachmentIds: z.array(z.string().min(1).max(160)).max(20),
  operationId: z.string().min(1).max(160).optional(),
});

export const submissionSyncSchema = z.object({
  status: z.enum(['idle', 'pending', 'confirmed', 'failed', 'unknown']),
  submissionId: z.string().min(1).max(160).nullable(),
  approvedVersion: z.number().int().positive().nullable(),
  parentTaskGid: z.string().max(160).nullable(),
  permalinkUrl: z.string().url().nullable(),
  subtaskGids: z.record(z.string(), z.string()),
  referenceCommentAdded: z.boolean(),
  error: z.string().max(2000).nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const conversationDraftSchema = z.object({
  id: z.string().min(1).max(160),
  clientSlug: z.string().min(1).max(160),
  revision: z.number().int().positive(),
  brief: briefSchema,
  messages: z.array(chatMessageSchema).max(240),
  approvedVersion: z.number().int().positive().nullable(),
  approvedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  processedOperationIds: z.array(z.string().min(1).max(160)).max(120),
  sync: submissionSyncSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type SubmissionSync = z.infer<typeof submissionSyncSchema>;
export type ConversationDraft = z.infer<typeof conversationDraftSchema>;

function draftKey(clientSlug: string, draftId: string): string {
  return `${KEY_PREFIX}${clientSlug}:${draftId}`;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createDraftState(clientSlug: string): ConversationDraft {
  const now = new Date().toISOString();
  return {
    id: newId('draft'),
    clientSlug,
    revision: 1,
    brief: createEmptyBrief(clientSlug),
    messages: [],
    approvedVersion: null,
    approvedAt: null,
    reviewedAt: null,
    processedOperationIds: [],
    sync: {
      status: 'idle',
      submissionId: null,
      approvedVersion: null,
      parentTaskGid: null,
      permalinkUrl: null,
      subtaskGids: {},
      referenceCommentAdded: false,
      error: null,
      updatedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function createConversationDraft(clientSlug: string): Promise<ConversationDraft> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const draft = createDraftState(clientSlug);
    const created = await getKv().set(draftKey(clientSlug, draft.id), draft, {
      nx: true,
      ex: DRAFT_TTL_SECONDS,
    });
    if (created) return draft;
  }
  throw new Error('Could not create a unique brief draft.');
}

export async function getConversationDraft(
  clientSlug: string,
  draftId: string
): Promise<ConversationDraft | null> {
  const raw = await getKv().get<unknown>(draftKey(clientSlug, draftId));
  const parsed = conversationDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const CAS_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local current = cjson.decode(raw)
if tonumber(current.revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

export async function saveConversationDraft(
  input: ConversationDraft,
  expectedRevision: number
): Promise<ConversationDraft> {
  const next = conversationDraftSchema.parse({
    ...input,
    revision: expectedRevision + 1,
    updatedAt: new Date().toISOString(),
  });
  const result = await getKv().eval<[string, string, string], number>(
    CAS_SCRIPT,
    [draftKey(next.clientSlug, next.id)],
    [String(expectedRevision), JSON.stringify(next), String(DRAFT_TTL_SECONDS)]
  );
  if (Number(result) === -1) throw new Error('Brief draft not found.');
  if (Number(result) !== 1) throw new Error('Brief draft changed. Reload the latest version.');
  return next;
}

export async function updateConversationDraft(
  clientSlug: string,
  draftId: string,
  update: (draft: ConversationDraft) => ConversationDraft | Promise<ConversationDraft>,
  attempts = 3
): Promise<ConversationDraft> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await getConversationDraft(clientSlug, draftId);
    if (!current) throw new Error('Brief draft not found.');
    const next = await update(structuredClone(current));
    try {
      return await saveConversationDraft(next, current.revision);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !/changed/i.test(error.message)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not save the brief.');
}

export function hasProcessedOperation(draft: ConversationDraft, operationId: string): boolean {
  return draft.processedOperationIds.includes(operationId);
}

export function recordOperation(draft: ConversationDraft, operationId: string): void {
  draft.processedOperationIds = [
    ...draft.processedOperationIds.filter((item) => item !== operationId),
    operationId,
  ].slice(-120);
}

export function invalidateApproval(draft: ConversationDraft): void {
  if (draft.approvedVersion !== draft.brief.version) {
    draft.approvedVersion = null;
    draft.approvedAt = null;
  }
}

export function appendMessage(
  draft: ConversationDraft,
  message: Omit<ChatMessage, 'id' | 'createdAt'>
): ChatMessage {
  const next: ChatMessage = {
    ...message,
    id: newId('message'),
    createdAt: new Date().toISOString(),
  };
  draft.messages = [...draft.messages, next].slice(-240);
  return next;
}

export function replaceBrief(draft: ConversationDraft, brief: ConversationalBrief): void {
  draft.brief = briefSchema.parse(brief);
  draft.approvedVersion = null;
  draft.approvedAt = null;
}
