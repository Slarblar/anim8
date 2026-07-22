import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminEmail } from '@/lib/auth-roles';
import { isCrewMemberEmail } from '@/lib/crew-directory';

export const config = {
  matcher: ['/admin/:path*', '/crew/:path*', '/api/admin/:path*', '/api/crew/:path*'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  const deny = (
    redirectPath: '/login' | '/access-denied',
    status: number,
    reason: string,
    email: string | null
  ) => {
    if (isApi) {
      return NextResponse.json(
        {
          error: status === 401 ? 'Unauthorized' : 'Forbidden',
          reason,
          email,
        },
        { status }
      );
    }
    const url = new URL(redirectPath, req.url);
    if (redirectPath === '/login') url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  };

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email ?? null;

  if (!email) return deny('/login', 401, 'no-session', null);

  const admin = isAdminEmail(email);
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isCrewPath = pathname.startsWith('/crew') || pathname.startsWith('/api/crew');

  if (isAdminPath && !admin) {
    return deny('/access-denied', 403, 'not-in-admin-emails', email);
  }

  if (isCrewPath && !admin) {
    const crew = await isCrewMemberEmail(email);
    if (!crew) return deny('/access-denied', 403, 'not-admin-and-not-in-crew-directory', email);
  }

  return NextResponse.next();
}
