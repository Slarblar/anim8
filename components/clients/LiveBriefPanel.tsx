'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  OUTPUT_KINDS,
  canSubmitForTeamReview,
  deliverySpecKeysFor,
  deliverySpecLabel,
  outputKindLabel,
  productionReadiness,
  type BriefPatch,
  type ConversationalBrief,
  type Deliverable,
  type DeliverySpecKey,
  type DeliveryVariant,
  type OutputKind,
} from '@/lib/conversational-brief';
import type { ConversationDraft } from '@/lib/conversational-brief-store';
import {
  portalAlertSuccess,
  portalAlertWarning,
  portalBtnPrimary,
  portalBtnSecondary,
  portalInput,
  portalLabel,
  portalSectionTitle,
} from './portal-ui';

type Props = {
  draft: ConversationDraft;
  busy: boolean;
  onEdit: (patch: BriefPatch) => Promise<void>;
  onReview: () => Promise<void>;
  onApprove: () => Promise<void>;
  onSubmit: () => Promise<void>;
};

function EditableText({
  label,
  value,
  multiline = false,
  onSave,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(value), [value]);

  async function save() {
    const next = draft.trim();
    if (next === value.trim()) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  const shared = {
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => void save(),
    disabled: saving,
    'aria-label': label,
  };
  return multiline ? (
    <textarea {...shared} rows={3} className={`${portalInput} resize-y text-sm`} />
  ) : (
    <input {...shared} className={`${portalInput} text-sm`} />
  );
}

function VariantEditor({
  deliverable,
  variant,
  onEdit,
}: {
  deliverable: Deliverable;
  variant: DeliveryVariant;
  onEdit: Props['onEdit'];
}) {
  const [newKey, setNewKey] = useState<DeliverySpecKey | ''>('');
  const available = deliverySpecKeysFor(variant.outputKind).filter(
    (key) => !variant.specifications[key]
  );
  const updateVariant = (
    patch: Omit<NonNullable<NonNullable<BriefPatch['deliverables']>[number]['variants']>[number], 'action' | 'targetId'>
  ) =>
    onEdit({
      deliverables: [
        {
          action: 'update',
          targetId: deliverable.id,
          variants: [{ action: 'update', targetId: variant.id, ...patch }],
        },
      ],
    });

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">
          {outputKindLabel(variant.outputKind)}
        </span>
        <button
          type="button"
          className="text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white"
          onClick={() =>
            void onEdit({
              deliverables: [
                {
                  action: 'update',
                  targetId: deliverable.id,
                  variants: [{ action: 'remove', targetId: variant.id }],
                },
              ],
            })
          }
        >
          Remove
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <span className={portalLabel}>Label</span>
          <EditableText
            label="Variant label"
            value={variant.label}
            onSave={(value) => updateVariant({ label: value })}
          />
        </label>
        <label>
          <span className={portalLabel}>Format</span>
          <EditableText
            label="Delivery format"
            value={variant.format.value ?? ''}
            onSave={(value) =>
              updateVariant({
                format: { value, provenance: 'client_statement', resolution: 'stated' },
              })
            }
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className={portalLabel}>Output type</span>
        <select
          className={portalInput}
          value={variant.outputKind}
          onChange={(event) =>
            void updateVariant({ outputKind: event.target.value as OutputKind })
          }
        >
          {OUTPUT_KINDS.map((kind) => (
            <option key={kind} value={kind} className="bg-[#14151f]">
              {outputKindLabel(kind)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 space-y-2">
        {Object.entries(variant.specifications).map(([key, field]) =>
          field ? (
            <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label>
                <span className={portalLabel}>{deliverySpecLabel(key as DeliverySpecKey)}</span>
                <EditableText
                  label={deliverySpecLabel(key as DeliverySpecKey)}
                  value={Array.isArray(field.value) ? field.value.join(', ') : String(field.value ?? '')}
                  onSave={(value) =>
                    updateVariant({
                      specifications: {
                        [key]: {
                          value,
                          provenance: 'client_statement',
                          resolution: 'stated',
                        },
                      },
                    })
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`Remove ${deliverySpecLabel(key as DeliverySpecKey)}`}
                className="mb-2 text-white/45 hover:text-white"
                onClick={() =>
                  void updateVariant({ specifications: { [key]: null } })
                }
              >
                ×
              </button>
            </div>
          ) : null
        )}
      </div>
      {available.length ? (
        <div className="mt-3 flex gap-2">
          <select
            className={`${portalInput} !mt-0 min-w-0 flex-1`}
            value={newKey}
            onChange={(event) => setNewKey(event.target.value as DeliverySpecKey | '')}
            aria-label="Add delivery specification"
          >
            <option value="" className="bg-[#14151f]">Add specification…</option>
            {available.map((key) => (
              <option key={key} value={key} className="bg-[#14151f]">
                {deliverySpecLabel(key)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 text-xs text-white disabled:opacity-40"
            disabled={!newKey}
            onClick={() => {
              if (!newKey) return;
              void updateVariant({
                specifications: {
                  [newKey]: {
                    value: '',
                    provenance: 'client_statement',
                    resolution: 'unresolved',
                  },
                },
              });
              setNewKey('');
            }}
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DeliverableEditor({
  deliverable,
  onEdit,
}: {
  deliverable: Deliverable;
  onEdit: Props['onEdit'];
}) {
  const basePatch = (
    patch: Omit<NonNullable<BriefPatch['deliverables']>[number], 'action' | 'targetId'>
  ) =>
    onEdit({
      deliverables: [{ action: 'update', targetId: deliverable.id, ...patch }],
    });

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className={portalLabel}>Deliverable</span>
          <EditableText
            label="Deliverable title"
            value={deliverable.title.value ?? ''}
            onSave={(value) =>
              basePatch({ title: { value, provenance: 'client_statement', resolution: 'stated' } })
            }
          />
        </div>
        <button
          type="button"
          className="mt-6 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white"
          onClick={() =>
            void onEdit({ deliverables: [{ action: 'remove', targetId: deliverable.id }] })
          }
        >
          Remove
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
        <label>
          <span className={portalLabel}>Quantity</span>
          <input
            className={portalInput}
            type="number"
            min={1}
            value={deliverable.quantity.value ?? 1}
            onChange={(event) => {
              const quantity = Number(event.target.value);
              if (Number.isInteger(quantity) && quantity > 0) {
                void basePatch({
                  quantity: {
                    value: quantity,
                    provenance: 'client_statement',
                    resolution: 'stated',
                  },
                });
              }
            }}
          />
        </label>
        <label>
          <span className={portalLabel}>Asset type</span>
          <EditableText
            label="Asset type"
            value={deliverable.assetKind}
            onSave={(value) => basePatch({ assetKind: value })}
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className={portalLabel}>Description</span>
        <EditableText
          label="Deliverable description"
          value={deliverable.description.value ?? ''}
          multiline
          onSave={(value) =>
            basePatch({ description: { value, provenance: 'client_statement', resolution: 'stated' } })
          }
        />
      </label>
      <label className="mt-3 block">
        <span className={portalLabel}>Creative direction</span>
        <EditableText
          label="Creative direction"
          value={deliverable.direction.value ?? ''}
          multiline
          onSave={(value) =>
            basePatch({ direction: { value, provenance: 'client_statement', resolution: 'stated' } })
          }
        />
      </label>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className={portalLabel}>Delivery specifications</span>
          <button
            type="button"
            className="text-[10px] font-bold uppercase tracking-wider text-brand-lime hover:text-white"
            onClick={() =>
              void basePatch({
                variants: [
                  {
                    action: 'add',
                    label: 'New output',
                    outputKind: 'other',
                    format: {
                      value: '',
                      provenance: 'client_statement',
                      resolution: 'unresolved',
                    },
                  },
                ],
              })
            }
          >
            + Add output
          </button>
        </div>
        {deliverable.variants.length ? (
          deliverable.variants.map((variant) => (
            <VariantEditor
              key={variant.id}
              deliverable={deliverable}
              variant={variant}
              onEdit={onEdit}
            />
          ))
        ) : (
          <p className="text-xs text-white/45">No delivery format confirmed yet.</p>
        )}
      </div>
    </section>
  );
}

export function LiveBriefPanel({
  draft,
  busy,
  onEdit,
  onReview,
  onApprove,
  onSubmit,
}: Props) {
  const { brief } = draft;
  const readiness = useMemo(() => productionReadiness(brief), [brief]);
  const approved = draft.approvedVersion === brief.version;
  const canReview = canSubmitForTeamReview(brief);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className={portalSectionTitle}>Live brief</h2>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-mono text-white/50">
          v{brief.version}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-white/50">
        Edit anything directly. Chat corrections and these fields update the same saved brief.
      </p>

      <label className="block">
        <span className={portalLabel}>Project title</span>
        <EditableText
          label="Project title"
          value={brief.title.value ?? ''}
          onSave={(value) =>
            onEdit({ title: { value, provenance: 'client_statement', resolution: 'stated' } })
          }
        />
      </label>
      <label className="block">
        <span className={portalLabel}>Objective</span>
        <EditableText
          label="Project objective"
          value={brief.objective.value ?? ''}
          multiline
          onSave={(value) =>
            onEdit({ objective: { value, provenance: 'client_statement', resolution: 'stated' } })
          }
        />
      </label>

      <div className="space-y-3">
        {brief.deliverables.map((deliverable) => (
          <DeliverableEditor key={deliverable.id} deliverable={deliverable} onEdit={onEdit} />
        ))}
        <button
          type="button"
          className={`${portalBtnSecondary} !w-full`}
          disabled={busy}
          onClick={() =>
            void onEdit({
              deliverables: [
                {
                  action: 'add',
                  title: { value: 'New deliverable', provenance: 'client_statement' },
                  assetKind: 'other',
                  quantity: { value: 1, provenance: 'client_statement' },
                },
              ],
            })
          }
        >
          + Add deliverable
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <label>
          <span className={portalLabel}>Requested date</span>
          <input
            type="date"
            className={portalInput}
            value={brief.requestedDelivery.value?.date ?? ''}
            onChange={(event) => {
              if (!event.target.value) return;
              void onEdit({
                requestedDelivery: {
                  value: {
                    date: event.target.value,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                  },
                  provenance: 'client_statement',
                  resolution: 'stated',
                },
              });
            }}
          />
        </label>
        <label>
          <span className={portalLabel}>Requested priority</span>
          <EditableText
            label="Requested priority"
            value={brief.requestedPriority.value ?? ''}
            onSave={(value) =>
              onEdit({
                requestedPriority: {
                  value,
                  provenance: 'client_statement',
                  resolution: 'stated',
                },
              })
            }
          />
        </label>
      </div>

      {brief.openItems.length ? (
        <div className={portalAlertWarning}>
          <p className="font-bold">Open items</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {brief.openItems.map((item) => (
              <li key={item.id}>
                <span className="font-mono uppercase">{item.impact.replace(/_/g, ' ')}:</span>{' '}
                {item.description}
                {item.status === 'delegated' ? ' — team to decide' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.scope.status === 'separate_estimate' ? (
        <div className={portalAlertWarning}>
          This request includes work outside the current agreement. The team will review it for a
          separate estimate before any chargeable work begins.
        </div>
      ) : null}

      {draft.sync.status === 'confirmed' ? (
        <div className={portalAlertSuccess} role="status">
          <p className="font-bold">Request received</p>
          <p className="mt-1 text-xs">
            Reference: {draft.sync.submissionId}
          </p>
          {draft.sync.permalinkUrl ? (
            <a
              href={draft.sync.permalinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs underline"
            >
              View request
            </a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <button
            type="button"
            className={`${portalBtnSecondary} !w-full`}
            disabled={busy || !canReview}
            onClick={() => void onReview()}
          >
            Review brief
          </button>
          {!approved ? (
            <button
              type="button"
              className={`${portalBtnPrimary} !w-full`}
              disabled={busy || !canReview || !draft.reviewedAt}
              onClick={() => void onApprove()}
            >
              Approve this version
            </button>
          ) : (
            <button
              type="button"
              className={`${portalBtnPrimary} !w-full`}
              disabled={busy}
              onClick={() => void onSubmit()}
            >
              {readiness.ready ? 'Send request' : 'Send for team review'}
            </button>
          )}
          {!canReview ? (
            <p className="text-xs text-white/45">
              Add the intended work or objective before sending it to the team.
            </p>
          ) : null}
          {draft.sync.status === 'failed' || draft.sync.status === 'unknown' ? (
            <div className={portalAlertWarning}>
              {draft.sync.error || 'The request was not confirmed. Your approved brief is saved.'}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
