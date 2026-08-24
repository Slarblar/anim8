'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { put } from '@vercel/blob/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FiHardDrive } from 'react-icons/fi';
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
  formatPortalDisplayName,
  portalEyebrow,
  portalInput,
  portalLabel,
  portalPageTitle,
  portalTaskCard,
} from './portal-ui';

type ClientRequestFormProps = {
  slug: string;
  displayName: string;
  driveFolderUrl?: string;
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;

const portalAttachBtn =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-lime px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-black transition hover:opacity-90 focus-lime';

function fileSummaryLabel(files: File[]): string {
  if (files.length === 0) return 'No file chosen';
  if (files.length === 1) return files[0].name;
  return `${files.length} files chosen`;
}

function selectedFiles(form: HTMLFormElement): File[] {
  const input = form.querySelector<HTMLInputElement>('input[name="files"]');
  if (!input?.files) return [];
  return Array.from(input.files).filter((file) => file.size > 0);
}

function validateAttachments(files: File[]): string | null {
  if (files.length > MAX_FILES) return 'Please attach up to 5 files.';
  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    return 'Each file must be 50 MB or smaller.';
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return 'Attachments are over 50 MB total. Remove some files or paste a Google Drive link instead.';
  }
  return null;
}

function safeBlobPathname(slug: string, fileName: string): string {
  const base = fileName.replace(/[^\w.\- ()]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `client-portal/${slug}/${Date.now()}-${base || 'file'}`;
}

async function readJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    return {} as T;
  }
}

function attachErrorMessage(driveFolderUrl?: string): string {
  return driveFolderUrl
    ? 'We could not attach those files. Remove them and submit, or use Your Drive.'
    : 'We could not attach those files. Remove them and submit, or paste a Drive link in Primary link.';
}

async function uploadAttachment(slug: string, file: File): Promise<string> {
  const pathname = safeBlobPathname(slug, file.name);
  const tokenRes = await fetch(`/api/clients/${slug}/blob`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname,
        clientPayload: null,
        multipart: true,
      },
    }),
  });
  const tokenData = await readJson<{ clientToken?: string; error?: string }>(tokenRes);
  if (!tokenRes.ok || !tokenData.clientToken) {
    throw new Error(tokenData.error ?? attachErrorMessage());
  }

  const blob = await put(pathname, file, {
    access: 'public',
    token: tokenData.clientToken,
    multipart: true,
  });
  return blob.url;
}

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

export function ClientRequestForm({
  slug,
  displayName,
  driveFolderUrl,
}: ClientRequestFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Submitting…');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileSummary, setFileSummary] = useState('No file chosen');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitLabel('Submitting…');

    const form = e.currentTarget;
    const files = selectedFiles(form);
    const attachError = validateAttachments(files);
    if (attachError) {
      setSubmitError(attachError);
      setSubmitting(false);
      return;
    }

    const formData = new FormData(form);
    formData.delete('files');

    try {
      if (files.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i += 1) {
          setSubmitLabel(`Uploading ${i + 1} of ${files.length}…`);
          urls.push(await uploadAttachment(slug, files[i]));
        }
        formData.set('attachmentUrls', JSON.stringify(urls));
      }

      setSubmitLabel('Submitting…');
      const res = await fetch(`/api/clients/${slug}`, {
        method: 'POST',
        body: formData,
      });
      const data = await readJson<{ error?: string }>(res);

      if (!res.ok) {
        setSubmitError(data.error ?? 'Submission failed. Please try again.');
        return;
      }

      router.push(`/clients/${slug}?submitted=1`);
    } catch (err) {
      const fallback = attachErrorMessage(driveFolderUrl);
      const message = err instanceof Error ? err.message : fallback;
      setSubmitError(
        /vercel blob|client token|could not attach|file uploads are temporarily/i.test(message)
          ? fallback
          : message
      );
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
            Submit a project brief for {formatPortalDisplayName(displayName)}. Our team will review scope and follow up with
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

            <motion.div
              className="block"
              variants={portalVariants(!!reduceMotion, portalFieldItem)}
            >
              <span className={portalLabel} id="client-request-attachments-label">
                Attachments (optional)
              </span>
              <input
                ref={fileInputRef}
                id="client-request-files"
                name="files"
                type="file"
                multiple
                className="sr-only"
                aria-labelledby="client-request-attachments-label"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).filter((file) => file.size > 0);
                  setFileSummary(fileSummaryLabel(files));
                }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={portalAttachBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </button>
                {driveFolderUrl ? (
                  <a
                    href={driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={portalAttachBtn}
                    aria-label="Open your Google Drive folder"
                  >
                    <FiHardDrive className="h-4 w-4" aria-hidden />
                    Your Drive
                  </a>
                ) : null}
                <span className="min-w-0 text-sm text-text-muted">{fileSummary}</span>
              </div>
              <p className={`${portalBody} mt-2`}>
                {driveFolderUrl
                  ? 'Up to 5 files, 50 MB total. Bigger than that? Open Your Drive and upload there.'
                  : 'Up to 5 files, 50 MB total. Bigger than that? Paste a Google Drive folder link above instead.'}
              </p>
            </motion.div>
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
                  key={submitting ? submitLabel : 'idle'}
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
                      {submitLabel}
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
