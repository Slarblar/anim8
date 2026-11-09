import 'server-only';
import {
  addBriefReferenceComment,
  createBriefSubtask,
  createClientSubmission,
  type ClientFieldFilter,
} from './asana';
import {
  CLIENT_STATUS_NEW_SUBMISSION,
  FIELD_CLIENT_STATUS,
  FIELD_DESIGN_CLIENTS,
  FIELD_TASK_TYPE,
  TASK_TYPE_CLIENT_WORK,
} from './client-portal-asana-config';
import { notifyClientPortalTeam } from './client-portal-notify';
import type { ClientRecord } from './client-registry';
import { servicesClientOptionGid } from './brief-builder';
import {
  deliverySpecLabel,
  outputKindLabel,
  productionReadiness,
  type ConversationalBrief,
  type Deliverable,
} from './conversational-brief';
import {
  getConversationDraft,
  recordOperation,
  updateConversationDraft,
  type ConversationDraft,
} from './conversational-brief-store';

export type ConversationAsanaAdapter = {
  createParent(input: {
    name: string;
    notes: string;
    projectGid: string;
    sectionGid?: string;
    customFields: Record<string, string>;
  }): Promise<{ gid: string; permalink_url: string }>;
  createSubtask(
    parentTaskGid: string,
    input: { name: string; notes: string }
  ): Promise<{ gid: string }>;
  addComment(taskGid: string, text: string): Promise<void>;
};

const liveAsanaAdapter: ConversationAsanaAdapter = {
  createParent: createClientSubmission,
  createSubtask: createBriefSubtask,
  addComment: addBriefReferenceComment,
};

function fieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value == null ? 'To confirm' : String(value);
}

function fieldSource(field: { provenance: string; resolution: string }): string {
  const provenance = field.provenance.replace(/_/g, ' ');
  return `${provenance}; ${field.resolution}`;
}

function formatVariant(deliverable: Deliverable): string[] {
  if (deliverable.variants.length === 0) return ['  Delivery specifications: To confirm'];
  return deliverable.variants.flatMap((variant) => {
    const lines = [
      `  ${variant.label} — ${outputKindLabel(variant.outputKind)}`,
      `    Format: ${fieldValue(variant.format.value)} (${fieldSource(variant.format)})`,
    ];
    for (const [key, field] of Object.entries(variant.specifications)) {
      if (!field) continue;
      lines.push(`    ${deliverySpecLabel(key as never)}: ${fieldValue(field.value)} (${fieldSource(field)})`);
    }
    return lines;
  });
}

export function formatConversationalBriefForAsana(input: {
  brief: ConversationalBrief;
  requestReference: string;
  engagement: string;
}): string {
  const { brief } = input;
  const readiness = productionReadiness(brief);
  const lines = [
    `Request reference: ${input.requestReference}`,
    `Approved brief version: ${brief.version}`,
    `Engagement: ${input.engagement}`,
    `Scope status: ${brief.scope.status.replace(/_/g, ' ')}`,
    '',
    `Objective: ${brief.objective.value || 'To confirm'}`,
    '',
    'Deliverables',
  ];

  for (const [index, deliverable] of brief.deliverables.entries()) {
    lines.push(
      `${index + 1}. ${deliverable.title.value || 'Untitled deliverable'} × ${deliverable.quantity.value ?? 'TBD'}`,
      `  Description: ${deliverable.description.value || 'To confirm'}`,
      `  Direction: ${deliverable.direction.value || 'To confirm'}`,
      `  Requirements: ${deliverable.requirements.value?.join('; ') || 'None stated'}`,
      `  Avoid: ${deliverable.avoidances.value?.join('; ') || 'None stated'}`,
      ...formatVariant(deliverable)
    );
  }

  lines.push(
    '',
    `Requested delivery: ${
      brief.requestedDelivery.value
        ? `${brief.requestedDelivery.value.date}${
            brief.requestedDelivery.value.time ? ` ${brief.requestedDelivery.value.time}` : ''
          } (${brief.requestedDelivery.value.timezone}) — requested, not confirmed`
        : 'Not specified'
    }`,
    `Requested priority: ${brief.requestedPriority.value || 'Standard / not specified'} — subject to team confirmation`,
    '',
    'Open items'
  );

  if (brief.openItems.length === 0) {
    lines.push('- None recorded.');
  } else {
    for (const item of brief.openItems) {
      lines.push(`- [${item.impact}; ${item.status}] ${item.description}${item.resolution ? ` — ${item.resolution}` : ''}`);
    }
  }

  lines.push(
    '',
    `Production readiness: ${readiness.ready ? 'Ready for team validation' : 'Has unresolved production/scope inputs'}`,
    'Submission requests team review only. It does not confirm scope, price, production start, or delivery.'
  );
  return lines.join('\n');
}

