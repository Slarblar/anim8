import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { readBrandRecord, writeBrandRecord } from '@/lib/scoop-brand';
import { fetchPublicBody } from '@/lib/scoop-read';
import {
  applySourceFixes,
  collectNews,
  groupStories,
  normalizeNewsSources,
  outletDomains,
  passesWindow,
  type FetchText,
  type NewsItem,
  type NewsWindow,
} from '@/lib/scoop-news';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FEED_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'application/rss+xml, application/xml, text/xml, */*',
  'accept-language': 'en-US',
};

const CACHE_MS = 3 * 60 * 1000;

type Cached = { exp: number; items: NewsItem[]; held: NewsItem[]; sources: Awaited<ReturnType<typeof collectNews>>['reports']; records: Awaited<ReturnType<typeof collectNews>>['sources'] };
let cached: Cached | null = null;

function windowOf(value: string | null): NewsWindow {
  if (value === '3h' || value === '6h' || value === '12h' || value === '24h' || value === '7d') return value;
  return '6h';
}

const fetchText: FetchText = async (url, headers) => {
  try {
    const result = await fetchPublicBody(url, { headers: { ...FEED_HEADERS, ...headers }, timeoutMs: 8_000, includeStatus: true });
    if ('error' in result) {
      const status = result.status;
      const timeout = /took too long/i.test(result.reason || '');
      return {
        ok: false,
        error: result.reason || 'The source could not be read.',
        httpStatus: status,
        challenge: result.challenge,
        timeout,
        blocked: !!result.challenge || status === 403 || status === 429,
      };
    }
    return { ok: true, text: result.text, status: result.status };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { ok: false, error: timeout ? 'The source took too long to load.' : 'The source could not be read.', timeout };
  }
};

function empty(reason = '') {
  return { groups: [], sources: [], items: [], held: [], saved: false, reason };
}

/** GET /api/scoop/news — each source fails on its own. The route still returns whatever loaded. */
export async function GET(req: NextRequest) {
  try {
    return await loadFeeds(req);
  } catch (err) {
    console.error('[scoop news]', err);
    return NextResponse.json(empty());
  }
}

async function loadFeeds(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const window = windowOf(req.nextUrl.searchParams.get('window'));
  const recheck = req.nextUrl.searchParams.get('recheck') === '1';
  const now = new Date();
  const narrow = (items: NewsItem[]) => items.filter((item) => passesWindow(item, window, now));
  try {
    if (!recheck && cached && cached.exp > Date.now()) {
      const items = narrow(cached.items);
      const sources = cached.sources.map((source) => ({ ...source, items: narrow(source.items) }));
      return NextResponse.json({ groups: groupStories(items), sources, records: cached.records, items, held: narrow(cached.held), saved: true, cached: true });
    }
    let record: Record<string, unknown> | null = null;
    try { record = await readBrandRecord(); } catch { record = null; }
    const hadSources = Array.isArray(record?.newsSources);
    const sources = applySourceFixes(normalizeNewsSources(hadSources ? record?.newsSources : undefined));
    const result = await collectNews({ sources, window: '24h', recheck, fetchText });
    let saved = false;
    try {
      const base = record && typeof record === 'object' ? { ...record } : {};
      const outlets = Array.isArray(base.outlets) ? base.outlets.map((host) => String(host)) : [];
      for (const host of outletDomains(result.sources)) if (host && !outlets.includes(host)) outlets.push(host);
      await writeBrandRecord({ ...base, outlets, newsSources: result.sources });
      saved = true;
    } catch { saved = false; }
    cached = { exp: Date.now() + CACHE_MS, items: result.items, held: result.held, sources: result.reports, records: result.sources };
    const items = narrow(result.items);
    const reports = result.reports.map((source) => ({ ...source, items: narrow(source.items) }));
    return NextResponse.json({ groups: groupStories(items), sources: reports, records: result.sources, items, held: narrow(result.held), saved });
  } catch {
    return NextResponse.json(empty('The feed check could not finish.'));
  }
}
