import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

/**
 * Sign-in with Google for /admin and /crew. No database adapter — sessions
 * are plain JWTs, and access is gated separately (ADMIN_EMAILS allowlist +
 * the crew directory in KV) via lib/auth-roles.ts / lib/crew-directory.ts
 * and enforced in middleware.ts.
 *
 * The Google OAuth consent screen (Cloud Console -> Google Auth Platform)
 * is intentionally set to "External" + Published, NOT "Internal" — we have
 * two separate Workspace orgs (anim-8.xyz for leadership, anim-8studios.com
 * for crew), and "Internal" only ever covers the single org that owns the
 * GCP project, which blocked the other domain with an org_internal error.
 *
 * This means ANY Google account can complete Google's sign-in screen — that
 * is expected and fine, because we only request basic openid/email/profile
 * scopes (no verification required to publish) and real authorization
 * happens below, in ADMIN_EMAILS / the crew directory. Don't try to "fix"
 * this by flipping the consent screen back to Internal or adding an `hd`
 * (hosted domain) param — it'll just re-break sign-in for whichever of the
 * two domains doesn't own the project.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
