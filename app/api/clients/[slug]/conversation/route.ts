import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  briefPatchSchema,
  canSubmitForTeamReview,
  reconcileConflicts,
  applyBriefPatch,
  attachmentSchema,
  referenceLinkSchema,
  type BriefAttachment,
  type BriefReference,
} from '@/lib/conversational-brief';
import {
  appendMessage,
  createConversationDraft,
  getConversationDraft,
  hasProcessedOperation,
  recordOperation,
  replaceBrief,
  updateConversationDraft,
} from '@/lib/conversational-brief-store';
import { runConversationTurn } from '@/lib/conversational-brief-ai';
import {
  applyVerifiedScopeRules,
  buildConversationClientContext,
} from '@/lib/conversational-brief-context';
import { submitConversationDraft } from '@/lib/conversational-brief-submit';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const baseActionSchema = z.object({
  draftId: z.string().min(1).max(160),
  operationId: z.string().min(8).max(160),
}).strict();

const uploadedFileSchema = z.object({
  name: z.string().min(1).max(300),
  url: z.string().url(),
  role: z.enum(['source', 'reference']).default('reference'),
}).strict();

const messageActionSchema = baseActionSchema.extend({
  action: z.literal('message'),
  text: z.string().max(12000),
  timezone: z.string().min(1).max(100).default('UTC'),
  attachments: z.array(uploadedFileSchema).max(5).default([]),
  links: z.array(z.string().url()).max(10).default([]),
}).strict();

const editActionSchema = baseActionSchema.extend({
  action: z.literal('edit'),
  expectedVersion: z.number().int().positive(),
  patch: briefPatchSchema,
}).strict();

const versionActionSchema = baseActionSchema.extend({
  action: z.enum(['review', 'approve']),
  expectedVersion: z.number().int().positive(),
}).strict();

const submitActionSchema = baseActionSchema.extend({
  action: z.literal('submit'),
}).strict();

const actionSchema = z.discriminatedUnion('action', [
  messageActionSchema,
  editActionSchema,
  versionActionSchema,
  submitActionSchema,
]);

function validTimezone(value: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return 'UTC';
  }
}

function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function linksFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>()\[\]"']+/gi) ?? [];
  return matches.map((url) => url.replace(/[.,;!?]+$/, '')).slice(0, 10);
}

async function resolveClient(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;
  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    const suffix = req.nextUrl.pathname.split('/').pop() || 'conversation';
    return {
      redirect: NextResponse.redirect(
        new URL(`/api/clients/${redirectSlug}/${suffix}${req.nextUrl.search}`, req.url),
        308
      ),
    } as const;
  }
  return { notFound: true } as const;
}

function integrationStatus() {
  return {
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    asanaConfigured: Boolean(
      process.env.ASANA_ACCESS_TOKEN?.trim() || process.env.ASANA_PAT?.trim()
    ),
    uploadsConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
  };
}

