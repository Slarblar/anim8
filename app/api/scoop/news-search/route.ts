import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { readBrandRecord, writeBrandRecord } from '@/lib/scoop-brand';
import {
  acceptSearchItems,
  denverMidnight,
  emptySearchStats,
  groupStories,
  normalizeSearchDomains,
  UTAH_STORY_RULE,
  type SearchHit,
} from '@/lib/scoop-news';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Current model IDs. Override without a redeploy of code via SCOOP_NEWS_HAIKU / SCOOP_NEWS_SONNET.
const HAIKU = process.env.SCOOP_NEWS_HAIKU?.trim() || 'claude-haiku-5-5';
const SONNET = process.env.SCOOP_NEWS_SONNET?.trim() || 'claude-sonnet-5-5';
// Stay inside Vercel's 60s limit: a killed function returns a bare 504 and the page can't say why.
const DEADLINE_MS = 48_000;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CACHE_MS = 10 * 60 * 1000;

type CacheRow = { exp: number; items: SearchHit[]; groups: SearchHit[][]; updatedAt: string };
const fresh = new Map<number, CacheRow>();
let budget = { day: '', count: 0, updatedAt: '', items: [] as SearchHit[] };

function denverDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function nextMidnight(now: Date): string {
  return new Date(denverMidnight(denverDay(now)).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function hoursOf(value: unknown): 3 | 6 | 12 | 24 {
  const hours = Number(value);
  if (hours === 3 || hours === 6 || hours === 12 || hours === 24) return hours;
  return 6;
}

type SearchPage = { url: string; title: string; pageAge: string };

/** Every URL the search returned, plus the age and title each result showed. */
function resultUrls(content: unknown[], ages: Record<string, string> = {}, pages: SearchPage[] = []): string[] {
  const urls: string[] = [];
  const stack = [...content];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    const row = node as Record<string, unknown>;
    if ((row.type === 'web_search_result' || row.type === 'web_search_result_location') && typeof row.url === 'string') {
      urls.push(row.url);
      const pageAge = typeof row.page_age === 'string' ? row.page_age.trim() : '';
      if (pageAge) ages[row.url] = pageAge;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (row.type === 'web_search_result' && title) pages.push({ url: row.url, title, pageAge });
    }
    if (Array.isArray(row.content)) stack.push(...row.content);
    if (Array.isArray(row.citations)) stack.push(...row.citations);
  }
  return urls;
}

function textOf(content: unknown[]): string {
  return content.map((block) => {
    const row = block as { type?: string; text?: string };
    return row.type === 'text' ? String(row.text || '') : '';
  }).join('\n');
}

/** Turns an Anthropic error response into one line a person can act on. */
async function apiError(res: Response): Promise<string> {
  let type = '';
  let message = '';
  try {
    const body = await res.json();
    type = String(body?.error?.type || '');
    message = String(body?.error?.message || '');
  } catch { /* not JSON */ }
  const m = message.toLowerCase();
  if (res.status === 401) return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Vercel.';
  if (/web.?search/.test(m) && /enable|disabled|not allowed|permission/.test(m))
    return 'Web search is turned off for this Anthropic organization. An admin can turn it on in the Claude Console (Settings → Privacy / web search).';
  if (res.status === 403) return `The API key can't use this feature${message ? `: ${message}` : '.'}`;
  if (res.status === 404 || /model/.test(m) && /not.?found|does not exist|invalid/.test(m))
    return `The search model isn't available${message ? `: ${message}` : '.'} Set SCOOP_NEWS_HAIKU to a current model ID.`;
  if (/domain/.test(m)) return `A search site was rejected: ${message} Remove it in brand settings → Search sites.`;
  if (res.status === 429) return 'Search is busy or over the rate limit. Try again in a minute.';
  if (res.status === 529 || res.status >= 500) return 'Anthropic is overloaded right now. Try again shortly.';
  return `Search failed (HTTP ${res.status}${type ? `, ${type}` : ''})${message ? `: ${message}` : '.'}`;
}

function readJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** POST /api/scoop/news-search — one web search, then a checked list. Feeds stay on the other route. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const hours = hoursOf(body.hours);
  const refresh = body.refresh === true;
  const now = new Date();
  const day = denverDay(now);
  const key = process.env.ANTHROPIC_API_KEY?.trim();

  let record: Record<string, unknown> | null = null;
  try { record = await readBrandRecord(); } catch { record = null; }
  const saved = record?.newsSearch && typeof record.newsSearch === 'object' ? record.newsSearch as Record<string, unknown> : {};
  if (saved.day === day && Number(saved.count) > budget.count) budget = { ...budget, day, count: Number(saved.count) };
  if (budget.day !== day) budget = { day, count: 0, updatedAt: budget.updatedAt, items: budget.items };

  const domains = normalizeSearchDomains(record?.newsSearchDomains);
  const modelName = record?.newsSearchModel === 'sonnet' ? 'sonnet' : 'haiku';
  const model = modelName === 'sonnet' ? SONNET : HAIKU;
  const limit = Math.min(500, Math.max(1, Number(record?.newsSearchLimit) || Number(process.env.SCOOP_NEWS_SEARCH_DAILY) || 60));
  const cached = fresh.get(hours);
  if (!refresh && cached && cached.exp > Date.now()) {
    return NextResponse.json({ ...cached, cached: true, limited: false, updatesAt: null, model: modelName });
  }
  if (budget.count >= limit) {
    const stored = cached?.items?.length ? cached.items : budget.items;
    const groups = groupStories(stored);
    return NextResponse.json({
      items: stored,
      groups,
      updatedAt: cached?.updatedAt || budget.updatedAt || null,
      cached: true,
      limited: true,
      updatesAt: nextMidnight(now),
      model: modelName,
      reason: 'The daily search limit is used. This is the last list.',
    });
  }
  if (!key) {
    return NextResponse.json({ items: [], groups: [], updatedAt: null, cached: false, limited: false, updatesAt: null, model: modelName, reason: 'Search is not configured.' });
  }

  const prompt = [
    `Current time: ${now.toISOString()} (America/Denver).`,
    `Find Utah news articles published in the last ${hours} hours. Call the web_search tool before you answer. Do not answer from memory.`,
    `Today's date in Utah is ${new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}. Put that date, or "today", in the search queries.`,
    'Run several short searches, for example: "Utah news today", "Salt Lake City news today", "Utah police today", "Utah crash today", "Provo news today", "St. George news today". Return up to 25 articles.',
    'Skip homepages, section pages, and any result whose shown age is older than the window.',
    UTAH_STORY_RULE,
    'After the search, return JSON only, an array of objects with title, url, outlet, published, summary, location, and category.',
    'location is a Utah city, a Utah county, or Statewide.',
    'published: copy the date or age shown with the search result (for example "3 hours ago", "November 14, 2026", or an ISO time). If none is shown, set published to null. Never guess a time.',
    'summary is one sentence. Every url must be a URL that the web search returned.',
  ].join(' ');
  const tool = {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: 5,
    allowed_domains: domains,
    user_location: { type: 'approximate', city: 'Salt Lake City', region: 'Utah', country: 'US', timezone: 'America/Denver' },
  };
  let messages: unknown[] = [{ role: 'user', content: prompt }];
  const urls: string[] = [];
  const ages: Record<string, string> = {};
  const pages: SearchPage[] = [];
  let text = '';
  let ran = false;
  let searches = 0;
  let failure = '';
  const started = Date.now();
  try {
    for (let turn = 0; turn < 3; turn += 1) {
      const left = DEADLINE_MS - (Date.now() - started);
      if (left < 8_000) { if (!text.includes('[')) failure = 'Search ran out of time. Try a shorter window or Haiku.'; break; }
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(left),
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system: 'You search local Utah news for SLC Scoop. Call the web_search tool before you answer. After the results come back, reply with the JSON array and nothing else.',
          tools: [tool],
          messages,
        }),
      });
      if (!res.ok) {
        failure = await apiError(res);
        console.error('[scoop news-search] Anthropic error', res.status, model, failure);
        break;
      }
      ran = true;
      const data = await res.json();
      const content = Array.isArray(data?.content) ? data.content as unknown[] : [];
      searches += Number(data?.usage?.server_tool_use?.web_search_requests) || 0;
      urls.push(...resultUrls(content, ages, pages));
      if (!searches && urls.length) searches = urls.length;
      text += `\n${textOf(content)}`;
      if (data?.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content }];
    }
  } catch (err) {
    ran = !!text;
    const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    failure = timeout ? 'Search took too long. Try again, or switch the search model to Haiku.' : `Search failed: ${err instanceof Error ? err.message : 'network error'}`;
    console.error('[scoop news-search] request failed', err);
  }
  if (!ran || (searches < 1 && !text.includes('['))) {
    return NextResponse.json({ items: [], groups: [], updatedAt: null, cached: false, limited: false, updatesAt: null, model: modelName, searched: searches > 0, reason: failure || 'The model answered without searching. Try again.' });
  }

  let parsed: unknown = [];
  try { parsed = readJson(text); } catch { parsed = []; }
  const stats = emptySearchStats();
  const told = Array.isArray(parsed) ? parsed : [];
  const rows = told.concat(pages.map((page) => ({
    title: page.title,
    url: page.url,
    outlet: '',
    published: page.pageAge || null,
    summary: page.title,
    location: '',
    category: '',
  })));
  const items = acceptSearchItems(rows, urls, hours, now, { ages, stats });
  const found = { searches, links: new Set(urls).size, ...stats };
  console.log('[scoop news-search]', JSON.stringify(found));
  const groups = groupStories(items);
  const updatedAt = now.toISOString();
  budget = { day, count: budget.count + 1, updatedAt, items: items.length ? items : budget.items };
  if (items.length) fresh.set(hours, { exp: Date.now() + CACHE_MS, items, groups, updatedAt });
  try {
    const base = record && typeof record === 'object' ? { ...record } : {};
    const previous = saved.byHours && typeof saved.byHours === 'object' ? saved.byHours as Record<string, unknown> : {};
    await writeBrandRecord({
      ...base,
      newsSearchDomains: domains,
      newsSearchModel: modelName,
      newsSearch: { day, count: budget.count, updatedAt, byHours: { ...previous, [String(hours)]: { updatedAt, items } } },
    });
  } catch { /* the in-memory count still limits this process */ }
  return NextResponse.json({
    items, groups, updatedAt, cached: false, limited: false, updatesAt: null, model: modelName, found,
    reason: items.length ? undefined : explainEmpty(found, hours),
  });
}

function explainEmpty(f: { searches: number; links: number; returned: number; noDate: number; tooOld: number; notUtah: number; notInResults: number }, hours: number): string {
  if (!f.links) return 'Claude searched but the search sites returned nothing. Check the Search sites list in Settings.';
  const parts = [
    f.tooOld && `${f.tooOld} older than ${hours}h`,
    f.noDate && `${f.noDate} with no date`,
    f.notUtah && `${f.notUtah} not Utah stories`,
    f.notInResults && `${f.notInResults} with unverified links`,
  ].filter(Boolean);
  return `Claude found ${f.links} links in ${f.searches} search${f.searches === 1 ? '' : 'es'}, but none passed: ${parts.join(', ') || 'no stories were returned'}. Try 24h.`;
}
