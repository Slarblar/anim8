import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { readBrandRecord, writeBrandRecord } from '@/lib/scoop-brand';
import {
  acceptSearchItems,
  denverMidnight,
  groupStories,
  normalizeSearchDomains,
  UTAH_STORY_RULE,
  type SearchHit,
} from '@/lib/scoop-news';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-5';
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

function resultUrls(content: unknown[]): string[] {
  const urls: string[] = [];
  const stack = [...content];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    const row = node as Record<string, unknown>;
    if (row.type === 'web_search_result' && typeof row.url === 'string') urls.push(row.url);
    if (Array.isArray(row.content)) stack.push(...row.content);
  }
  return urls;
}

function textOf(content: unknown[]): string {
  return content.map((block) => {
    const row = block as { type?: string; text?: string };
    return row.type === 'text' ? String(row.text || '') : '';
  }).join('\n');
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
    `Find news published in the last ${hours} hours.`,
    UTAH_STORY_RULE,
    'Return JSON only, an array of objects with title, url, outlet, published, summary, location, and category.',
    'location is a Utah city, a Utah county, or Statewide.',
    'published is an ISO-8601 time read from the article page. If the page does not show a time, set published to null.',
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
  let text = '';
  let ran = false;
  try {
    for (let turn = 0; turn < 3; turn += 1) {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: 1600,
          system: `${UTAH_STORY_RULE} Reply with the JSON array and nothing else.`,
          tools: [tool],
          messages,
        }),
      });
      if (!res.ok) break;
      ran = true;
      const data = await res.json();
      const content = Array.isArray(data?.content) ? data.content as unknown[] : [];
      urls.push(...resultUrls(content));
      text += `\n${textOf(content)}`;
      if (data?.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content }];
    }
  } catch {
    ran = false;
  }
  if (!ran) {
    return NextResponse.json({ items: [], groups: [], updatedAt: null, cached: false, limited: false, updatesAt: null, model: modelName, reason: 'Search could not run.' });
  }

  let parsed: unknown = [];
  try { parsed = readJson(text); } catch { parsed = []; }
  const items = acceptSearchItems(parsed, urls, hours, now);
  const groups = groupStories(items);
  const updatedAt = now.toISOString();
  budget = { day, count: budget.count + 1, updatedAt, items: items.length ? items : budget.items };
  fresh.set(hours, { exp: Date.now() + CACHE_MS, items, groups, updatedAt });
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
  return NextResponse.json({ items, groups, updatedAt, cached: false, limited: false, updatesAt: null, model: modelName });
}
