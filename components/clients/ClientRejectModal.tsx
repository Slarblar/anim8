'use client';

import { useEffect, useId, useState } from 'react';
import {
  portalAlertError,
  portalBody,
  portalBtnPrimary,
  portalBtnSecondary,
  portalInput,
  portalLabel,
  portalSectionTitle,
} from './portal-ui';

type ClientRejectModalProps = {
  open: boolean;
  taskName: string;
  defaultEmail?: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { reason: string; contactEmail: string }) => void;
};

export function ClientRejectModal({
  open,
  taskName,
  defaultEmail = '',
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}: ClientRejectModalProps) {
  const titleId = useId();
  const [reason, setReason] = useState('');
  const [contactEmail, setContactEmail] = useState(defaultEmail);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setContactEmail(defaultEmail);
  }, [open, defaultEmail]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 min-[480px]:items-center"
      role="presentation"
      onClick={submitting ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="portal-form-card glass-card relative z-10 w-full max-w-lg rounded-[20px] p-5 min-[480px]:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={`${portalSectionTitle} break-words`}>
          Reject estimate
        </h2>
        <p className={`${portalBody} mt-2`}>
          Tell us what needs to change for{' '}
          <span className="text-white">{taskName}</span>. We&apos;ll email the Anim-8 team
          and follow up with a revised estimate.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ reason, contactEmail });
          }}
        >
          <div>
            <label htmlFor="reject-reason" className={portalLabel}>
              What should we adjust?
            </label>
            <textarea
              id="reject-reason"
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${portalInput} min-h-[7rem] resize-y`}
              placeholder="Scope, budget, timeline, creative direction…"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="reject-email" className={portalLabel}>
              Your email
            </label>
            <input
              id="reject-email"
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={portalInput}
              disabled={submitting}
            />
          </div>

          {error ? <p className={portalAlertError}>{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
            <button
              type="button"
              className={portalBtnSecondary}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className={portalBtnPrimary} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send to Anim-8'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