type SubmissionSubtask = { key: string; name: string; notes: string };

export function buildConversationalSubtasks(brief: ConversationalBrief): SubmissionSubtask[] {
  const result: SubmissionSubtask[] = [];
  for (const deliverable of brief.deliverables) {
    const quantity = Math.min(24, Math.max(1, Math.round(deliverable.quantity.value ?? 1)));
    for (let index = 0; index < quantity; index += 1) {
      const suffix = quantity > 1 ? ` ${index + 1}` : '';
      result.push({
        key: `${deliverable.id}:${index + 1}`,
        name: `${deliverable.title.value || 'Deliverable'}${suffix}`,
        notes: [
          deliverable.description.value || 'Description to confirm.',
          ...formatVariant(deliverable).map((line) => line.trim()),
          quantity > 1 ? `Asset ${index + 1} of ${quantity}.` : '',
        ].filter(Boolean).join('\n'),
      });
    }
  }
  return result;
}

function formatReferences(brief: ConversationalBrief, driveFolderUrl?: string): string {
  const lines = ['Reference material', ''];
  lines.push('Uploaded files:');
  if (brief.attachments.length) {
    for (const attachment of brief.attachments) {
      lines.push(`- [${attachment.role}; ${attachment.status}] ${attachment.name}: ${attachment.url}`);
    }
  } else {
    lines.push('- None');
  }
  lines.push('', 'Links:');
  if (brief.references.length) {
    for (const reference of brief.references) {
      lines.push(`- [${reference.status}] ${reference.label || reference.url}: ${reference.url}`);
    }
  } else {
    lines.push('- None');
  }
  lines.push('', `Client Drive folder: ${driveFolderUrl || 'Not configured'}`);
  return lines.join('\n');
}

function customFieldsFor(client: ClientRecord): Record<string, string> {
  const fields: Record<string, string> = {
    [FIELD_CLIENT_STATUS]: CLIENT_STATUS_NEW_SUBMISSION,
    [FIELD_TASK_TYPE]: TASK_TYPE_CLIENT_WORK,
  };
  for (const filter of client.filters) {
    if (filter.fieldGid !== FIELD_DESIGN_CLIENTS) fields[filter.fieldGid] = filter.optionGid;
  }
  const services = servicesClientOptionGid({
    displayName: client.displayName,
    filters: client.filters,
  });
  if (services.gid) fields[FIELD_DESIGN_CLIENTS] = services.gid;
  return fields;
}

async function createParentWithFieldRetry(
  adapter: ConversationAsanaAdapter,
  input: Parameters<ConversationAsanaAdapter['createParent']>[0]
) {
  let fields = input.customFields;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await adapter.createParent({ ...input, customFields: fields });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const rejected = message.match(/not:\s*(\d+)/)?.[1];
      if (!rejected) throw error;
      const next = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== rejected)
      );
      if (Object.keys(next).length === Object.keys(fields).length) throw error;
      fields = next;
    }
  }
  throw new Error('Asana rejected the configured custom-field mappings.');
}

function isDefiniteAsanaFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /Asana .* failed:\s*\d{3}/i.test(message) || /not configured|not set/i.test(message);
}

async function setSyncError(
  clientSlug: string,
  draftId: string,
  error: unknown,
  ambiguousParentCreate: boolean
): Promise<ConversationDraft> {
  return updateConversationDraft(clientSlug, draftId, (draft) => {
    draft.sync.status = ambiguousParentCreate ? 'unknown' : 'failed';
    draft.sync.error = error instanceof Error ? error.message.slice(0, 2000) : 'Asana submission failed.';
    draft.sync.updatedAt = new Date().toISOString();
    return draft;
  });
}

