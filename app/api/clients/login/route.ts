import { NextRequest, NextResponse } from 'next/server';
import {
  claimClientLoginSend,
  createClientLoginToken,
} from '@/lib/client-portal-auth';
import { getClientByEmail } from '@/lib/client-registry';
import { sendClientPortalLoginEmail } from '@/lib/client-portal-notify';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip');
  return ip || null;
}

/**
 * Always returns the same success payload so this route can't be used to
 * discover which emails have a portal. Existing /clients/[slug] links stay public.
 */
export async function POST(req: NextRequest) {
  let email = '';
  try {
    const body = (await req.json()) as { email?: string };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    email = '';
  }

  const ok = NextResponse.json({
    ok: true,
    message: 'If that email is on file, we sent a link to your portal.',
  });

  if (!EMAIL_RE.test(email)) return ok;

  const allowed = await claimClientLoginSend(email, clientIp(req));
  if (!allowed) return ok;

  const client = await getClientByEmail(email);
  if (!client) return ok;

  const token = await createClientLoginToken({ slug: client.slug, email: client.contactEmail });
  await sendClientPortalLoginEmail({
    to: client.contactEmail,
    displayName: client.displayName,
    token,
  });

  return ok;
}
