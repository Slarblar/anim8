import { JSDOM } from 'jsdom';

export type NewsSourceType = 'rss' | 'newsmap' | 'page' | 'nws' | 'api';
export type NewsWindow = '3h' | '6h' | '24h' | '7d';

export type NewsSource = {
  id: string;
  name: string;
  type: NewsSourceType;
  url: string;
  kind: 'outlet' | 'agency';
  note?: string;
  enabled: boolean;
  /** National wire mixed into a local feed. Borderline items go to the grouping call. */
  utahFilter?: boolean;
  selector?: string;
  timeSelector?: string;
  status?: 'ok' | 'failed';
  checkedAt?: string;
  newest?: string;
  error?: string;
};

export type NewsItem = {
  id: string;
  sourceId: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  dateOnly: boolean;
  utah: 'yes' | 'unconfirmed';
};

export type Dated = { at: Date; dateOnly: boolean };

const WINDOW_MS: Record<NewsWindow, number> = {
  '3h': 3 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/** Places and agencies that mark a story as Utah news. Bare words like "price" are left out. */
const UTAH = [
  /\butah\b/i,
  /\bsalt[\s-]?lake\b/i,
  /\bslc\b/i,
  /\bprovo\b/i,
  /\bogden\b/i,
  /\borem\b/i,
  /\blayton\b/i,
  /\bst\.?\s*george\b/i,
  /\bsaint george\b/i,
  /\bmoab\b/i,
  /\blogan\b/i,
  /\bpark city\b/i,
  /\bbountiful\b/i,
  /\bdraper\b/i,
  /\bsandy\b/i,
  /\bmurray\b/i,
  /\btaylorsville\b/i,
  /\bwest valley\b/i,
  /\bwest jordan\b/i,
  /\bsouth jordan\b/i,
  /\briverton\b/i,
  /\bherriman\b/i,
  /\bmillcreek\b/i,
  /\bmidvale\b/i,
  /\bcottonwood heights\b/i,
  /\bkearns\b/i,
  /\bmagna\b/i,
  /\bclearfield\b/i,
  /\bkaysville\b/i,
  /\bfarmington\b/i,
  /\bsyracuse\b/i,
  /\btooele\b/i,
  /\blehi\b/i,
  /\bamerican fork\b/i,
  /\bpleasant grove\b/i,
  /\bspanish fork\b/i,
  /\bspringville\b/i,
  /\bpayson\b/i,
  /\bheber\b/i,
  /\bvernal\b/i,
  /\broosevelt\b/i,
  /\bcedar city\b/i,
  /\bbrigham city\b/i,
  /\bdavis county\b/i,
  /\butah county\b/i,
  /\bweber county\b/i,
  /\bcache county\b/i,
  /\bsummit county\b/i,
  /\bwasatch county\b/i,
  /\bsalt lake county\b/i,
  /\bwashington county\b/i,
  /\budot\b/i,
  /\buhp\b/i,
  /\bUTA\b/,
  /\bslcpd\b/i,
  /\btrax\b/i,
  /\bfrontrunner\b/i,
];

const KUTV_PAGE = 'https://kutv.com/news/local';

/**
 * Latest local news. Optional regional outlets stay off until someone enables them.
 * KUTV's robots.txt lists no sitemap, so that source reads the local news page.
 */
export const NEWS_SEED: NewsSource[] = [
  { id: 'ksl', name: 'KSL.com', type: 'newsmap', url: 'https://www.ksl.com/google-news-sitemap.xml', kind: 'outlet', utahFilter: true, enabled: true, note: 'Verified. Includes national and sports; Utah check applies.' },
  { id: 'kutv', name: 'KUTV 2News', type: 'page', url: KUTV_PAGE, kind: 'outlet', enabled: true, selector: 'a[href*="/news/local/"]', timeSelector: 'time', note: 'robots.txt lists no news sitemap. Article links and timestamps are read from the local page.' },
  { id: 'fox13', name: 'FOX 13 News Utah', type: 'rss', url: 'https://www.fox13now.com/index.rss', kind: 'outlet', enabled: true, note: 'Listed by a feed directory. Check on first run.' },
  { id: 'sltrib', name: 'The Salt Lake Tribune', type: 'rss', url: 'https://www.sltrib.com/arc/outboundfeeds/rss/?outputType=xml', kind: 'outlet', enabled: true, note: 'The RSS page links here. The older arcio address was not found. Often paywalled; use the headline and summary.' },
  { id: 'deseret', name: 'Deseret News', type: 'rss', url: 'https://www.deseret.com/arc/outboundfeeds/rss/', kind: 'outlet', utahFilter: true, enabled: true, note: 'The index.xml address was not found. This Arc feed is live. Includes national wire; Utah check applies.' },
  { id: 'abc4', name: 'ABC4 Utah', type: 'rss', url: 'https://www.abc4.com/feed/', kind: 'outlet', enabled: true, note: 'Listed by a feed directory. Check on first run.' },
  { id: 'kslnewsradio', name: 'KSL NewsRadio', type: 'rss', url: 'https://kslnewsradio.com/feed/', kind: 'outlet', enabled: true, note: 'Check on first run.' },
  { id: 'kuer', name: 'KUER', type: 'newsmap', url: 'https://www.kuer.org/news-sitemap-content.xml', kind: 'outlet', enabled: true, note: 'Public radio. Check on first run.' },
  { id: 'utahnewsdispatch', name: 'Utah News Dispatch', type: 'rss', url: 'https://utahnewsdispatch.com/feed/', kind: 'outlet', enabled: true, note: 'Nonprofit statehouse and policy coverage. Check on first run.' },
  { id: 'slcpd', name: 'Salt Lake City Police', type: 'rss', url: 'https://police.slc.gov/category/newsroom/press-release/feed/', kind: 'agency', enabled: true, note: 'WordPress press-release category. If it fails, use the press-release page.' },
  { id: 'nws-utah', name: 'National Weather Service (Utah alerts)', type: 'nws', url: 'https://api.weather.gov/alerts/active?area=UT', kind: 'agency', enabled: true, note: 'Requests send a User-Agent with a contact address.' },
  { id: 'udot', name: 'UDOT Traffic events', type: 'api', url: 'https://udottraffic.utah.gov/developers/doc', kind: 'agency', enabled: true, note: 'Needs a free developer key. Only closures and major incidents are kept.' },
  { id: 'utcourts', name: 'Utah State Courts', type: 'rss', url: 'https://legacy.utcourts.gov/utc/news/feed/', kind: 'agency', enabled: true, note: 'News releases and media advisories, from the courts RSS page.' },
  { id: 'parkrecord', name: 'Park Record', type: 'rss', url: 'https://www.parkrecord.com/feed/', kind: 'outlet', enabled: false },
  { id: 'townlift', name: 'TownLift (Park City)', type: 'rss', url: 'https://townlift.com/feed/', kind: 'outlet', enabled: false },
  { id: 'upr', name: 'Utah Public Radio', type: 'rss', url: 'https://www.upr.org/news.rss', kind: 'outlet', enabled: false },
  { id: 'cityweekly', name: 'Salt Lake City Weekly', type: 'rss', url: 'https://www.cityweekly.net/utah/Rss.xml', kind: 'outlet', enabled: false },
];

export function newsSitemapFromRobots(text: string): string | null {
  const maps = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, '').trim())
    .filter((url) => /^https?:\/\//i.test(url));
  return maps.find((url) => /news/i.test(url)) || null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const REPLACED_URLS: Record<string, string> = {
  'https://www.sltrib.com/arcio/rss/?summary=true': 'https://www.sltrib.com/arc/outboundfeeds/rss/?outputType=xml',
  'https://www.deseret.com/rss/index.xml': 'https://www.deseret.com/arc/outboundfeeds/rss/',
};

/** Point a saved source at a publisher feed that replaced a dead address, and check it again. */
export function applySourceFixes(sources: NewsSource[]): NewsSource[] {
  return sources.map((source) => {
    const url = REPLACED_URLS[source.url];
    if (!url) return source;
    const seed = NEWS_SEED.find((item) => item.id === source.id);
    return { ...source, url, note: seed?.note || source.note, status: undefined, checkedAt: undefined, newest: undefined, error: undefined };
  });
}

export function normalizeNewsSources(raw: unknown): NewsSource[] {
  if (!Array.isArray(raw)) return NEWS_SEED.map((source) => ({ ...source }));
  if (!raw.length) return [];
  const out: NewsSource[] = [];
  for (const item of raw) {
    const row = asObject(item);
    const id = String(row.id ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    const name = String(row.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const type = String(row.type ?? '');
    const url = String(row.url ?? '').trim().slice(0, 500);
    const kind = row.kind === 'agency' ? 'agency' : row.kind === 'outlet' ? 'outlet' : '';
    if (!id || !name || !kind || !/^https?:\/\//i.test(url)) continue;
    if (type !== 'rss' && type !== 'newsmap' && type !== 'page' && type !== 'nws' && type !== 'api') continue;
    if (out.some((source) => source.id === id)) continue;
    const status = row.status === 'ok' || row.status === 'failed' ? row.status : undefined;
    out.push({
      id,
      name,
      type,
      url,
      kind,
      note: String(row.note ?? '').replace(/\s+/g, ' ').trim().slice(0, 280) || undefined,
      enabled: row.enabled !== false,
      utahFilter: row.utahFilter === true,
      selector: String(row.selector ?? '').trim().slice(0, 160) || undefined,
      timeSelector: String(row.timeSelector ?? '').trim().slice(0, 80) || undefined,
      status,
      checkedAt: typeof row.checkedAt === 'string' ? row.checkedAt.slice(0, 40) : undefined,
      newest: typeof row.newest === 'string' ? row.newest.slice(0, 40) : undefined,
      error: status === 'failed' ? String(row.error ?? 'This source could not be read.').replace(/\s+/g, ' ').trim().slice(0, 240) : undefined,
    });
    if (out.length >= 40) break;
  }
  return out;
}

export function sourceHost(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, ''); }
  catch { return ''; }
}

export function outletDomains(sources: NewsSource[]): string[] {
  const out: string[] = [];
  for (const source of sources) {
    if (source.kind !== 'outlet') continue;
    const host = sourceHost(source.url);
    if (host && !out.includes(host)) out.push(host);
  }
  return out;
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
  return asUTC - date.getTime();
}

/** Midnight in America/Denver for a calendar date, including the daylight-saving offset. */
export function denverMidnight(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return new Date(NaN);
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const first = new Date(utc - timeZoneOffset(new Date(utc), 'America/Denver'));
  return new Date(utc - timeZoneOffset(first, 'America/Denver'));
}

/** A date with no clock is midnight America/Denver and is marked date-only. */
export function parseWhen(value: string): Dated | null {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const at = denverMidnight(raw);
    return Number.isNaN(at.getTime()) ? null : { at, dateOnly: true };
  }
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return null;
  return { at, dateOnly: false };
}

export function passesWindow(item: { publishedAt: string; dateOnly: boolean }, window: NewsWindow, now: Date): boolean {
  if ((window === '3h' || window === '6h') && item.dateOnly) return false;
  const at = Date.parse(item.publishedAt);
  if (!Number.isFinite(at)) return false;
  const age = now.getTime() - at;
  return age >= -5 * 60 * 1000 && age <= WINDOW_MS[window];
}

export function mentionsUtah(title: string, summary: string, url: string): boolean {
  const hay = `${title}\n${summary}\n${decodeURIComponent(url)}`;
  return UTAH.some((pattern) => pattern.test(hay));
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, entity) => {
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
      if (entity[0] === '#') {
        const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : all;
      }
      return all;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  return [...xml.matchAll(re)].map((match) => match[1]);
}

function field(block: string, names: string[]): string {
  for (const name of names) {
    const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i');
    const match = re.exec(block);
    if (match) return decodeXml(match[1]).slice(0, 600);
  }
  return '';
}

function attr(block: string, tag: string, name: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'i');
  return re.exec(block)?.[1] || '';
}

