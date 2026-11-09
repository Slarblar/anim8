import { describe, expect, it } from 'vitest';
import { applyBriefPatch, createEmptyBrief } from './conversational-brief';
import { applyVerifiedScopeRules, buildConversationClientContext } from './conversational-brief-context';
import type { ClientRecord } from './client-registry';

function stated<T>(value: T) {
  return { value, provenance: 'client_statement' as const };
}

function client(engagement: ClientRecord['engagement']): ClientRecord {
  return {
    slug: `client-${engagement}`,
    displayName: 'Client',
    contactEmail: 'client@example.com',
    filters: [],
    intakeProjectGid: 'project',
    intakeSectionGid: 'section',
    engagement,
    active: true,
    createdAt: new Date(0).toISOString(),
  };
}

function briefFor(category: string) {
  return applyBriefPatch(
    createEmptyBrief('client'),
    {
      objective: stated('Create a campaign asset.'),
      deliverables: [
        {
          action: 'add',
          title: stated('Campaign asset'),
          assetKind: 'creative',
          quantity: stated(1),
          serviceCategoryIds: [category],
        },
      ],
    },
    { sourceRef: 'message-1' }
  );
}

describe('verified account scope', () => {
  it('uses only the assigned engagement coverage', () => {
    const designClient = client('design');
    const context = buildConversationClientContext(designClient, 'America/Denver');
    const graphic = context.coveredCatalog.find((item) => item.serviceId === 'graphic');
    const animation = context.coveredCatalog.find((item) => item.serviceId === 'animation');
    expect(graphic?.categories.some((item) => item.covered)).toBe(true);
    expect(animation?.categories.some((item) => item.covered)).toBe(false);
  });

  it('keeps covered retainer work covered', () => {
    const scoped = applyVerifiedScopeRules(briefFor('video:social'), client('video'));
    expect(scoped.scope.status).toBe('covered');
    expect(scoped.openItems.some((item) => item.impact === 'scope_review')).toBe(false);
  });

  it('flags out-of-agreement work for an estimate without blocking its description', () => {
    const scoped = applyVerifiedScopeRules(briefFor('animation:product'), client('video'));
    expect(scoped.scope.status).toBe('separate_estimate');
    expect(scoped.openItems[0]?.description).toMatch(/separate estimate/i);
    expect(scoped.deliverables[0].title.value).toBe('Campaign asset');
  });

  it('does not treat an unknown category as verified coverage', () => {
    const scoped = applyVerifiedScopeRules(briefFor('other-client:secret-preset'), client('studio'));
    expect(scoped.scope.status).toBe('needs_review');
    expect(scoped.openItems[0]?.description).toMatch(/unverified/i);
  });
});
