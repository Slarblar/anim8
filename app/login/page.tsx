'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SignInButton } from '@/components/auth/SignInButton';

function LoginCard() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const error = searchParams.get('error');

  return (
    <div className="glass-card w-full max-w-sm p-8 text-center">
      <Image
        src="/images/logos/anim-8-completewordmark-white-01.svg"
        alt="Anim-8"
        width={160}
        height={28}
        className="mx-auto mb-6 h-6 w-auto"
        priority
      />
      <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">Team sign in</h1>
      <p className="mb-6 text-sm text-text-muted">
        Sign in with your Anim-8 Google account to access the admin or crew portal.
      </p>
      {error ? (
        <p className="mb-4 rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-4 py-2 text-sm text-red-100">
          Something went wrong signing you in. Please try again.
        </p>
      ) : null}
      <SignInButton callbackUrl={callbackUrl} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
