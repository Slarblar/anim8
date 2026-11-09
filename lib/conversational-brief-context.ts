import {
  CATEGORIES,
  SERVICES,
  coveredCategory,
  resolveProfile,
  type ClientProfile,
} from './creative-session';
import type { ClientRecord } from './client-registry';
import type { ConversationClientContext } from './conversational-brief-ai';
import type { ConversationalBrief, OpenItem } from './conversational-brief';

const CATEGORY_SEPARATOR = ':';

export function categoryRef(serviceId: string, categoryId: string): string {
  return `${serviceId}${CATEGORY_SEPARATOR}${categoryId}`;
}

export function buildConversationClientContext(
  client: ClientRecord,
  timezone: string
): ConversationClientContext {
  const profile = resolveProfile(client.engagement);
  return {
    engagement: profile.kind,
    scopeNote: profile.note,
    coveredCatalog: SERVICES.map((service) => ({
      serviceId: service.id,
      serviceName: service.name,
      categories: CATEGORIES[service.id].map((category) => ({
        id: categoryRef(service.id, category.id),
        name: category.name,
        covered: coveredCategory(profile, service.id, category.id),
      })),
    })),
    separateEstimateRequired: profile.kind === 'new',
    timezone,
  };
}

function categoryCoverage(
  profile: ClientProfile,
  reference: string
): 'covered' | 'separate' | 'unknown' {
  const [serviceId, categoryId] = reference.split(CATEGORY_SEPARATOR);
  const service = SERVICES.find((item) => item.id === serviceId);
  if (!service || !CATEGORIES[service.id].some((item) => item.id === categoryId)) return 'unknown';
  return coveredCategory(profile, service.id, categoryId) ? 'covered' : 'separate';
}

export function applyVerifiedScopeRules(
  input: ConversationalBrief,
  client: ClientRecord
): ConversationalBrief {
  const brief = structuredClone(input);
  const profile = resolveProfile(client.engagement);
  const reasons: string[] = [];
  const scopeItems: OpenItem[] = [];

  if (profile.kind === 'new') {
    reasons.push('New-project scope and pricing require team review.');
  }

  for (const deliverable of brief.deliverables) {
    if (deliverable.serviceCategoryIds.length === 0) {
      scopeItems.push({
        id: `scope_${deliverable.id}`,
        targetId: deliverable.id,
        description: `${deliverable.title.value || 'This deliverable'} needs a service/category scope check.`,
        impact: 'scope_review',
        status: 'open',
        resolution: null,
      });
      continue;
    }

    for (const reference of deliverable.serviceCategoryIds) {
      const coverage = categoryCoverage(profile, reference);
      if (coverage === 'separate') {
        const reason = `${deliverable.title.value || 'Deliverable'} is outside the current agreement and needs a separate estimate and approval.`;
        reasons.push(reason);
        scopeItems.push({
          id: `scope_${deliverable.id}_${reference.replace(/[^a-z0-9]/gi, '_')}`,
          targetId: deliverable.id,
          description: reason,
          impact: 'scope_review',
          status: 'open',
          resolution: null,
        });
      } else if (coverage === 'unknown') {
        const reason = `${deliverable.title.value || 'Deliverable'} has an unverified service category.`;
        reasons.push(reason);
        scopeItems.push({
          id: `scope_${deliverable.id}_${reference.replace(/[^a-z0-9]/gi, '_')}`,
          targetId: deliverable.id,
          description: `${reason} The team will confirm scope.`,
          impact: 'scope_review',
          status: 'open',
          resolution: null,
        });
      }
    }
  }

  brief.openItems = [
    ...brief.openItems.filter((item) => item.impact !== 'scope_review'),
    ...scopeItems,
  ];
  const uniqueReasons = [...new Set(reasons)];
  brief.scope = {
    status:
      uniqueReasons.some((reason) => /outside the current agreement/i.test(reason))
        ? 'separate_estimate'
        : uniqueReasons.length > 0
          ? 'needs_review'
          : 'covered',
    reasons: uniqueReasons,
  };
  return brief;
}
