import { z } from 'zod';

export const PROVENANCE_VALUES = [
  'client_statement',
  'verified_project_spec',
  'verified_client_preset',
  'ai_proposal',
  'team_decision',
  'unknown',
] as const;

export const RESOLUTION_VALUES = [
  'stated',
  'defaulted',
  'proposed',
  'confirmed',
  'unresolved',
] as const;

export const OUTPUT_KINDS = [
  'raster_image',
  'video',
  'vector',
  'print',
  'model_3d',
  'audio',
  'native_project',
  'other',
] as const;

export const DELIVERY_SPEC_KEYS = [
  'width',
  'height',
  'dimensions',
  'physicalDimensions',
  'units',
  'aspectRatio',
  'transparency',
  'background',
  'colorProfile',
  'quality',
  'maxFileSize',
  'container',
  'codec',
  'resolution',
  'frameRate',
  'duration',
  'captions',
  'alpha',
  'bitrate',
  'audio',
  'variants',
  'fontTreatment',
  'editableFiles',
  'bleed',
  'printerMarks',
  'imageResolution',
  'targetApplication',
  'geometryLimits',
  'textureLimits',
  'materials',
  'scale',
  'orientation',
  'rigging',
  'animation',
  'sampleRate',
  'bitDepth',
  'channels',
  'loudness',
  'application',
  'versionCompatibility',
  'linkedAssets',
  'packaging',
  'handoffInstructions',
] as const;

export type Provenance = (typeof PROVENANCE_VALUES)[number];
export type Resolution = (typeof RESOLUTION_VALUES)[number];
export type OutputKind = (typeof OUTPUT_KINDS)[number];
export type DeliverySpecKey = (typeof DELIVERY_SPEC_KEYS)[number];
export type SpecificationValue = string | number | boolean | string[];

const provenanceSchema = z.enum(PROVENANCE_VALUES);
const resolutionSchema = z.enum(RESOLUTION_VALUES);
const outputKindSchema = z.enum(OUTPUT_KINDS);
const specKeySchema = z.enum(DELIVERY_SPEC_KEYS);

function fieldSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    provenance: provenanceSchema,
    sourceRefs: z.array(z.string().min(1).max(160)).max(20),
    resolution: resolutionSchema,
  });
}

const stringFieldSchema = fieldSchema(z.string().max(8000));
const stringArrayFieldSchema = fieldSchema(z.array(z.string().max(1000)).max(80));
const numberFieldSchema = fieldSchema(z.number().int().positive().max(999));
const specificationValueSchema = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(500)).max(40),
]);
const specificationFieldSchema = fieldSchema(specificationValueSchema);

export const requestedDeliveryValueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().max(30).optional(),
  timezone: z.string().min(1).max(100),
});

export const attachmentSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(300),
  url: z.string().url(),
  role: z.enum(['source', 'reference']),
  status: z.enum(['uploaded', 'processing', 'available', 'unreadable', 'access_unverified']),
});

export const referenceLinkSchema = z.object({
  id: z.string().min(1).max(160),
  url: z.string().url(),
  label: z.string().max(300),
  status: z.enum(['recorded', 'available', 'access_unverified', 'unreadable']),
});

export const deliveryVariantSchema = z.object({
  id: z.string().min(1).max(160),
  label: z.string().min(1).max(240),
  outputKind: outputKindSchema,
  format: stringFieldSchema,
  specifications: z.partialRecord(specKeySchema, specificationFieldSchema),
});

export const deliverableSchema = z.object({
  id: z.string().min(1).max(160),
  title: stringFieldSchema,
  serviceCategoryIds: z.array(z.string().min(1).max(120)).max(20),
  assetKind: z.string().min(1).max(120),
  quantity: numberFieldSchema,
  description: stringFieldSchema,
  direction: stringFieldSchema,
  requirements: stringArrayFieldSchema,
  avoidances: stringArrayFieldSchema,
  sourceAssetIds: z.array(z.string().min(1).max(160)).max(40),
  referenceIds: z.array(z.string().min(1).max(160)).max(40),
  variants: z.array(deliveryVariantSchema).max(30),
});

