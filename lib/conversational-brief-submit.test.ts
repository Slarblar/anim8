import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBriefPatch, createEmptyBrief } from './conversational-brief';
import type { ClientRecord } from './client-registry';

const memory = vi.hoisted(() => ({ state: null as any }));

vi.mock('./conversational-brief-store', () => ({
  getConversationDraft: vi.fn(async () => structuredClone(memory.state)),
  updateConversationDraft: vi.fn(async (_slug: string, _draftId: string, update: any) => {
    const next = await update(structuredClone(memory.state));
    next.revision = memory.state.revision + 1;
    next.updatedAt = new Date().toISOString();
    memory.state = structuredClone(next);
    return structuredClone(next);
  }),
  recordOperation: (draft: any, operationId: string) => {
    draft.processedOperationIds.push(operationId);
  },
}));

vi.mock('./asana', () => ({
  createClientSubmission: vi.fn(),
  createBriefSubtask: vi.fn(),
  addBriefReferenceComment: vi.fn(),
}));

vi.mock('./brief-builder', () => ({
  servicesClientOptionGid: () => ({ gid: null, usedMisc: true }),
}));

vi.mock('./client-portal-notify', () => ({
  notifyClientPortalTeam: vi.fn(async () => false),
}));

import {
  buildConversationalSubtasks,
  formatConversationalBriefForAsana,
  submitConversationDraft,
  type ConversationAsanaAdapter,
} from './conversational-brief-submit';

function stated<T>(value: T) {
  return { value, provenance: 'client_statement' as const };
}

const client: ClientRecord = {
  slug: 'testclient',
  displayName: 'Test Client',
  contactEmail: 'test@example.com',
  filters: [],
  intakeProjectGid: 'project-1',
  intakeSectionGid: 'section-1',
  engagement: 'video',
  active: true,
  createdAt: new Date(0).toISOString(),
};

function makeState() {
  const brief = applyBriefPatch(
    createEmptyBrief(client.slug),
    {
      title: stated('Launch assets'),
      objective: stated('Support a product launch.'),
      deliverables: [
        {
          action: 'add',
          title: stated('Reels'),
          assetKind: 'video',
          quantity: stated(2),
          serviceCategoryIds: ['video:social'],
          variants: [
            {
              action: 'add',
              label: 'Vertical MP4',
              outputKind: 'video',
              format: stated('MP4'),
              specifications: { aspectRatio: stated('9:16') },
            },
          ],
        },
      ],
      requestedDelivery: stated({
        date: '2026-12-18',
        timezone: 'America/Denver',
      }),
    },
    { sourceRef: 'message-1' }
  );
  const now = new Date().toISOString();
  return {
    id: 'draft-1',
    clientSlug: client.slug,
    revision: 1,
    brief,
    messages: [],
    approvedVersion: brief.version,
    approvedAt: now,
    reviewedAt: now,
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

beforeEach(() => {
  memory.state = makeState();
});

describe('conversational Asana handoff', () => {
  it('creates one subtask per creative asset, not per output variant', () => {
    const subtasks = buildConversationalSubtasks(memory.state.brief);
    expect(subtasks).toHaveLength(2);
    expect(subtasks.map((item) => item.name)).toEqual(['Reels 1', 'Reels 2']);
    expect(subtasks[0].notes).toContain('Format: MP4');
  });

  it('labels requested timing without treating it as a confirmed date', () => {
    const notes = formatConversationalBriefForAsana({
      brief: memory.state.brief,
      requestReference: 'request-1',
      engagement: 'retainer',
    });
    expect(notes).toContain('2026-12-18 (America/Denver) — requested, not confirmed');
    expect(notes).toContain('does not confirm scope, price, production start, or delivery');
  });

  it('returns the confirmed submission on duplicate clicks without duplicate writes', async () => {
    const adapter: ConversationAsanaAdapter = {
      createParent: vi.fn(async () => ({ gid: 'parent-1', permalink_url: 'https://app.asana.com/parent-1' })),
      createSubtask: vi.fn(async (_parent, input) => ({ gid: `sub-${input.name}` })),
      addComment: vi.fn(async () => undefined),
    };
    await submitConversationDraft({
      client,
      draftId: 'draft-1',
      operationId: 'operation-1',
      adapter,
    });
    await submitConversationDraft({
      client,
      draftId: 'draft-1',
      operationId: 'operation-2',
      adapter,
    });
    expect(adapter.createParent).toHaveBeenCalledTimes(1);
    expect(adapter.createSubtask).toHaveBeenCalledTimes(2);
    expect(adapter.addComment).toHaveBeenCalledTimes(1);
    expect(memory.state.sync.status).toBe('confirmed');
  });

  it('preserves successful writes and resumes only missing subtasks', async () => {
    let subtaskAttempt = 0;
    const adapter: ConversationAsanaAdapter = {
      createParent: vi.fn(async () => ({ gid: 'parent-1', permalink_url: 'https://app.asana.com/parent-1' })),
      createSubtask: vi.fn(async (_parent, input) => {
        subtaskAttempt += 1;
        if (subtaskAttempt === 2) throw new Error('Asana subtask failed: 503 unavailable');
        return { gid: `sub-${input.name}` };
      }),
      addComment: vi.fn(async () => undefined),
    };

    await expect(
      submitConversationDraft({
        client,
        draftId: 'draft-1',
        operationId: 'operation-1',
        adapter,
      })
    ).rejects.toThrow(/503/);
    expect(memory.state.sync.parentTaskGid).toBe('parent-1');
    expect(Object.keys(memory.state.sync.subtaskGids)).toHaveLength(1);
    expect(memory.state.sync.status).toBe('failed');

    await submitConversationDraft({
      client,
      draftId: 'draft-1',
      operationId: 'operation-2',
      adapter,
    });
    expect(adapter.createParent).toHaveBeenCalledTimes(1);
    expect(Object.keys(memory.state.sync.subtaskGids)).toHaveLength(2);
    expect(memory.state.sync.status).toBe('confirmed');
  });

  it('does not risk a second parent after an ambiguous create timeout', async () => {
    const adapter: ConversationAsanaAdapter = {
      createParent: vi.fn(async () => {
        throw new Error('Network connection closed after request body was sent');
      }),
      createSubtask: vi.fn(),
      addComment: vi.fn(),
    };
    await expect(
      submitConversationDraft({
        client,
        draftId: 'draft-1',
        operationId: 'operation-1',
        adapter,
      })
    ).rejects.toThrow(/Network connection/);
    expect(memory.state.sync.status).toBe('unknown');

    await expect(
      submitConversationDraft({
        client,
        draftId: 'draft-1',
        operationId: 'operation-2',
        adapter,
      })
    ).rejects.toThrow(/reconcile/i);
    expect(adapter.createParent).toHaveBeenCalledTimes(1);
  });
});
