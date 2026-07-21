import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function AccessDeniedPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        <Image
          src="/images/logos/anim-8-completewordmark-white-01.svg"
          alt="Anim-8"
          width={160}
          height={28}
          className="mx-auto mb-6 h-6 w-auto"
          priority
        />
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">Access denied</h1>
        <p className="mb-6 text-sm text-text-muted">
          {session?.user?.email
            ? `${session.user.email} isn't set up with admin or crew access yet. Ask an admin to add you.`
            : "You don't have access to this page."}
        </p>
        <SignOutButton className="glass-button-secondary inline-flex items-center justify-center" />
      </div>
    </div>
  );
}
