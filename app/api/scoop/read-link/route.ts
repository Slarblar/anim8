import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { readBrand } from '@/lib/scoop-brand';
import { readPublicArticle, type LinkResult } from '@/lib/scoop-read';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { exp: number; value: LinkResult }>();

function cacheKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.href;
  } catch {
    return url.trim();
  }
}

/** POST /api/scoop/read-link  { url } → article text, or { error, reason? } */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || url.length > 2048) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const now = Date.now();
  for (const [cached, row] of cache) if (row.exp <= now) cache.delete(cached);
  const key = cacheKey(url);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.value, { status: statusFor(hit.value) });

  const brand = await readBrand();
  const result = await readPublicArticle(url, brand.outlets);
  if (!('error' in result) || result.error !== 'failed') cache.set(key, { exp: Date.now() + CACHE_MS, value: result });
  return NextResponse.json(result, { status: statusFor(result) });
}

function statusFor(result: LinkResult): number {
  if (!('error' in result)) return 200;
  if (result.error === 'invalid' || result.error === 'blocked') return 400;
  if (result.error === 'social' || result.error === 'unreadable') return 422;
  return 502;
}
