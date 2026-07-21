'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClientPortalShell } from './ClientPortalShell';
import {
  portalActionsReveal,
  portalAlertReveal,
  portalFadeUp,
  portalFieldItem,
  portalFieldStagger,
  portalFormReveal,
  portalPageStagger,
  portalVariants,
} from './portal-motion';
import {
  portalAlertError,
  portalBody,
  portalBtnPrimary,
  portalEyebrow,
  portalInput,
  portalLabel,
  portalPageTitle,
  portalTaskCard,
} from './portal-ui';

type ClientRequestFormProps = {
  slug: string;
  displayName: string;
};

function MotionField({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean;
}) {
  return (
    <motion.label className="block" variants={portalVariants(reduce, portalFieldItem)}>
      {children}
    </motion.label>
  );
}

export function ClientRequestForm({ slug, displayName }: ClientRequestFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch(`/api/clients/${slug}`, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? 'Submission failed. Please try again.');
        return;
      }

      router.push(`/clients/${slug}?submitted=1`);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientPortalShell slug={slug} backHref={`/clients/${slug}`} backLabel="← Portal">
      <motion.header
        className="border-b border-white/10 pb-6 pt-1 min-[480px]:pb-8 min-[480px]:pt-2 md:pt-4"
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={portalVariants(!!reduceMotion, portalPageStagger)}
      >
          <motion.p className={portalEyebrow} variants={portalVariants(!!reduceMotion, portalFadeUp)}>
            Client portal
          </motion.p>
          <motion.h1
            className={`${portalPageTitle} mt-2 min-[480px]:mt-3`}
            variants={portalVariants(!!reduceMotion, portalFadeUp)}
          >
            New request
          </motion.h1>
          <motion.p
            className={`${portalBody} mt-2 min-[480px]:mt-3 max-w-2xl`}
            variants={portalVariants(!!reduceMotion, portalFadeUp)}
          >
            Submit a project brief for {displayName}. Our team will review scope and follow up with
            next steps.
          </motion.p>
        </motion.header>

        {/* Future: AI-assisted scope + cost estimate from STAFF MGMT board */}
        <section className="hidden" aria-hidden data-client-request-estimate>
          <h2 className="text-lg text-text">Estimated scope</h2>
        </section>

        <motion.form
          onSubmit={handleSubmit}
          className={`${portalTaskCard} portal-form-card mt-6 min-[480px]:mt-8`}
          variants={portalVariants(!!reduceMotion, portalFormReveal)}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
        >
          <motion.div
            className="space-y-5 min-[480px]:space-y-6"
            variants={portalVariants(!!reduceMotion, portalFieldStagger)}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
          >
            <MotionField reduce={!!reduceMotion}>
              <span className={portalLabel}>Project name</span>
              <input
                name="name"
                required
                className={portalInput}
                placeholder="e.g. March social animations"
              />
            </MotionField>

            <MotionField reduce={!!reduceMotion}>
              <span className={portalLabel}>Brief</span>
              <textarea
                name="brief"
                required
                rows={5}
                className={`${portalInput} resize-y min-h-[120px] min-[480px]:min-h-[140px]`}
                placeholder="Goals, deliverables, specs, anything we should know..."
              />
            </MotionField>

            <MotionField reduce={!!reduceMotion}>
              <span className={portalLabel}>Primary link (optional)</span>
              <textarea
                name="referenceLinks"
                rows={2}
                className={`${portalInput} resize-y`}
                placeholder="Drive folders, Figma links, inspiration URLs..."
              />
            </MotionField>

            <MotionField reduce={!!reduceMotion}>
              <span className={portalLabel}>Target due date (optional)</span>
              <input name="dueOn" type="date" className={`${portalInput} w-full min-[480px]:max-w-xs`} />
            </MotionField>

            <MotionField reduce={!!reduceMotion}>
              <span className={portalLabel}>Attachments (optional)</span>
              <input
                name="files"
                type="file"
                multiple
                className="portal-file-input mt-3 block w-full text-sm text-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand-lime file:px-4 file:py-2.5 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-brand-black hover:file:opacity-90"
              />
              <p className={`${portalBody} mt-2`}>Up to 5 files.</p>
            </MotionField>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitError ? (
              <motion.p
                key={submitError}
                className={`${portalAlertError} mt-5 min-[480px]:mt-6`}
                variants={portalVariants(!!reduceMotion, portalAlertReveal)}
                initial={reduceMotion ? false : 'hidden'}
                animate="show"
                exit={reduceMotion ? undefined : 'exit'}
                role="alert"
              >
                {submitError}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.div
            className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 min-[480px]:mt-6 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:pt-6"
            variants={portalVariants(!!reduceMotion, portalActionsReveal)}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
          >
            <motion.button
              type="submit"
              disabled={submitting}
              className={`${portalBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
              whileHover={reduceMotion || submitting ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion || submitting ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={submitting ? 'loading' : 'idle'}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span
                        className="portal-submit-spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden
                      />
                      Submitting…
                    </>
                  ) : (
                    'Submit request'
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <Link
              href={`/clients/${slug}`}
              className="portal-cancel-link inline-flex w-full min-[480px]:w-auto items-center justify-center rounded-lg border-2 border-white/15 px-4 py-2.5 min-[480px]:px-5 text-[10px] min-[480px]:text-xs font-bold uppercase tracking-wider text-text-muted font-mono"
            >
              Cancel
            </Link>
          </motion.div>
        </motion.form>
    </ClientPortalShell>
  );
}
