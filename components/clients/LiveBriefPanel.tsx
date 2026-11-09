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
  type Deliverable,
  type DeliverySpecKey,
  type DeliveryVariant,
  type OpenItem,
  type OutputKind,
} from '@/lib/conversational-brief';
import type { ConversationDraft } from '@/lib/conversational-brief-store';

type Props = {
  draft: ConversationDraft;
  busy: boolean;
  onEdit: (patch: BriefPatch) => Promise<void>;
  onReview: () => Promise<void>;
  onApprove: () => Promise<void>;
  onSubmit: () => Promise<void>;
};

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-base leading-snug text-white outline-none transition placeholder:text-white/30 focus:border-brand-lime/55 focus:ring-2 focus:ring-brand-lime/20 disabled:opacity-60 sm:py-2.5 sm:text-sm';

const labelClass = 'block text-xs font-semibold uppercase tracking-[0.14em] text-white/55';

const quietButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08] focus-lime disabled:opacity-40';

function impactLabel(impact: OpenItem['impact']): string {
  switch (impact) {
    case 'clarify_request':
      return 'Needs an answer';
    case 'before_production':
      return 'Needed before production';
    case 'team_decision':
      return 'Team will decide';
    case 'scope_review':
      return 'Scope review';
    default:
      return 'Open item';
  }
}

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
    className: `${fieldClass} ${multiline ? 'min-h-[4.5rem] resize-y' : ''}`,
  };

  if (multiline) {
    return <textarea {...shared} rows={2} />;
  }

  return (
    <input
      {...shared}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
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
    patch: Omit<
      NonNullable<NonNullable<BriefPatch['deliverables']>[number]['variants']>[number],
      'action' | 'targetId'
    >
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
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-brand-cyan">
          {outputKindLabel(variant.outputKind)}
        </span>
        <button
          type="button"
          className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-red-200 hover:text-white focus-lime"
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
      <label className="mt-3 block">
        <span className={labelClass}>Label</span>
        <EditableText
          label="Variant label"
          value={variant.label}
          onSave={(value) => updateVariant({ label: value })}
        />
      </label>
      <label className="mt-3 block">
        <span className={labelClass}>Format</span>
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
      <label className="mt-3 block">
        <span className={labelClass}>Output type</span>
        <select
          className={fieldClass}
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

      <div className="mt-4 space-y-3">
        {Object.entries(variant.specifications).map(([key, field]) =>
          field ? (
            <div key={key} className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className={labelClass}>{deliverySpecLabel(key as DeliverySpecKey)}</span>
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
                className="mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-lg text-white/55 hover:text-white focus-lime"
                onClick={() => void updateVariant({ specifications: { [key]: null } })}
              >
                ×
              </button>
            </div>
          ) : null
        )}
      </div>
      {available.length ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            className={`${fieldClass} !mt-0 min-w-0 flex-1`}
            value={newKey}
            onChange={(event) => setNewKey(event.target.value as DeliverySpecKey | '')}
            aria-label="Add delivery specification"
          >
            <option value="" className="bg-[#14151f]">
              Add specification…
            </option>
            {available.map((key) => (
              <option key={key} value={key} className="bg-[#14151f]">
                {deliverySpecLabel(key)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${quietButton} shrink-0`}
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
  defaultOpen,
  onEdit,
}: {
  deliverable: Deliverable;
  defaultOpen: boolean;
  onEdit: Props['onEdit'];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const title = deliverable.title.value?.trim() || 'Untitled deliverable';
  const quantity = deliverable.quantity.value ?? 1;
  const [quantityDraft, setQuantityDraft] = useState(String(quantity));
  useEffect(() => setQuantityDraft(String(quantity)), [quantity]);

  const basePatch = (
    patch: Omit<NonNullable<BriefPatch['deliverables']>[number], 'action' | 'targetId'>
  ) =>
    onEdit({
      deliverables: [{ action: 'update', targetId: deliverable.id, ...patch }],
    });

  function commitQuantity() {
    const next = Number(quantityDraft);
    if (!Number.isInteger(next) || next < 1 || next > 999 || next === quantity) {
      setQuantityDraft(String(quantity));
      return;
    }
    void basePatch({
      quantity: { value: next, provenance: 'client_statement', resolution: 'stated' },
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-lime sm:px-4"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span
            aria-hidden
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-sm text-white/70 transition ${open ? 'rotate-90' : ''}`}
          >
            ›
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white sm:text-base">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-white/50 sm:text-sm">
              {quantity} × {deliverable.assetKind.replace(/_/g, ' ')}
              {deliverable.variants.length
                ? ` · ${deliverable.variants.map((variant) => variant.label || outputKindLabel(variant.outputKind)).join(', ')}`
                : ''}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="inline-flex min-h-14 items-center px-3 text-sm font-semibold text-red-200 hover:text-white focus-lime sm:px-4"
          onClick={() =>
            void onEdit({ deliverables: [{ action: 'remove', targetId: deliverable.id }] })
          }
        >
          Remove
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-white/10 px-3 py-4 sm:px-4">
          <label className="block">
            <span className={labelClass}>Title</span>
            <EditableText
              label="Deliverable title"
              value={deliverable.title.value ?? ''}
              onSave={(value) =>
                basePatch({ title: { value, provenance: 'client_statement', resolution: 'stated' } })
              }
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <label>
              <span className={labelClass}>Quantity</span>
              <input
                className={fieldClass}
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={quantityDraft}
                aria-label="Quantity"
                onChange={(event) => setQuantityDraft(event.target.value)}
                onBlur={commitQuantity}
              />
            </label>
            <label>
              <span className={labelClass}>Asset type</span>
              <EditableText
                label="Asset type"
                value={deliverable.assetKind}
                onSave={(value) => basePatch({ assetKind: value })}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Description</span>
            <EditableText
              label="Deliverable description"
              value={deliverable.description.value ?? ''}
              multiline
              onSave={(value) =>
                basePatch({
                  description: { value, provenance: 'client_statement', resolution: 'stated' },
                })
              }
            />
          </label>
          <label className="block">
            <span className={labelClass}>Creative direction</span>
            <EditableText
              label="Creative direction"
              value={deliverable.direction.value ?? ''}
              multiline
              onSave={(value) =>
                basePatch({
                  direction: { value, provenance: 'client_statement', resolution: 'stated' },
                })
              }
            />
          </label>

          <div className="space-y-3 pt-1">
            <p className={labelClass}>Delivery specifications</p>
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
              <p className="text-sm leading-relaxed text-white/55">No delivery format confirmed yet.</p>
            )}
            <button
              type="button"
              className={`${quietButton} w-full`}
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
              Add output
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function stageFor(draft: ConversationDraft): 0 | 1 | 2 | 3 {
  if (draft.sync.status === 'confirmed') return 3;
  if (draft.approvedVersion === draft.brief.version) return 2;
  if (draft.reviewedAt) return 1;
  return 0;
}

const STAGE_COPY = [
  'Describe the work. The brief updates as you go.',
  'Read this version, then approve it.',
  'Approved. Send it when it looks right.',
  'The team has this request.',
] as const;

export function LiveBriefPanel({ draft, busy, onEdit, onReview, onApprove, onSubmit }: Props) {
  const { brief } = draft;
  const readiness = useMemo(() => productionReadiness(brief), [brief]);
  const approved = draft.approvedVersion === brief.version;
  const canReview = canSubmitForTeamReview(brief);
  const stage = stageFor(draft);
  const openItems = brief.openItems.filter((item) => item.status === 'open' || item.status === 'delegated');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="intake-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 id="live-brief-heading" tabIndex={-1} className="text-lg font-black uppercase tracking-tight text-white outline-none sm:text-xl">
              Live brief
            </h2>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70">
              Version {brief.version}
            </span>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1.5 flex-1 rounded-full ${step <= stage ? 'bg-brand-lime' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{STAGE_COPY[stage]}</p>
        </div>

        <label className="block">
          <span className={labelClass}>Project title</span>
          <EditableText
            label="Project title"
            value={brief.title.value ?? ''}
            onSave={(value) =>
              onEdit({ title: { value, provenance: 'client_statement', resolution: 'stated' } })
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>Objective</span>
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
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Deliverables
            </h3>
            <span className="text-xs text-white/45">{brief.deliverables.length}</span>
          </div>
          {brief.deliverables.length ? (
            brief.deliverables.map((deliverable, index) => (
              <DeliverableEditor
                key={deliverable.id}
                deliverable={deliverable}
                defaultOpen={index === 0}
                onEdit={onEdit}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm leading-relaxed text-white/55">
              Nothing is listed yet. Send a message, or add the first deliverable yourself.
            </p>
          )}
          <button
            type="button"
            className={`${quietButton} w-full`}
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
            Add deliverable
          </button>
        </div>

        <label className="block">
          <span className={labelClass}>Requested date</span>
          <input
            type="date"
            className={fieldClass}
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
          <span className="mt-1.5 block text-xs leading-relaxed text-white/40">
            A request for the team, not a confirmed deadline.
          </span>
        </label>
        <label className="block">
          <span className={labelClass}>Requested priority</span>
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

        {openItems.length ? (
          <section aria-label="Open items">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
              Open items
            </h3>
            <ul className="mt-2 space-y-2">
              {openItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-brand-cyan/25 bg-brand-cyan/10 px-3.5 py-3 text-sm leading-relaxed text-white"
                >
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan">
                    {impactLabel(item.impact)}
                    {item.status === 'delegated' ? ' · delegated' : ''}
                  </span>
                  {item.description}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {brief.scope.status === 'separate_estimate' ? (
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-3.5 py-3 text-sm leading-relaxed text-cyan-50">
            This request includes work outside the current agreement. The team will review it for a
            separate estimate before any chargeable work begins.
          </div>
        ) : null}

        {draft.sync.status === 'failed' || draft.sync.status === 'unknown' ? (
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-3.5 py-3 text-sm leading-relaxed text-cyan-50" role="alert">
            {draft.sync.error || 'The request was not confirmed. Your approved brief is saved.'}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#0c0d14]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        {draft.sync.status === 'confirmed' ? (
          <div className="rounded-2xl border border-brand-lime/30 bg-brand-lime/10 px-3.5 py-3 text-sm text-brand-lime" role="status">
            <p className="font-semibold text-white">Request received</p>
            <p className="mt-1 text-white/70">Reference {draft.sync.submissionId}</p>
            {draft.sync.permalinkUrl ? (
              <a
                href={draft.sync.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-lime underline"
              >
                View request
              </a>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {!approved ? (
              <>
                <button
                  type="button"
                  className={`${quietButton} w-full`}
                  disabled={busy || !canReview}
                  onClick={() => void onReview()}
                >
                  Review brief
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-brand-cyan/50 bg-brand-cyan px-4 text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,194,214,0.28)] transition hover:brightness-110 focus-lime disabled:opacity-40"
                  disabled={busy || !canReview || !draft.reviewedAt}
                  onClick={() => void onApprove()}
                >
                  Approve this version
                </button>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-brand-cyan/50 bg-brand-cyan px-4 text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,194,214,0.28)] transition hover:brightness-110 focus-lime disabled:opacity-40"
                disabled={busy}
                onClick={() => void onSubmit()}
              >
                {readiness.ready ? 'Send request' : 'Send for team review'}
              </button>
            )}
            {!canReview ? (
              <p className="text-sm leading-relaxed text-white/50">
                Add the work or the objective before sending this to the team.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
