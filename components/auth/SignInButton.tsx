'use client';

import { signIn } from 'next-auth/react';

export function SignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl })}
      className="glass-button-primary inline-flex items-center gap-3"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#fff"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.7-1.57 2.69-3.88 2.69-6.64z"
        />
        <path
          fill="#fff"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.85.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"
        />
        <path
          fill="#fff"
          d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34z"
        />
        <path
          fill="#fff"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59A8.9 8.9 0 0 0 9 0 8.98 8.98 0 0 0 .96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
