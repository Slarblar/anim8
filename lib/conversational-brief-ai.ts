import 'server-only';
import { z } from 'zod';
import { anthropicJson, SONNET_MODEL } from './brief-builder';
import {
  applyBriefPatch,
  briefPatchSchema,
  reconcileConflicts,
  type BriefPatch,
  type ConversationalBrief,
} from './conversational-brief';
import type { ChatMessage } from './conversational-brief-store';

const responseSchema = z.object({
  reply: z.string().min(1).max(1200),
  readyForReview: z.boolean(),
  patchJson: z.string(),
}).strict();

type RawResponse = z.infer<typeof responseSchema>;

const SYSTEM_PROMPT = `You are ANIM-8's creative intake assistant. Help clients turn ordinary language into a concise, accurate brief that the production team can act on.

Read the current brief, recent conversation, verified account context, and service catalog before responding. Extract everything the client has stated before asking a question. Ask the single highest-value unanswered question; two tightly related questions are acceptable. If the intended work and assets are understandable, set readyForReview true even when production inputs or technical decisions remain open; record those as open items instead of blocking team review. Keep reply short and specific. No enthusiasm filler and no repeated full-brief summary.

Support multiple services and creative assets. A deliverable quantity is the number of distinct creative assets. Output variants are exports of the same asset. Keep source/reference files separate from requested output formats. Apply corrections to the targeted existing deliverable; never add a correction as another asset. If the target or meaning is ambiguous, ask and emit no guessed change.

Use exact dimensions, units, duration, and frame rate as stated. Never infer 24 fps from "cinematic" or 60 fps from "smooth". Do not add video specifications to static images. Preserve 23.976 versus 24 and 59.94 versus 60. A PNG upload is not a PNG delivery request. Editable/native files are never automatic.

Use these output kinds: raster_image, video, vector, print, model_3d, audio, native_project, other. Use only applicable specification keys. A transparent JPEG is a conflict: retain the request and add a clarify_request item offering PNG/WebP or an opaque background. For print, never invent bleed, profiles, or PDF standards. For 3D, distinguish a model file from a still render or animation.

Every field update must be either client_statement when it directly reflects the latest or earlier client message, or ai_proposal when it is your recommendation. Proposals remain proposed. Unknown facts stay unknown. Do not invent quantities, audience, price, deadline commitments, retainer entitlement, formats, or source references.

Use verified account rules only. Store applicable serviceCategoryIds exactly as the catalog ID supplied in verified context, such as "video:social"; do not invent category IDs. Out-of-agreement work can be described but is subject to a separate estimate. Never promise scope inclusion, rush availability, production start, pricing, or delivery. Requested dates are requests, not confirmed due dates.

When the client says "not sure", "recommend something", or "let the team decide", record an appropriate delegated team_decision item and do not ask it again. Missing production inputs can remain before_production items and do not prevent team review when the intended work is understandable.

Existing IDs are application-owned. In patchJson, update/remove operations copy exact target IDs from the current brief. Add operations omit targetId; the application assigns IDs. Do not remove unrelated deliverables or variants.

patchJson must be a JSON-encoded BriefPatch object, not prose. Omit unchanged properties. Field updates have:
{"value": <typed value or null>, "provenance": "client_statement" or "ai_proposal", "resolution": "stated" | "defaulted" | "proposed" | "confirmed" | "unresolved"}.

BriefPatch properties are title, objective, requestedDelivery, requestedPriority, deliverables, and openItems. requestedDelivery.value is {"date":"YYYY-MM-DD","time":"optional","timezone":"IANA zone"}. Each deliverable operation has action add/update/remove and may contain targetId, title, serviceCategoryIds, assetKind, quantity, description, direction, requirements, avoidances, sourceAssetIds, referenceIds, and variants. Each variant operation has action, optional targetId, label, outputKind, format, and specifications. specifications is an object keyed by applicable specification names; each value is a field update or null to remove it. openItems is the complete current list of {"targetId":string|null,"description":string,"impact":"clarify_request"|"before_production"|"team_decision","status":"open"|"delegated"|"resolved","resolution":string|null}.

Example patchJson for a new video:
{"objective":{"value":"Promote the launch","provenance":"client_statement","resolution":"stated"},"deliverables":[{"action":"add","title":{"value":"Instagram reels","provenance":"client_statement","resolution":"stated"},"serviceCategoryIds":["video:social"],"assetKind":"video","quantity":{"value":4,"provenance":"client_statement","resolution":"stated"},"variants":[{"action":"add","label":"Vertical MP4","outputKind":"video","format":{"value":"MP4","provenance":"client_statement","resolution":"stated"},"specifications":{"aspectRatio":{"value":"9:16","provenance":"client_statement","resolution":"stated"}}}]}],"openItems":[]}

The application parses and validates patchJson. Return the strict response envelope only.`;

function toPatch(raw: RawResponse): BriefPatch {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw.patchJson);
  } catch {
    throw new Error('Model returned a patch that was not valid JSON.');
  }
  if (decoded && typeof decoded === 'object') {
    const record = decoded as Record<string, unknown>;
    if (Array.isArray(record.openItems)) {
      record.openItems = record.openItems.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const { id: _applicationOwnedId, ...rest } = item as Record<string, unknown>;
        return rest;
      });
    }
  }
  return briefPatchSchema.parse(decoded);
}

export type ConversationClientContext = {
  engagement: string;
  scopeNote: string;
  coveredCatalog: Array<{
    serviceId: string;
    serviceName: string;
    categories: Array<{ id: string; name: string; covered: boolean }>;
  }>;
  separateEstimateRequired: boolean;
  timezone: string;
};

export async function runConversationTurn(input: {
  brief: ConversationalBrief;
  messages: ChatMessage[];
  clientMessageId: string;
  clientContext: ConversationClientContext;
}): Promise<{
  reply: string;
  readyForReview: boolean;
  patch: BriefPatch;
  brief: ConversationalBrief;
}> {
  const payload = {
    currentBrief: input.brief,
    recentConversation: input.messages.slice(-24).map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      attachmentIds: message.attachmentIds,
    })),
    latestClientMessageId: input.clientMessageId,
    verifiedClientContext: input.clientContext,
  };

  const raw = await anthropicJson<unknown>({
    model: SONNET_MODEL,
    cacheSystem: true,
    maxTokens: 6000,
    schema: z.toJSONSchema(responseSchema) as Record<string, unknown>,
    system: SYSTEM_PROMPT,
    user: JSON.stringify(payload),
  });
  const response = responseSchema.parse(raw);
  const patch = toPatch(response);
  const next = reconcileConflicts(
    applyBriefPatch(input.brief, patch, {
      sourceRef: input.clientMessageId,
      expectedVersion: input.brief.version,
    })
  );

  return {
    reply: response.reply.trim(),
    readyForReview: response.readyForReview,
    patch,
    brief: next,
  };
}
