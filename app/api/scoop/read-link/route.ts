import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { creditOutlets, readBrand } from '@/lib/scoop-brand';
import { isUtahStory } from '@/lib/scoop-news';
import { readPublicArticle, type Article, type LinkResult } from '@/lib/scoop-read';
import { readViaClaude } from '@/lib/scoop-claude-read';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { exp: number; value: LinkResult | (Article & { utah: boolean }) }>();

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
  const outlets = creditOutlets(brand);
  // Our server first. When a news site blocks that request, Anthropic fetches the page instead.
  // Private addresses and social links never go to Claude.
  let result: LinkResult = await readPublicArticle(url, outlets);
  let via = 'server';
  if ('error' in result && (result.error === 'failed' || result.error === 'unreadable')) {
    const first = result;
    const second = await readViaClaude(url, outlets);
    console.log('[scoop read-link]', JSON.stringify({ url, server: first, claude: 'error' in second ? second : 'ok' }));
    result = 'error' in second && first.error === 'unreadable' && second.error !== 'unreadable' ? first : second;
    via = 'claude';
  }
  const value = 'error' in result ? result : { ...result, via, utah: isUtahStory({ title: result.title, text: result.text, url: result.url, outlet: result.siteName }) };
  if (!('error' in value) || value.error !== 'failed') cache.set(key, { exp: Date.now() + CACHE_MS, value });
  return NextResponse.json(value, { status: statusFor(value) });
}

function statusFor(result: LinkResult): number {
  if (!('error' in result)) return 200;
  if (result.error === 'invalid' || result.error === 'blocked') return 400;
  if (result.error === 'social' || result.error === 'unreadable') return 422;
  return 502;
}