function response(draft: Awaited<ReturnType<typeof getConversationDraft>>, extra = {}) {
  return NextResponse.json({ draft, integrations: integrationStatus(), ...extra });
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const resolved = await resolveClient(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const draftId = req.nextUrl.searchParams.get('draftId');
  if (draftId) {
    const draft = await getConversationDraft(resolved.client.slug, draftId);
    if (!draft) return NextResponse.json({ error: 'Brief draft not found.' }, { status: 404 });
    return response(draft);
  }
  return response(await createConversationDraft(resolved.client.slug));
}

async function handleMessage(
  client: Awaited<ReturnType<typeof getClientBySlug>> & {},
  body: z.infer<typeof messageActionSchema>
) {
  if (!body.text.trim() && body.attachments.length === 0 && body.links.length === 0) {
    return NextResponse.json({ error: 'Write a message or attach a reference.' }, { status: 400 });
  }
  if (body.attachments.some((attachment) => !isVercelBlobUrl(attachment.url))) {
    return NextResponse.json({ error: 'One of the uploaded file links is not valid.' }, { status: 400 });
  }

  let messageId = '';
  let baseBriefVersion = 0;
  let draft = await updateConversationDraft(client.slug, body.draftId, (current) => {
    if (hasProcessedOperation(current, body.operationId)) return current;
    const existing = current.messages.find((message) => message.operationId === body.operationId);
    if (existing) {
      existing.status = 'pending';
      messageId = existing.id;
      baseBriefVersion = current.brief.version;
      return current;
    }

    const attachmentIds: string[] = [];
    for (const item of body.attachments) {
      const attachment: BriefAttachment = attachmentSchema.parse({
        id: id('asset'),
        name: item.name,
        url: item.url,
        role: item.role,
        status: 'uploaded',
      });
      current.brief.attachments.push(attachment);
      attachmentIds.push(attachment.id);
    }

    const allLinks = [...new Set([...body.links, ...linksFromText(body.text)])];
    for (const url of allLinks) {
      if (current.brief.references.some((reference) => reference.url === url)) continue;
      const reference: BriefReference = referenceLinkSchema.parse({
        id: id('reference'),
        url,
        label: new URL(url).hostname,
        status: 'access_unverified',
      });
      current.brief.references.push(reference);
    }
    if (body.attachments.length || allLinks.length) current.brief.version += 1;

    const message = appendMessage(current, {
      role: 'client',
      text: body.text.trim(),
      status: 'pending',
      attachmentIds,
      operationId: body.operationId,
    });
    messageId = message.id;
    baseBriefVersion = current.brief.version;
    return current;
  });

  if (hasProcessedOperation(draft, body.operationId)) return response(draft);
  const timezone = validTimezone(body.timezone);

  try {
    const result = await runConversationTurn({
      brief: draft.brief,
      messages: draft.messages,
      clientMessageId: messageId,
      clientContext: buildConversationClientContext(client, timezone),
    });
    let stale = false;
    draft = await updateConversationDraft(client.slug, body.draftId, (current) => {
      if (hasProcessedOperation(current, body.operationId)) return current;
      const clientMessage = current.messages.find((message) => message.id === messageId);
      if (clientMessage) clientMessage.status = 'sent';

      if (current.brief.version !== baseBriefVersion) {
        stale = true;
        appendMessage(current, {
          role: 'assistant',
          text: 'Your brief changed while I was working, so I kept the newer edit. Send that last correction again if it still applies.',
          status: 'sent',
          attachmentIds: [],
        });
      } else {
        replaceBrief(current, applyVerifiedScopeRules(result.brief, client));
        appendMessage(current, {
          role: 'assistant',
          text: result.reply,
          status: 'sent',
          attachmentIds: [],
        });
      }
      recordOperation(current, body.operationId);
      return current;
    });
    return response(draft, { readyForReview: result.readyForReview && !stale, stale });
  } catch (error) {
    await updateConversationDraft(client.slug, body.draftId, (current) => {
      const clientMessage = current.messages.find((message) => message.id === messageId);
      if (clientMessage) clientMessage.status = 'failed';
      return current;
    }).catch(() => undefined);
    console.error('Conversational brief turn failed', error);
    const missingKey = error instanceof Error && /ANTHROPIC_API_KEY/.test(error.message);
    return NextResponse.json(
      {
        error: missingKey
          ? 'Claude is not configured. Your message is saved; ask the team to add ANTHROPIC_API_KEY.'
          : 'The assistant could not finish that turn. Your message is saved; try again.',
      },
      { status: missingKey ? 503 : 502 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const resolved = await resolveClient(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = resolved.client;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'The brief update was not valid.' }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (body.action === 'message') return handleMessage(client, body);

    if (body.action === 'edit') {
      const draft = await updateConversationDraft(client.slug, body.draftId, (current) => {
        if (hasProcessedOperation(current, body.operationId)) return current;
        const next = reconcileConflicts(
          applyBriefPatch(current.brief, body.patch, {
            sourceRef: `edit_${body.operationId}`,
            provenance: 'client_statement',
            expectedVersion: body.expectedVersion,
          })
        );
        replaceBrief(current, applyVerifiedScopeRules(next, client));
        recordOperation(current, body.operationId);
        return current;
      });
      return response(draft);
    }

    if (body.action === 'review') {
      const draft = await updateConversationDraft(client.slug, body.draftId, (current) => {
        if (current.brief.version !== body.expectedVersion) {
          throw new Error('The brief changed. Review the latest version.');
        }
        current.reviewedAt = new Date().toISOString();
        recordOperation(current, body.operationId);
        return current;
      });
      return response(draft);
    }

    if (body.action === 'approve') {
      const draft = await updateConversationDraft(client.slug, body.draftId, (current) => {
        if (current.brief.version !== body.expectedVersion) {
          throw new Error('The brief changed. Review the latest version.');
        }
        if (!canSubmitForTeamReview(current.brief)) {
          throw new Error('Add enough detail for the team to understand the request.');
        }
        current.reviewedAt = current.reviewedAt ?? new Date().toISOString();
        current.approvedVersion = current.brief.version;
        current.approvedAt = new Date().toISOString();
        recordOperation(current, body.operationId);
        return current;
      });
      return response(draft);
    }

    if (body.action === 'submit') {
      const draft = await submitConversationDraft({
        client,
        draftId: body.draftId,
        operationId: body.operationId,
      });
      return response(draft);
    }
  } catch (error) {
    console.error('Conversational brief action failed', error);
    const message = error instanceof Error ? error.message : 'Could not update the brief.';
    const status = /not found/i.test(message) ? 404 : /changed|review|approve|detail/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