type RawItem = { title: string; url: string; summary: string; publishedAt: string; dateOnly: boolean };

function rawFrom(title: string, url: string, summary: string, when: string): RawItem | null {
  const dated = parseWhen(when);
  const cleanTitle = title.replace(/\s+/g, ' ').trim().slice(0, 240);
  const href = url.trim();
  if (!cleanTitle || !/^https?:\/\//i.test(href) || !dated) return null;
  return {
    title: cleanTitle,
    url: href,
    summary: summary.replace(/\s+/g, ' ').trim().slice(0, 500),
    publishedAt: dated.at.toISOString(),
    dateOnly: dated.dateOnly,
  };
}

export function parseFeed(xml: string): RawItem[] {
  const chunks = blocks(xml, 'item').concat(blocks(xml, 'entry'));
  const out: RawItem[] = [];
  for (const chunk of chunks) {
    const link = field(chunk, ['link', 'guid']) || attr(chunk, 'link', 'href');
    const item = rawFrom(
      field(chunk, ['title']),
      link,
      field(chunk, ['description', 'summary', 'content']),
      field(chunk, ['pubDate', 'published', 'updated', 'dc:date', 'date']),
    );
    if (item) out.push(item);
  }
  return out;
}

/** Google News sitemap: url, news:title, news:publication_date. */
export function parseNewsSitemap(xml: string): RawItem[] {
  const out: RawItem[] = [];
  for (const chunk of blocks(xml, 'url')) {
    const item = rawFrom(
      field(chunk, ['news:title', 'title']),
      field(chunk, ['loc']),
      '',
      field(chunk, ['news:publication_date', 'lastmod']),
    );
    if (item) out.push(item);
  }
  return out;
}

function jsonLdArticles(html: string): RawItem[] {
  const out: RawItem[] = [];
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try { data = JSON.parse(match[1]); } catch { continue; }
    const stack = Array.isArray(data) ? data.slice() : [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      const row = node as Record<string, unknown>;
      if (Array.isArray(row['@graph'])) stack.push(...row['@graph']);
      if (row.item) stack.push(row.item);
      if (Array.isArray(row.itemListElement)) stack.push(...row.itemListElement);
      const type = row['@type'];
      const types = (Array.isArray(type) ? type : [type]).map((item) => String(item || ''));
      if (!types.some((item) => /NewsArticle|Article/i.test(item))) continue;
      const item = rawFrom(
        String(row.headline || row.name || ''),
        String(row.url || ''),
        String(row.description || ''),
        String(row.datePublished || row.dateModified || ''),
      );
      if (item) out.push(item);
    }
  }
  return out;
}