export async function submitConversationDraft(input: {
  client: ClientRecord;
  draftId: string;
  operationId: string;
  adapter?: ConversationAsanaAdapter;
}): Promise<ConversationDraft> {
  const adapter = input.adapter ?? liveAsanaAdapter;
  let draft = await getConversationDraft(input.client.slug, input.draftId);
  if (!draft) throw new Error('Brief draft not found.');
  if (draft.sync.status === 'confirmed') return draft;
  if (draft.sync.status === 'unknown') {
    throw new Error('Asana may have received this request. The team must reconcile it before retrying.');
  }
  if (draft.approvedVersion !== draft.brief.version) {
    throw new Error('Review and approve the current brief version before sending.');
  }

  const submissionId = draft.sync.submissionId ?? `request_${draft.id}`;
  draft = await updateConversationDraft(input.client.slug, input.draftId, (current) => {
    if (current.approvedVersion !== current.brief.version) {
      throw new Error('The brief changed after approval.');
    }
    current.sync.status = 'pending';
    current.sync.submissionId = current.sync.submissionId ?? submissionId;
    current.sync.approvedVersion = current.brief.version;
    current.sync.error = null;
    current.sync.updatedAt = new Date().toISOString();
    return current;
  });

  const title = draft.brief.title.value?.trim() || 'Creative request';
  const notes = formatConversationalBriefForAsana({
    brief: draft.brief,
    requestReference: submissionId,
    engagement: input.client.engagement ?? 'new',
  });

  if (!draft.sync.parentTaskGid) {
    try {
      const parent = await createParentWithFieldRetry(adapter, {
        name: `[${input.client.displayName}] ${title}`,
        notes,
        projectGid: input.client.intakeProjectGid,
        sectionGid: input.client.intakeSectionGid,
        customFields: customFieldsFor(input.client),
      });
      draft = await updateConversationDraft(input.client.slug, input.draftId, (current) => {
        current.sync.parentTaskGid = parent.gid;
        current.sync.permalinkUrl = parent.permalink_url;
        current.sync.updatedAt = new Date().toISOString();
        return current;
      });
    } catch (error) {
      await setSyncError(
        input.client.slug,
        input.draftId,
        error,
        !isDefiniteAsanaFailure(error)
      );
      throw error;
    }
  }

  const parentTaskGid = draft.sync.parentTaskGid;
  if (!parentTaskGid) throw new Error('Asana parent task was not confirmed.');

  try {
    for (const subtask of buildConversationalSubtasks(draft.brief)) {
      if (draft.sync.subtaskGids[subtask.key]) continue;
      const created = await adapter.createSubtask(parentTaskGid, {
        name: subtask.name,
        notes: subtask.notes,
      });
      draft = await updateConversationDraft(input.client.slug, input.draftId, (current) => {
        current.sync.subtaskGids[subtask.key] = created.gid;
        current.sync.updatedAt = new Date().toISOString();
        return current;
      });
    }

    if (!draft.sync.referenceCommentAdded) {
      await adapter.addComment(
        parentTaskGid,
        formatReferences(draft.brief, input.client.driveFolderUrl)
      );
      draft = await updateConversationDraft(input.client.slug, input.draftId, (current) => {
        current.sync.referenceCommentAdded = true;
        current.sync.updatedAt = new Date().toISOString();
        return current;
      });
    }
  } catch (error) {
    await setSyncError(input.client.slug, input.draftId, error, false);
    throw error;
  }

  draft = await updateConversationDraft(input.client.slug, input.draftId, (current) => {
    current.sync.status = 'confirmed';
    current.sync.error = null;
    current.sync.updatedAt = new Date().toISOString();
    recordOperation(current, input.operationId);
    return current;
  });

  try {
    await notifyClientPortalTeam({
      subject: `[${input.client.displayName}] Request: ${title}`,
      body: [notes, '', draft.sync.permalinkUrl ? `Asana: ${draft.sync.permalinkUrl}` : '']
        .filter(Boolean)
        .join('\n'),
    });
  } catch (error) {
    console.error('Conversational brief notification failed', error);
  }
  return draft;
}

export function buildSubmissionCustomFieldsForTest(
  filters: ClientFieldFilter[],
  displayName: string
): Record<string, string> {
  return customFieldsFor({
    slug: 'test',
    displayName,
    contactEmail: 'test@example.com',
    filters,
    intakeProjectGid: 'project',
    intakeSectionGid: 'section',
    engagement: 'new',
    active: true,
    createdAt: new Date(0).toISOString(),
  });
}
