'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import {
  portalAlertSuccess,
  portalAlertWarning,
  portalBody,
  portalBtnPrimary,
  portalInput,
  portalLabel,
  portalTaskCard,
} from './portal-ui';

export function ClientPortalLogin() {
  const searchParams = useSearchParams();
  const expired = searchParams.get('error') === 'expired';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/clients/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError('Could not send a link right now. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Could not send a link right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className={`${portalTaskCard} mt-8 max-w-lg`}>
        <p className={portalAlertSuccess}>Check your inbox.</p>
        <p className={`${portalBody} mt-4`}>
          If that email is on file, we sent a link to your portal. It expires in 30
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${portalTaskCard} mt-8 max-w-lg`}>
      {expired ? (
        <p className={`${portalAlertWarning} mb-4`}>
          That link is invalid or expired. Enter your email and we&apos;ll send a new
          one.
        </p>
      ) : null}
      {error ? <p className={`${portalAlertWarning} mb-4`}>{error}</p> : null}
      <label className={portalLabel} htmlFor="client-email">
        Email
      </label>
      <input
        id="client-email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        className={portalInput}
      />
      <p className={`${portalBody} mt-3`}>
        Use the email Anim-8 has on file. We&apos;ll send a one-time link — no password,
        and you don&apos;t need your project URL.
      </p>
      <button type="submit" className={`${portalBtnPrimary} mt-5`} disabled={submitting}>
        {submitting ? 'Sending…' : 'Email me my portal'}
      </button>
    </form>
  );
}
