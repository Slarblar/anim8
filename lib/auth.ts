import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

/**
 * Sign-in with Google for /admin and /crew. No database adapter — sessions
 * are plain JWTs, and access is gated separately (ADMIN_EMAILS allowlist +
 * the crew directory in KV) via lib/auth-roles.ts / lib/crew-directory.ts
 * and enforced in middleware.ts.
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