export function parsePage(html: string, pageUrl: string, selector?: string, timeSelector?: string): RawItem[] {
  const out: RawItem[] = [];
  if (selector) {
    const dom = new JSDOM(html, { url: pageUrl });
    const doc = dom.window.document;
    for (const el of doc.querySelectorAll(selector)) {
      const href = el.getAttribute('href') || '';
      let url = '';
      try { url = new URL(href, pageUrl).href; } catch { continue; }
      const root = el.closest('article, li') || el.parentElement;
      const time = timeSelector ? root?.querySelector(timeSelector) : root?.querySelector('time');
      const when = time?.getAttribute('datetime') || time?.textContent || '';
      const item = rawFrom((el.textContent || '').trim(), url, '', when);
      if (item) out.push(item);
    }
  }
  for (const item of jsonLdArticles(html)) {
    if (!out.some((have) => have.url === item.url)) out.push(item);
  }
  return out;
}

export function parseNws(body: string): RawItem[] {
  let data: { features?: { properties?: Record<string, unknown>; id?: string }[] };
  try { data = JSON.parse(body); } catch { return []; }
  const out: RawItem[] = [];
  for (const feature of data.features || []) {
    const props = feature.properties || {};
    const id = String(feature.id || props.id || '');
    const url = id.startsWith('http') ? id : id ? `https://api.weather.gov/alerts/${id}` : '';
    const item = rawFrom(
      String(props.headline || props.event || ''),
      url,
      String(props.description || props.areaDesc || ''),
      String(props.sent || props.effective || props.onset || ''),
    );
    if (item) out.push(item);
  }
  return out;
}

