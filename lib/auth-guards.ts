import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { isAdminEmail } from './auth-roles';
import { getCrewMember } from './crew-directory';
import 'server-only';

export type SessionUser = {
  email: string;
  name: string;
  admin: boolean;
};

/**
 * Route-handler guard for /api/admin/** — middleware.ts already blocks these
 * paths for non-admins, but every handler re-checks so nothing depends on
 * matcher config alone.
 */
export async function requireAdminSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !isAdminEmail(email)) return null;
  return { email, name: session?.user?.name ?? email, admin: true };
}

/**
 * Route-handler guard for /api/crew/** — admins count as crew too.
 *
 * Uses the crew directory's `name` (not the raw Google profile name) so
 * PTO/WFH calendar events and the status chart match on the exact same
 * string an admin entered when adding the person to the directory.
 */
export async function requireCrewSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const admin = isAdminEmail(email);
  const member = await getCrewMember(email);

  if (admin) {
    return { email, name: member?.name ?? session?.user?.name ?? email, admin: true };
  }

  if (!member?.active) return null;
  return { email, name: member.name, admin: false };
}
