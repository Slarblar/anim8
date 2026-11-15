import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { readBrandRecord, writeBrandRecord } from '@/lib/scoop-brand';
import { fetchPublicBody } from '@/lib/scoop-read';
import {
  applySourceFixes,
  collectNews,
  normalizeNewsSources,
  outletDomains,
  passesWindow,
  type FetchText,
  type NewsItem,
  type NewsSource,
  type NewsWindow,
} from '@/lib/scoop-news';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HAIKU = 'claude-haiku-4-5-20251001';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CACHE_MS = 3 * 60 * 1000;

type Cached = { exp: number; sources: NewsSource[]; items: NewsItem[]; held: NewsItem[] };
let cached: Cached | null = null;

function windowOf(value: string | null): NewsWindow {
  if (value === '3h' || value === '6h' || value === '24h' || value === '7d') return value;
  return '6h';
}

function narrow(items: NewsItem[], window: NewsWindow, now: Date): NewsItem[] {
  return items.filter((item) => passesWindow(item, window, now));
}

const fetchText: FetchText = async (url, headers) => {
  const result = await fetchPublicBody(url, { headers, timeoutMs: 10_000 });
  if ('error' in result) {
    return { ok: false, error: result.reason || 'The source could not be read.' };
  }
  return { ok: true, text: result.text };
};

/** Grouping call: titles only, which of these are Utah news. */
async function decideUtah(titles: string[]): Promise<boolean[] | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || !titles.length) return null;
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 400,
      system: 'You group headlines for SLC Scoop. Decide which titles are news about Utah: the state, its cities, counties, agencies, teams, or people who live there. A national story that only ran on a Utah website is not Utah news. Reply with JSON only, {"keep":[0,2]}, listing the indexes to keep.',
      messages: [{ role: 'user', content: titles.map((title, index) => `${index}. ${title}`).join('\n') }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks.map((block: { text?: string }) => block.text || '').join('\n');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let keep: number[] = [];
  try { keep = (JSON.parse(match[0]) as { keep?: number[] }).keep || []; } catch { return null; }
  const chosen = new Set(keep.map((index) => Number(index)));
  return titles.map((_, index) => chosen.has(index));
}

/** GET /api/scoop/news?window=6h&recheck=1 → latest items and every source, including failures. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const window = windowOf(req.nextUrl.searchParams.get('window'));
  const recheck = req.nextUrl.searchParams.get('recheck') === '1';
  const now = new Date();
  if (!recheck && cached && cached.exp > Date.now()) {
    return NextResponse.json({
      items: narrow(cached.items, window, now),
      held: narrow(cached.held, window, now),
      sources: cached.sources,
      saved: true,
    });
  }
  let record: Record<string, unknown> | null = null;
  try { record = await readBrandRecord(); } catch { record = null; }
  const hadSources = Array.isArray(record?.newsSources);
  const sources = applySourceFixes(normalizeNewsSources(hadSources ? record?.newsSources : undefined));
  let result: { items: NewsItem[]; held: NewsItem[]; sources: NewsSource[] };
  try {
    result = await collectNews({ sources, now, window: '7d', recheck, fetchText, decideUtah });
  } catch {
    return NextResponse.json({ error: 'collector_failed' }, { status: 502 });
  }
  let saved = false;
  const changed = JSON.stringify(sources.map((source) => [source.status, source.checkedAt, source.newest, source.error]))
    !== JSON.stringify(result.sources.map((source) => [source.status, source.checkedAt, source.newest, source.error]));
  if (!hadSources || changed || recheck) {
    try {
      const base = record && typeof record === 'object' ? { ...record } : {};
      const outlets = Array.isArray(base.outlets) ? base.outlets.map((host) => String(host)) : [];
      for (const host of outletDomains(result.sources)) if (host && !outlets.includes(host)) outlets.push(host);
      await writeBrandRecord({ ...base, outlets, newsSources: result.sources });
      saved = true;
    } catch {
      saved = false;
    }
  } else saved = true;
  cached = { exp: Date.now() + CACHE_MS, sources: result.sources, items: result.items, held: result.held };
  return NextResponse.json({
    items: narrow(result.items, window, now),
    held: narrow(result.held, window, now),
    sources: result.sources,
    saved,
  });
}
