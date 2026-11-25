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
const LIST_MS = 6 * 60 * 60 * 1000;
const REFRESH_MS = 15 * 60 * 1000;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

type CacheRow = { exp: number; items: SearchHit[]; groups: SearchHit[][]; updatedAt: string };
const fresh = new Map<number, CacheRow>();
let budget = { day: '', count: 0, updatedAt: '', items: [] as SearchHit[] };

function denverDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function nextMidnight(now: Date): string {
  return new Date(denverMidnight(denverDay(now)).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function storyList(saved: Record<string, unknown>): { items: SearchHit[]; updatedAt: string; attemptedAt: string } | null {
  const by = saved.byHours && typeof saved.byHours === 'object' ? saved.byHours as Record<string, unknown> : {};
  const row = by['6'] && typeof by['6'] === 'object' ? by['6'] as Record<string, unknown> : null;
  const items = row && Array.isArray(row.items) ? row.items.filter((item): item is SearchHit => {
    if (!item || typeof item !== 'object') return false;
    const hit = item as SearchHit;
    return typeof hit.title === 'string' && typeof hit.url === 'string' && hit.title.length > 0 && hit.url.length > 0;
  }) : [];
  if (!items.length) return null;
  const updatedAt = typeof row?.updatedAt === 'string' ? row.updatedAt : '';
  const attemptedAt = typeof row?.attemptedAt === 'string' ? row.attemptedAt : updatedAt;
  return { items, updatedAt, attemptedAt };
}

function storyResponse(items: SearchHit[], times: { updatedAt: string; attemptedAt: string }, modelName: string, extra: Record<string, unknown> = {}) {
  const attempt = Date.parse(times.attemptedAt);
  const refreshAt = Number.isFinite(attempt) ? new Date(attempt + REFRESH_MS).toISOString() : null;
  return NextResponse.json({
    items,
    groups: groupStories(items),
    updatedAt: times.updatedAt || null,
    refreshAt,
    cached: true,
    limited: false,
    updatesAt: null,
    model: modelName,
    ...extra,
  });
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

/** GET /api/scoop/news-search — the saved 6-hour list. Never starts a search. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const record = await readBrandRecord();
    const saved = record?.newsSearch && typeof record.newsSearch === 'object' ? record.newsSearch as Record<string, unknown> : {};
    const stored = storyList(saved);
    if (stored) return storyResponse(stored.items, stored, 'haiku');
  } catch (err) {
    console.error('[scoop news-search] read failed', err);
  }
  const memory = fresh.get(6);
  if (memory?.items.length) return storyResponse(memory.items, { updatedAt: memory.updatedAt, attemptedAt: memory.updatedAt }, 'haiku');
  return NextResponse.json({ items: [], groups: [], updatedAt: null, refreshAt: null, cached: true, limited: false, updatesAt: null, model: 'haiku' });
}

/** POST /api/scoop/news-search — one web search, then a checked list. Feeds stay on the other route. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const hours = 6;
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
  const stored = storyList(saved);
  const updatedAge = stored ? Date.now() - Date.parse(stored.updatedAt) : Infinity;
  const attemptAge = stored ? Date.now() - Date.parse(stored.attemptedAt) : Infinity;
  if (stored && !refresh && updatedAge < LIST_MS) return storyResponse(stored.items, stored, modelName);
  if (stored && refresh && attemptAge < REFRESH_MS) return storyResponse(stored.items, stored, modelName);
  const cached = fresh.get(hours);
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
    'Run several short searches across the state, for example: "Utah news today", "Salt Lake City news today", "Utah police today", "Utah crash today", "Provo Orem news today", "Ogden news today", "Logan news today", "St. George news today", "Utah legislature today", "Utah courts today". Return up to 40 articles.',
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
    max_uses: 8,
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
    if (stored) return storyResponse(stored.items, stored, modelName);
    return NextResponse.json({ items: [], groups: [], updatedAt: null, refreshAt: null, cached: false, limited: false, updatesAt: null, model: modelName, reason: failure || 'The model answered without searching. Try again.' });
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
  const keep = items.length ? items : (stored?.items || []);
  const updatedAt = items.length ? now.toISOString() : (stored?.updatedAt || now.toISOString());
  const attemptedAt = now.toISOString();
  budget = { day, count: budget.count + 1, updatedAt, items: keep };
  if (keep.length) fresh.set(hours, { exp: Date.now() + LIST_MS, items: keep, groups: groupStories(keep), updatedAt });
  try {
    const base = record && typeof record === 'object' ? { ...record } : {};
    const previous = saved.byHours && typeof saved.byHours === 'object' ? saved.byHours as Record<string, unknown> : {};
    await writeBrandRecord({
      ...base,
      newsSearchDomains: domains,
      newsSearchModel: modelName,
      newsSearch: { day, count: budget.count, updatedAt, byHours: { ...previous, '6': { updatedAt, attemptedAt, items: keep } } },
    });
  } catch { /* the in-memory count still limits this process */ }
  return storyResponse(keep, { updatedAt, attemptedAt }, modelName, { cached: false });
}
