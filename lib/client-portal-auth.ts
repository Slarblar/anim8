import { createHmac, timingSafeEqual } from 'crypto';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getKv } from './kv';
import 'server-only';

const loginTokenId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  32
);

const LOGIN_KEY_PREFIX = 'client-portal-login:';
const RATE_EMAIL_PREFIX = 'client-portal-login-rate:';
const RATE_IP_PREFIX = 'client-portal-login-ip:';

export const CLIENT_PORTAL_COOKIE = 'a8_client';
export const LOGIN_TOKEN_TTL_SEC = 30 * 60;
export const SESSION_TTL_SEC = 90 * 24 * 60 * 60;
const RATE_EMAIL_TTL_SEC = 60;
const RATE_IP_TTL_SEC = 10 * 60;
const RATE_IP_MAX = 8;

export type ClientPortalSession = {
  slug: string;
  email: string;
};

type LoginTokenRecord = ClientPortalSession;

function signingSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.CLIENT_PORTAL_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET or CLIENT_PORTAL_SECRET is not set');
  }
  return secret;
}

function encodeSessionCookie(session: ClientPortalSession, exp: number): string {
  const body = Buffer.from(JSON.stringify({ ...session, exp })).toString('base64url');
  const sig = createHmac('sha256', signingSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function decodeSessionCookie(value: string | undefined): ClientPortalSession | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = createHmac('sha256', signingSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as {
      slug?: string;
      email?: string;
      exp?: number;
    };
    if (!payload.slug || !payload.email || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now() / 1000) return null;
    return { slug: payload.slug, email: payload.email };
  } catch {
    return null;
  }
}

export function clientPortalCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SEC,
  };
}

export function applyClientPortalSession(res: NextResponse, session: ClientPortalSession): void {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  res.cookies.set(CLIENT_PORTAL_COOKIE, encodeSessionCookie(session, exp), clientPortalCookieOptions());
}

export async function getClientPortalSession(): Promise<ClientPortalSession | null> {
  try {
    return decodeSessionCookie(cookies().get(CLIENT_PORTAL_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function createClientLoginToken(session: ClientPortalSession): Promise<string> {
  const token = loginTokenId();
  await getKv().set(`${LOGIN_KEY_PREFIX}${token}`, session, { ex: LOGIN_TOKEN_TTL_SEC });
  return token;
}

export async function peekClientLoginToken(token: string): Promise<ClientPortalSession | null> {
  if (!token) return null;
  const record = await getKv().get<LoginTokenRecord>(`${LOGIN_KEY_PREFIX}${token}`);
  if (!record?.slug || !record?.email) return null;
  return record;
}

export async function consumeClientLoginToken(token: string): Promise<ClientPortalSession | null> {
  const record = await peekClientLoginToken(token);
  if (!record) return null;
  await getKv().del(`${LOGIN_KEY_PREFIX}${token}`);
  return record;
}

/**
 * Soft throttle so a public /clients form can't hammer Resend or probe emails.
 * Returns false when this request should skip sending (still tell the user it worked).
 */
export async function claimClientLoginSend(email: string, ip: string | null): Promise<boolean> {
  const kv = getKv();
  const emailKey = `${RATE_EMAIL_PREFIX}${email}`;
  const existing = await kv.get<number>(emailKey);
  if (existing) return false;
  await kv.set(emailKey, 1, { ex: RATE_EMAIL_TTL_SEC });

  if (ip) {
    const ipKey = `${RATE_IP_PREFIX}${ip}`;
    const count = await kv.incr(ipKey);
    if (count === 1) await kv.expire(ipKey, RATE_IP_TTL_SEC);
    if (count > RATE_IP_MAX) return false;
  }

  return true;
}
