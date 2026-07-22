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
 *
 * DO NOT set a static NEXTAUTH_URL in Production. Because this one
 * deployment serves BOTH anim-8.xyz and anim-8studios.com as first-class
 * login domains (not a canonical-domain-plus-redirect setup), a hardcoded
 * NEXTAUTH_URL forces every OAuth callback to land on that one domain —
 * breaking sign-in for the other domain, since the state/CSRF cookies set
 * when the flow starts are host-only and don't carry over to a different
 * host on callback.
 *
 * With NEXTAUTH_URL unset, next-auth v4 (see
 * node_modules/next-auth/utils/detect-origin.js) automatically derives the
 * origin per-request from the incoming Host header whenever
 * `process.env.VERCEL` is set — which Vercel sets on every deployment
 * automatically — so anim-8.xyz and anim-8studios.com each complete their
 * own self-consistent OAuth round trip without any extra config here.
 * (There's no `trustHost` option in classic next-auth v4 — that's an
 * Auth.js v5 / @auth/core-only property and fails the TS build here.) Both
 * domains' exact callback URLs must still be registered in the Google
 * Cloud Console OAuth client's Authorized redirect URIs. NEXTAUTH_URL is
 * still fine (and needed) for local dev, where VERCEL isn't set.
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