function newestOf(items: RawItem[]): string {
  return items.reduce((best, item) => (item.publishedAt > best ? item.publishedAt : best), '');
}

export function judgeSource(items: RawItem[], now: Date, fetchError?: string, newestOverride?: string): Pick<NewsSource, 'status' | 'checkedAt' | 'newest' | 'error'> {
  const checkedAt = now.toISOString();
  if (fetchError) return { status: 'failed', checkedAt, error: fetchError };
  const newest = newestOf(items) || newestOverride || '';
  if (!newest) return { status: 'failed', checkedAt, error: 'The source parsed, but it had no dated items.' };
  const age = now.getTime() - Date.parse(newest);
  if (age > FRESH_MS) return { status: 'failed', checkedAt, newest, error: 'The newest item is older than 7 days.' };
  return { status: 'ok', checkedAt, newest, error: undefined };
}

export type FetchText = (url: string, headers?: Record<string, string>) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;

const NWS_UA = 'SLCScoopPostStudio/1.0 (+https://slcscoop.com)';

async function readSource(source: NewsSource, fetchText: FetchText): Promise<{ items: RawItem[]; error?: string; newest?: string }> {
  if (source.type === 'api') {
    if (!process.env.UDOT_API_KEY?.trim()) {
      return { items: [], error: 'Needs a UDOT developer key in UDOT_API_KEY. Closures and major incidents are the only events this source keeps.' };
    }
    return { items: [], error: 'The UDOT events endpoint is not configured yet. The source stays listed until a key and the events URL are both set.' };
  }
  const headers = source.type === 'nws' ? { 'user-agent': NWS_UA, accept: 'application/geo+json, application/json' } : undefined;
  const fetched = await fetchText(source.url, headers);
  if (!fetched.ok) return { items: [], error: fetched.error };
  if ((source.type === 'rss' || source.type === 'newsmap') && /^\s*(?:<!doctype html|<html)\b/i.test(fetched.text)) {
    return { items: [], error: 'The address returned a web page, not a feed.' };
  }
  if (source.type === 'newsmap') return { items: parseNewsSitemap(fetched.text) };
  if (source.type === 'nws') {
    const items = parseNws(fetched.text);
    if (items.length) return { items };
    try {
      const data = JSON.parse(fetched.text) as { type?: string; features?: unknown; updated?: string };
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        const updated = parseWhen(String(data.updated || ''));
        if (updated) return { items, newest: updated.at.toISOString() };
      }
    } catch { /* the dated-item check reports the parse failure */ }
    return { items };
  }
  if (source.type === 'page') return { items: parsePage(fetched.text, source.url, source.selector, source.timeSelector) };
  return { items: parseFeed(fetched.text) };
}