export const openItemSchema = z.object({
  id: z.string().min(1).max(160),
  targetId: z.string().min(1).max(160).nullable(),
  description: z.string().min(1).max(1000),
  impact: z.enum(['clarify_request', 'before_production', 'team_decision', 'scope_review']),
  status: z.enum(['open', 'delegated', 'resolved']),
  resolution: z.string().max(1000).nullable(),
});

export const briefSchema = z.object({
  id: z.string().min(1).max(160),
  version: z.number().int().positive(),
  clientId: z.string().min(1).max(160),
  title: stringFieldSchema,
  objective: stringFieldSchema,
  deliverables: z.array(deliverableSchema).max(40),
  requestedDelivery: fieldSchema(requestedDeliveryValueSchema),
  requestedPriority: stringFieldSchema,
  attachments: z.array(attachmentSchema).max(20),
  references: z.array(referenceLinkSchema).max(30),
  openItems: z.array(openItemSchema).max(80),
  scope: z.object({
    status: z.enum(['covered', 'separate_estimate', 'needs_review']),
    reasons: z.array(z.string().max(1000)).max(20),
  }),
});

export type Field<T> = {
  value: T | null;
  provenance: Provenance;
  sourceRefs: string[];
  resolution: Resolution;
};

export type RequestedDelivery = z.infer<typeof requestedDeliveryValueSchema>;
export type BriefAttachment = z.infer<typeof attachmentSchema>;
export type BriefReference = z.infer<typeof referenceLinkSchema>;
export type DeliveryVariant = z.infer<typeof deliveryVariantSchema>;
export type Deliverable = z.infer<typeof deliverableSchema>;
export type OpenItem = z.infer<typeof openItemSchema>;
export type ConversationalBrief = z.infer<typeof briefSchema>;

export type FieldUpdate<T> = {
  value: T | null;
  resolution?: Resolution;
  provenance?: Extract<Provenance, 'client_statement' | 'ai_proposal' | 'team_decision'>;
};

export type VariantPatch = {
  action: 'add' | 'update' | 'remove';
  targetId?: string;
  label?: string;
  outputKind?: OutputKind;
  format?: FieldUpdate<string>;
  specifications?: Partial<Record<DeliverySpecKey, FieldUpdate<SpecificationValue> | null>>;
};

export type DeliverablePatch = {
  action: 'add' | 'update' | 'remove';
  targetId?: string;
  title?: FieldUpdate<string>;
  serviceCategoryIds?: string[];
  assetKind?: string;
  quantity?: FieldUpdate<number>;
  description?: FieldUpdate<string>;
  direction?: FieldUpdate<string>;
  requirements?: FieldUpdate<string[]>;
  avoidances?: FieldUpdate<string[]>;
  sourceAssetIds?: string[];
  referenceIds?: string[];
  variants?: VariantPatch[];
};

export type BriefPatch = {
  title?: FieldUpdate<string>;
  objective?: FieldUpdate<string>;
  requestedDelivery?: FieldUpdate<RequestedDelivery>;
  requestedPriority?: FieldUpdate<string>;
  deliverables?: DeliverablePatch[];
  openItems?: Array<{
    targetId?: string | null;
    description: string;
    impact: OpenItem['impact'];
    status?: OpenItem['status'];
    resolution?: string | null;
  }>;
};

const patchProvenanceSchema = z.enum(['client_statement', 'ai_proposal', 'team_decision']);
function fieldUpdateSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    resolution: resolutionSchema.optional(),
    provenance: patchProvenanceSchema.optional(),
  }).strict();
}

