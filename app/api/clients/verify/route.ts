import { NextRequest, NextResponse } from 'next/server';
import { applyClientPortalSession, consumeClientLoginToken } from '@/lib/client-portal-auth';
import { getClientBySlug } from '@/lib/client-registry';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = (form?.get('token') ?? '').toString().trim();

  const fail = () => NextResponse.redirect(new URL('/clients?error=expired', req.url), 303);

  if (!token) return fail();

  const session = await consumeClientLoginToken(token);
  if (!session) return fail();

  const client = await getClientBySlug(session.slug);
  if (!client) return fail();

  const res = NextResponse.redirect(new URL(`/clients/${client.slug}`, req.url), 303);
  applyClientPortalSession(res, { slug: client.slug, email: client.contactEmail });
  return res;
}
