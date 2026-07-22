'use client';

import type { ReactNode } from 'react';
import { signOut } from 'next-auth/react';

export function SignOutButton({ className, label }: { className?: string; label?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={
        className ??
        'rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/40'
      }
    >
      {label ?? 'Sign out'}
    </button>
  );
}