const runtimeStringUpdateSchema = fieldUpdateSchema(z.string().max(8000));
const runtimeNumberUpdateSchema = fieldUpdateSchema(z.number().int().positive().max(999));
const runtimeStringArrayUpdateSchema = fieldUpdateSchema(z.array(z.string().max(1000)).max(80));
const runtimeSpecUpdateSchema = fieldUpdateSchema(specificationValueSchema);

const runtimeVariantPatchSchema = z.object({
  action: z.enum(['add', 'update', 'remove']),
  targetId: z.string().max(160).optional(),
  label: z.string().max(240).optional(),
  outputKind: outputKindSchema.optional(),
  format: runtimeStringUpdateSchema.optional(),
  specifications: z.partialRecord(specKeySchema, runtimeSpecUpdateSchema.nullable()).optional(),
}).strict();

const runtimeDeliverablePatchSchema = z.object({
  action: z.enum(['add', 'update', 'remove']),
  targetId: z.string().max(160).optional(),
  title: runtimeStringUpdateSchema.optional(),
  serviceCategoryIds: z.array(z.string().max(120)).max(20).optional(),
  assetKind: z.string().max(120).optional(),
  quantity: runtimeNumberUpdateSchema.optional(),
  description: runtimeStringUpdateSchema.optional(),
  direction: runtimeStringUpdateSchema.optional(),
  requirements: runtimeStringArrayUpdateSchema.optional(),
  avoidances: runtimeStringArrayUpdateSchema.optional(),
  sourceAssetIds: z.array(z.string().max(160)).max(40).optional(),
  referenceIds: z.array(z.string().max(160)).max(40).optional(),
  variants: z.array(runtimeVariantPatchSchema).max(30).optional(),
}).strict();

export const briefPatchSchema: z.ZodType<BriefPatch> = z.object({
  title: runtimeStringUpdateSchema.optional(),
  objective: runtimeStringUpdateSchema.optional(),
  requestedDelivery: fieldUpdateSchema(requestedDeliveryValueSchema).optional(),
  requestedPriority: runtimeStringUpdateSchema.optional(),
  deliverables: z.array(runtimeDeliverablePatchSchema).max(40).optional(),
  openItems: z.array(
    z.object({
      targetId: z.string().max(160).nullable().optional(),
      description: z.string().min(1).max(1000),
      impact: z.enum(['clarify_request', 'before_production', 'team_decision', 'scope_review']),
      status: z.enum(['open', 'delegated', 'resolved']).optional(),
      resolution: z.string().max(1000).nullable().optional(),
    }).strict()
  ).max(80).optional(),
}).strict();

const SPEC_KEYS_BY_KIND: Record<OutputKind, ReadonlySet<DeliverySpecKey>> = {
  raster_image: new Set([
    'width', 'height', 'dimensions', 'aspectRatio', 'transparency', 'background',
    'colorProfile', 'quality', 'maxFileSize', 'handoffInstructions',
  ]),
  video: new Set([
    'width', 'height', 'dimensions', 'container', 'codec', 'resolution', 'aspectRatio',
    'frameRate', 'duration', 'captions', 'alpha', 'bitrate', 'audio', 'colorProfile',
    'maxFileSize', 'handoffInstructions',
  ]),
  vector: new Set([
    'width', 'height', 'dimensions', 'variants', 'fontTreatment', 'editableFiles',
    'colorProfile', 'handoffInstructions',
  ]),
  print: new Set([
    'physicalDimensions', 'units', 'bleed', 'printerMarks', 'colorProfile',
    'imageResolution', 'handoffInstructions',
  ]),
  model_3d: new Set([
    'targetApplication', 'geometryLimits', 'textureLimits', 'materials', 'scale',
    'units', 'orientation', 'rigging', 'animation', 'versionCompatibility',
    'linkedAssets', 'packaging', 'handoffInstructions',
  ]),
  audio: new Set([
    'duration', 'sampleRate', 'bitDepth', 'channels', 'loudness', 'maxFileSize',
    'handoffInstructions',
  ]),
  native_project: new Set([
    'application', 'versionCompatibility', 'linkedAssets', 'packaging',
    'editableFiles', 'handoffInstructions',
  ]),
  other: new Set(['dimensions', 'duration', 'handoffInstructions']),
};

