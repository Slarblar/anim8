import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/auth-roles';
import { isCrewMemberEmail } from '@/lib/crew-directory';

/**
 * Landing spot right after Google sign-in when we don't already know whether
 * this person is an admin or crew (e.g. they hit /login directly instead of
 * being bounced there from a specific /admin or /crew page). Without this,
 * /login's default callbackUrl used to hardcode '/admin', which sent
 * crew-only accounts straight into the admin-only middleware check and
 * bounced them to /access-denied even though they *were* valid, active crew.
 */
export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email) redirect('/login');
  if (isAdminEmail(email)) redirect('/admin');
  if (await isCrewMemberEmail(email)) redirect('/crew');
  redirect('/access-denied');
}