export async function collectNews(input: {
  sources: NewsSource[];
  now?: Date;
  window?: NewsWindow;
  recheck?: boolean;
  fetchText: FetchText;
  decideUtah?: (titles: string[]) => Promise<boolean[] | null>;
}): Promise<{ items: NewsItem[]; held: NewsItem[]; sources: NewsSource[] }> {
  const now = input.now || new Date();
  const window = input.window || '6h';
  const sources = input.sources.map((source) => ({ ...source }));
  const parsed = new Map<string, RawItem[]>();
  const pending = sources.filter((source) => {
    const needsCheck = input.recheck || !source.status;
    return needsCheck || (source.enabled && source.status === 'ok');
  });
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (cursor < pending.length) {
      const source = pending[cursor];
      cursor += 1;
      const needsCheck = input.recheck || !source.status;
      const result = await readSource(source, input.fetchText);
      if (needsCheck) Object.assign(source, judgeSource(result.items, now, result.error, result.newest));
      if (source.enabled && source.status === 'ok') parsed.set(source.id, result.items);
    }
  }));
  const kept: NewsItem[] = [];
  const borderline: NewsItem[] = [];
  for (const source of sources) {
    if (!source.enabled || source.status !== 'ok') continue;
    for (const raw of parsed.get(source.id) || []) {
      const item: NewsItem = {
        id: `${source.id}:${raw.url}`,
        sourceId: source.id,
        source: source.name,
        title: raw.title,
        url: raw.url,
        summary: raw.summary,
        publishedAt: raw.publishedAt,
        dateOnly: raw.dateOnly,
        utah: 'yes',
      };
      if (source.utahFilter && !mentionsUtah(raw.title, raw.summary, raw.url)) borderline.push(item);
      else kept.push(item);
    }
  }
  const held: NewsItem[] = [];
  if (borderline.length && input.decideUtah) {
    const titles = borderline.map((item) => item.title).slice(0, 40);
    let decision: boolean[] | null = null;
    try { decision = await input.decideUtah(titles); } catch { decision = null; }
    if (!decision || decision.length < titles.length) {
      held.push(...borderline.map((item) => ({ ...item, utah: 'unconfirmed' as const })));
    } else {
      borderline.forEach((item, index) => {
        if (index >= titles.length) held.push({ ...item, utah: 'unconfirmed' });
        else if (decision?.[index]) kept.push(item);
      });
    }
  } else if (borderline.length) {
    held.push(...borderline.map((item) => ({ ...item, utah: 'unconfirmed' as const })));
  }
  const fresh = (item: NewsItem) => passesWindow(item, window, now);
  const byTime = (a: NewsItem, b: NewsItem) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  return {
    items: kept.filter(fresh).sort(byTime).slice(0, 80),
    held: held.filter(fresh).sort(byTime).slice(0, 40),
    sources,
  };
}