function id(prefix: string): string {
  const value =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value}`;
}

export function unknownField<T>(value: T | null = null): Field<T> {
  return {
    value,
    provenance: 'unknown',
    sourceRefs: [],
    resolution: value == null ? 'unresolved' : 'stated',
  };
}

function updatedField<T>(
  update: FieldUpdate<T>,
  sourceRef: string,
  defaultProvenance: Provenance
): Field<T> {
  const provenance = update.provenance ?? defaultProvenance;
  return {
    value: update.value,
    provenance,
    sourceRefs: [sourceRef],
    resolution:
      update.resolution ??
      (update.value == null ? 'unresolved' : provenance === 'ai_proposal' ? 'proposed' : 'stated'),
  };
}

function emptyDeliverable(sourceRef: string): Deliverable {
  return {
    id: id('deliverable'),
    title: unknownField('Untitled deliverable'),
    serviceCategoryIds: [],
    assetKind: 'other',
    quantity: unknownField(1),
    description: unknownField(),
    direction: unknownField(),
    requirements: unknownField([]),
    avoidances: unknownField([]),
    sourceAssetIds: [],
    referenceIds: [],
    variants: [],
  };
}

function emptyVariant(outputKind: OutputKind, sourceRef: string): DeliveryVariant {
  return {
    id: id('variant'),
    label: 'Output',
    outputKind,
    format: {
      ...unknownField<string>(),
      sourceRefs: sourceRef ? [sourceRef] : [],
    },
    specifications: {},
  };
}

export function createEmptyBrief(clientId: string, timezone = 'UTC'): ConversationalBrief {
  return briefSchema.parse({
    id: id('brief'),
    version: 1,
    clientId,
    title: unknownField(),
    objective: unknownField(),
    deliverables: [],
    requestedDelivery: {
      ...unknownField<RequestedDelivery>(),
      value: null,
    },
    requestedPriority: unknownField(),
    attachments: [],
    references: [],
    openItems: [],
    scope: { status: 'needs_review', reasons: [] },
  });
}

function applyVariantPatch(
  deliverable: Deliverable,
  patch: VariantPatch,
  sourceRef: string,
  provenance: Provenance
): void {
  if (patch.action === 'remove') {
    if (!patch.targetId) throw new Error('Variant removal requires a target ID.');
    deliverable.variants = deliverable.variants.filter((variant) => variant.id !== patch.targetId);
    return;
  }

  let variant: DeliveryVariant;
  if (patch.action === 'add') {
    variant = emptyVariant(patch.outputKind ?? 'other', sourceRef);
    deliverable.variants.push(variant);
  } else {
    variant = deliverable.variants.find((item) => item.id === patch.targetId)!;
    if (!variant) throw new Error('The requested output variant no longer exists.');
  }

  if (patch.label?.trim()) variant.label = patch.label.trim().slice(0, 240);
  if (patch.outputKind && patch.outputKind !== variant.outputKind) {
    variant.outputKind = patch.outputKind;
    for (const key of Object.keys(variant.specifications) as DeliverySpecKey[]) {
      if (!SPEC_KEYS_BY_KIND[variant.outputKind].has(key)) {
        delete variant.specifications[key];
      }
    }
  }
  if (patch.format) variant.format = updatedField(patch.format, sourceRef, provenance);

  for (const [key, update] of Object.entries(patch.specifications ?? {}) as Array<
    [DeliverySpecKey, FieldUpdate<SpecificationValue> | null]
  >) {
    if (!SPEC_KEYS_BY_KIND[variant.outputKind].has(key)) {
      throw new Error(`${key} does not apply to ${variant.outputKind} outputs.`);
    }
    if (update == null) {
      delete variant.specifications[key];
    } else {
      variant.specifications[key] = updatedField(update, sourceRef, provenance);
    }
  }
}

function normalizeOpenItems(
  current: OpenItem[],
  patch: NonNullable<BriefPatch['openItems']>
): OpenItem[] {
  const protectedItems = current.filter((item) => item.impact === 'scope_review');
  const next = patch.map((item) => {
    const matching = current.find(
      (existing) =>
        existing.targetId === (item.targetId ?? null) &&
        existing.description.toLowerCase() === item.description.trim().toLowerCase()
    );
    return {
      id: matching?.id ?? id('open'),
      targetId: item.targetId ?? null,
      description: item.description.trim(),
      impact: item.impact,
      status: item.status ?? 'open',
      resolution: item.resolution?.trim() || null,
    } satisfies OpenItem;
  });
  return [...protectedItems, ...next].slice(0, 80);
}

export function applyBriefPatch(
  input: ConversationalBrief,
  patch: BriefPatch,
  options: {
    sourceRef: string;
    provenance?: Provenance;
    expectedVersion?: number;
  }
): ConversationalBrief {
  const brief = briefSchema.parse(structuredClone(input));
  if (options.expectedVersion != null && options.expectedVersion !== brief.version) {
    throw new Error('This brief changed while the update was being prepared.');
  }
  const provenance = options.provenance ?? 'client_statement';
  const sourceRef = options.sourceRef;

  if (patch.title) brief.title = updatedField(patch.title, sourceRef, provenance);
  if (patch.objective) brief.objective = updatedField(patch.objective, sourceRef, provenance);
  if (patch.requestedDelivery) {
    brief.requestedDelivery = updatedField(patch.requestedDelivery, sourceRef, provenance);
  }
  if (patch.requestedPriority) {
    brief.requestedPriority = updatedField(patch.requestedPriority, sourceRef, provenance);
  }

  for (const change of patch.deliverables ?? []) {
    if (change.action === 'remove') {
      if (!change.targetId) throw new Error('Deliverable removal requires a target ID.');
      brief.deliverables = brief.deliverables.filter((item) => item.id !== change.targetId);
      continue;
    }

    let deliverable: Deliverable;
    if (change.action === 'add') {
      deliverable = emptyDeliverable(sourceRef);
      brief.deliverables.push(deliverable);
    } else {
      deliverable = brief.deliverables.find((item) => item.id === change.targetId)!;
      if (!deliverable) throw new Error('The requested deliverable no longer exists.');
    }

    if (change.title) deliverable.title = updatedField(change.title, sourceRef, provenance);
    if (change.serviceCategoryIds) {
      deliverable.serviceCategoryIds = [...new Set(change.serviceCategoryIds.map((item) => item.trim()).filter(Boolean))].slice(0, 20);
    }
    if (change.assetKind?.trim()) deliverable.assetKind = change.assetKind.trim().slice(0, 120);
    if (change.quantity) deliverable.quantity = updatedField(change.quantity, sourceRef, provenance);
    if (change.description) deliverable.description = updatedField(change.description, sourceRef, provenance);
    if (change.direction) deliverable.direction = updatedField(change.direction, sourceRef, provenance);
    if (change.requirements) deliverable.requirements = updatedField(change.requirements, sourceRef, provenance);
    if (change.avoidances) deliverable.avoidances = updatedField(change.avoidances, sourceRef, provenance);
    if (change.sourceAssetIds) deliverable.sourceAssetIds = [...new Set(change.sourceAssetIds)].slice(0, 40);
    if (change.referenceIds) deliverable.referenceIds = [...new Set(change.referenceIds)].slice(0, 40);
    for (const variantPatch of change.variants ?? []) {
      applyVariantPatch(deliverable, variantPatch, sourceRef, provenance);
    }
  }

  if (patch.openItems) brief.openItems = normalizeOpenItems(brief.openItems, patch.openItems);
  brief.version += 1;
  return briefSchema.parse(brief);
}

function fieldSaysTrue(field: Field<SpecificationValue> | undefined): boolean {
  if (!field) return false;
  if (field.value === true) return true;
  return typeof field.value === 'string' && /^(yes|true|transparent|alpha)$/i.test(field.value.trim());
}

export type BriefConflict = {
  targetId: string;
  description: string;
  impact: OpenItem['impact'];
};

export function findBriefConflicts(brief: ConversationalBrief): BriefConflict[] {
  const conflicts: BriefConflict[] = [];
  for (const deliverable of brief.deliverables) {
    for (const variant of deliverable.variants) {
      const format = variant.format.value?.trim().toLowerCase().replace(/^\./, '') ?? '';
      if ((format === 'jpg' || format === 'jpeg') && fieldSaysTrue(variant.specifications.transparency)) {
        conflicts.push({
          targetId: variant.id,
          impact: 'clarify_request',
          description: 'JPEG does not support transparency. Choose PNG/WebP or confirm an opaque background.',
        });
      }
      for (const key of Object.keys(variant.specifications) as DeliverySpecKey[]) {
        if (!SPEC_KEYS_BY_KIND[variant.outputKind].has(key)) {
          conflicts.push({
            targetId: variant.id,
            impact: 'clarify_request',
            description: `${key} does not apply to ${variant.outputKind} delivery.`,
          });
        }
      }
    }
  }
  return conflicts;
}

export function reconcileConflicts(brief: ConversationalBrief): ConversationalBrief {
  const next = briefSchema.parse(structuredClone(brief));
  const conflicts = findBriefConflicts(next);
  const conflictIds = new Set(conflicts.map((item) => `${item.targetId}:${item.description}`));
  const retained = next.openItems.filter(
    (item) =>
      !item.id.startsWith('conflict_') ||
      conflictIds.has(`${item.targetId ?? ''}:${item.description}`)
  );
  for (const conflict of conflicts) {
    const existing = retained.find(
      (item) =>
        item.targetId === conflict.targetId &&
        item.description === conflict.description
    );
    if (!existing) {
      retained.push({
        id: `conflict_${id('item')}`,
        targetId: conflict.targetId,
        description: conflict.description,
        impact: conflict.impact,
        status: 'open',
        resolution: null,
      });
    }
  }
  next.openItems = retained;
  return next;
}

export function canSubmitForTeamReview(brief: ConversationalBrief): boolean {
  return Boolean(
    brief.objective.value?.trim() ||
      brief.deliverables.some(
        (item) => item.title.value?.trim() || item.description.value?.trim()
      )
  );
}

export function productionReadiness(brief: ConversationalBrief): {
  ready: boolean;
  clarifyRequest: OpenItem[];
  beforeProduction: OpenItem[];
  teamDecisions: OpenItem[];
  scopeReview: OpenItem[];
} {
  const open = brief.openItems.filter((item) => item.status === 'open');
  const clarifyRequest = open.filter((item) => item.impact === 'clarify_request');
  const beforeProduction = open.filter((item) => item.impact === 'before_production');
  const teamDecisions = open.filter((item) => item.impact === 'team_decision');
  const scopeReview = open.filter((item) => item.impact === 'scope_review');
  return {
    ready: clarifyRequest.length === 0 && beforeProduction.length === 0 && scopeReview.length === 0,
    clarifyRequest,
    beforeProduction,
    teamDecisions,
    scopeReview,
  };
}

export function outputKindLabel(kind: OutputKind): string {
  return {
    raster_image: 'Image',
    video: 'Video / motion',
    vector: 'Vector artwork',
    print: 'Print',
    model_3d: '3D asset',
    audio: 'Audio',
    native_project: 'Editable source',
    other: 'Other',
  }[kind];
}

export function deliverySpecLabel(key: DeliverySpecKey): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

export function deliverySpecKeysFor(kind: OutputKind): DeliverySpecKey[] {
  return [...SPEC_KEYS_BY_KIND[kind]];
}
