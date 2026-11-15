import { JSDOM } from 'jsdom';

export type NewsSourceType = 'rss' | 'newsmap' | 'page' | 'nws' | 'api';
export type NewsWindow = '3h' | '6h' | '12h' | '24h' | '7d';

export type NewsSource = {
  id: string;
  name: string;
  type: NewsSourceType;
  url: string;
  kind: 'outlet' | 'agency';
  note?: string;
  enabled: boolean;
  /** National wire mixed into a local feed. Every item still has to be a Utah story. */
  utahFilter?: boolean;
  selector?: string;
  timeSelector?: string;
  status?: 'ok' | 'failed';
  checkedAt?: string;
  newest?: string;
  error?: string;
  reason?: string;
  httpStatus?: number | null;
  /** Consecutive blocked responses. Three disables the source until someone checks again. */
  failures?: number;
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
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Include a story only if the event happens in Utah, or it is an action or decision by Utah state or local
 * government, courts, schools, or agencies. Exclude: national and international news, stories from other states
 * even when a Utahn is involved, national stories with a Utah reaction angle, and sports events played outside
 * Utah. Utah teams count only for news that happens in Utah (home games, team business, venues).
 * If you are not sure the story is a Utah story, leave it out.
 */
export const UTAH_STORY_RULE = 'Include a story only if the event happens in Utah, or it is an action or decision by Utah state or local government, courts, schools, or agencies. Exclude: national and international news, stories from other states even when a Utahn is involved, national stories with a Utah reaction angle, and sports events played outside Utah. Utah teams count only for news that happens in Utah (home games, team business, venues). If you are not sure the story is a Utah story, leave it out.';

type GazetteerKind = 'city' | 'county' | 'agency' | 'school';
type GazetteerPlace = { name: string; pattern: RegExp; kind: GazetteerKind; ambiguous?: boolean };

/**
 * Cities, counties, agencies, and schools. A team name is not a place, and a Utahn somewhere else is not a Utah story.
 * Ambiguous names also need "Utah", "UT", or a Utah outlet.
 */
const GAZETTEER: GazetteerPlace[] = [
  { name: 'Salt Lake County', pattern: /\bsalt[\s-]?lake county\b/i, kind: 'county' },
  { name: 'Salt Lake City', pattern: /\bsalt[\s-]?lake(?:\s+city)?\b|\bslc\b/i, kind: 'city' },
  { name: 'Utah County', pattern: /\butah county\b/i, kind: 'county' },
  { name: 'Davis County', pattern: /\bdavis county\b/i, kind: 'county' },
  { name: 'Weber County', pattern: /\bweber county\b/i, kind: 'county' },
  { name: 'Cache County', pattern: /\bcache county\b/i, kind: 'county' },
  { name: 'Summit County', pattern: /\bsummit county\b/i, kind: 'county' },
  { name: 'Wasatch County', pattern: /\bwasatch county\b/i, kind: 'county' },
  { name: 'Washington County', pattern: /\bwashington county\b/i, kind: 'county', ambiguous: true },
  { name: 'Tooele County', pattern: /\btooele county\b/i, kind: 'county' },
  { name: 'Iron County', pattern: /\biron county\b/i, kind: 'county' },
  { name: 'Box Elder County', pattern: /\bbox elder county\b/i, kind: 'county' },
  { name: 'Provo', pattern: /\bprovo\b/i, kind: 'city' },
  { name: 'Orem', pattern: /\borem\b/i, kind: 'city' },
  { name: 'St. George', pattern: /\bst\.?\s*george\b|\bsaint george\b/i, kind: 'city' },
  { name: 'Moab', pattern: /\bmoab\b/i, kind: 'city' },
  { name: 'Park City', pattern: /\bpark city\b/i, kind: 'city' },
  { name: 'Bountiful', pattern: /\bbountiful\b/i, kind: 'city' },
  { name: 'West Jordan', pattern: /\bwest jordan\b/i, kind: 'city' },
  { name: 'South Jordan', pattern: /\bsouth jordan\b/i, kind: 'city' },
  { name: 'Herriman', pattern: /\bherriman\b/i, kind: 'city' },
  { name: 'Cottonwood Heights', pattern: /\bcottonwood heights\b/i, kind: 'city' },
  { name: 'Kearns', pattern: /\bkearns\b/i, kind: 'city' },
  { name: 'Magna', pattern: /\bmagna\b/i, kind: 'city' },
  { name: 'Kaysville', pattern: /\bkaysville\b/i, kind: 'city' },
  { name: 'Lehi', pattern: /\blehi\b/i, kind: 'city' },
  { name: 'American Fork', pattern: /\bamerican fork\b/i, kind: 'city' },
  { name: 'Spanish Fork', pattern: /\bspanish fork\b/i, kind: 'city' },
  { name: 'Tooele', pattern: /\btooele\b/i, kind: 'city' },
  { name: 'Cedar City', pattern: /\bcedar city\b/i, kind: 'city' },
  { name: 'Brigham City', pattern: /\bbrigham city\b/i, kind: 'city' },
  { name: 'Vernal', pattern: /\bvernal\b/i, kind: 'city' },
  { name: 'Logan', pattern: /\blogan\b/i, kind: 'city', ambiguous: true },
  { name: 'Ogden', pattern: /\bogden\b/i, kind: 'city', ambiguous: true },
  { name: 'Murray', pattern: /\bmurray\b/i, kind: 'city', ambiguous: true },
  { name: 'Sandy', pattern: /\bsandy\b/i, kind: 'city', ambiguous: true },
  { name: 'Layton', pattern: /\blayton\b/i, kind: 'city', ambiguous: true },
  { name: 'Draper', pattern: /\bdraper\b/i, kind: 'city', ambiguous: true },
  { name: 'Syracuse', pattern: /\bsyracuse\b/i, kind: 'city', ambiguous: true },
  { name: 'Farmington', pattern: /\bfarmington\b/i, kind: 'city', ambiguous: true },
  { name: 'Clearfield', pattern: /\bclearfield\b/i, kind: 'city', ambiguous: true },
  { name: 'Midvale', pattern: /\bmidvale\b/i, kind: 'city', ambiguous: true },
  { name: 'Riverton', pattern: /\briverton\b/i, kind: 'city', ambiguous: true },
  { name: 'Millcreek', pattern: /\bmillcreek\b/i, kind: 'city', ambiguous: true },
  { name: 'Payson', pattern: /\bpayson\b/i, kind: 'city', ambiguous: true },
  { name: 'Springville', pattern: /\bspringville\b/i, kind: 'city', ambiguous: true },
  { name: 'Roosevelt', pattern: /\broosevelt\b/i, kind: 'city', ambiguous: true },
  { name: 'Heber', pattern: /\bheber(?:\s+city)?\b/i, kind: 'city', ambiguous: true },
  { name: 'Pleasant Grove', pattern: /\bpleasant grove\b/i, kind: 'city', ambiguous: true },
  { name: 'Taylorsville', pattern: /\btaylorsville\b/i, kind: 'city', ambiguous: true },
  { name: 'West Valley', pattern: /\bwest valley(?:\s+city)?\b/i, kind: 'city', ambiguous: true },
  { name: 'UDOT', pattern: /\budot\b/i, kind: 'agency' },
  { name: 'UHP', pattern: /\buhp\b/i, kind: 'agency' },
  { name: 'UTA', pattern: /\bUTA\b/, kind: 'agency' },
  { name: 'SLCPD', pattern: /\bslcpd\b/i, kind: 'agency' },
  { name: 'TRAX', pattern: /\btrax\b/i, kind: 'agency' },
  { name: 'FrontRunner', pattern: /\bfrontrunner\b/i, kind: 'agency' },
  { name: 'University of Utah', pattern: /\buniversity of utah\b|\bu of u\b/i, kind: 'school' },
  { name: 'Utah State University', pattern: /\butah state university\b/i, kind: 'school' },
  { name: 'Brigham Young University', pattern: /\bbrigham young\b|\bBYU\b/, kind: 'school' },
  { name: 'Weber State', pattern: /\bweber state\b/i, kind: 'school' },
  { name: 'Utah Valley University', pattern: /\butah valley university\b|\bUVU\b/, kind: 'school' },
  { name: 'Southern Utah University', pattern: /\bsouthern utah university\b|\bSUU\b/, kind: 'school' },
  { name: 'Salt Lake Community College', pattern: /\bsalt lake community college\b|\bSLCC\b/, kind: 'school' },
  { name: 'Utah Tech', pattern: /\butah tech\b/i, kind: 'school' },
  { name: 'Snow College', pattern: /\bsnow college\b/i, kind: 'school' },
];

const UTAH_OUTLET_HOSTS = [
  'sltrib.com', 'deseret.com', 'ksl.com', 'fox13now.com', 'kutv.com', 'abc4.com',
  'kslnewsradio.com', 'kuer.org', 'utahnewsdispatch.com', 'parkrecord.com', 'townlift.com',
  'upr.org', 'cityweekly.net', 'utah.gov', 'slc.gov', 'utcourts.gov',
];

function storyText(input: { title?: string; summary?: string; text?: string }): string {
  return `${input.title || ''}\n${input.summary || ''}\n${input.text || ''}`.replace(/\breal salt lake\b/gi, ' ');
}

function mentionsUtahTag(value: string): boolean {
  return /\butah\b/i.test(value) || /\bUT\b/.test(value);
}

function isUtahOutlet(value: string): boolean {
  const hosts = (value.match(/[a-z0-9.-]+\.[a-z]{2,24}/gi) || []).map((host) => host.toLowerCase().replace(/^www\./, ''));
  return hosts.some((host) => UTAH_OUTLET_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}

function placeHits(value: string, kinds?: GazetteerKind[]): GazetteerPlace[] {
  return GAZETTEER.filter((place) => (!kinds || kinds.includes(place.kind)) && place.pattern.test(value));
}

function anchored(value: string, outlet: string): boolean {
  return mentionsUtahTag(value) || isUtahOutlet(outlet);
}

function inferLocation(input: { title?: string; summary?: string; text?: string; url?: string; outlet?: string }): string {
  const hay = storyText(input);
  const outlet = `${input.outlet || ''} ${input.url || ''}`;
  const places = placeHits(hay, ['city', 'county']);
  const solid = places.find((place) => !place.ambiguous || anchored(hay, outlet));
  if (solid) return solid.name;
  if (mentionsUtahTag(hay) || placeHits(hay, ['agency']).length) return 'Statewide';
  return '';
}

function locationIsUtah(location: string, outlet: string): boolean {
  const value = location.trim();
  if (!value) return false;
  if (/^(statewide|utah|state of utah)$/i.test(value)) return true;
  const places = placeHits(value, ['city', 'county']);
  if (!places.length) return false;
  if (places.some((place) => !place.ambiguous)) return true;
  return anchored(value, outlet);
}

function textNamesUtah(input: { title?: string; summary?: string; text?: string }, outlet: string): boolean {
  const hay = storyText(input);
  if (/\butah\b/i.test(hay)) return true;
  const hits = placeHits(hay);
  if (hits.some((place) => !place.ambiguous)) return true;
  return hits.length > 0 && anchored(hay, outlet);
}

/** Both the location and the wording have to place the story in Utah. Unsure items are left out. */
export function isUtahStory(input: { location?: string; title?: string; summary?: string; text?: string; url?: string; outlet?: string }): boolean {
  const outlet = `${input.outlet || ''} ${input.url || ''}`;
  const location = String(input.location || '').trim() || inferLocation(input);
  return locationIsUtah(location, outlet) && textNamesUtah(input, outlet);
}

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
      error: status === 'failed' ? String(row.error ?? row.reason ?? 'This source could not be read.').replace(/\s+/g, ' ').trim().slice(0, 240) : undefined,
      reason: String(row.reason ?? row.error ?? '').replace(/\s+/g, ' ').trim().slice(0, 240) || undefined,
      httpStatus: Number.isFinite(Number(row.httpStatus)) ? Number(row.httpStatus) : null,
      failures: Math.max(0, Math.min(9, Math.floor(Number(row.failures) || 0))),
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

/**
 * Reads the age a search result shows: "3 hours ago", "yesterday", "Nov 14, 2026", "2026-11-14", or a full timestamp.
 * Relative ages are exact enough to place a story in a 3h window; plain dates are date-only.
 */
export function parsePageAge(value: string, now: Date): Dated | null {
  const raw = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!raw) return null;
  const rel = raw.match(/^(an?|\d+)\s*(second|sec|minute|min|hour|hr|day|week)s?\s+ago$/);
  if (rel) {
    const n = rel[1] === 'a' || rel[1] === 'an' ? 1 : Number(rel[1]);
    const unit = rel[2];
    const ms = unit.startsWith('s') ? 1e3 : unit.startsWith('m') ? 6e4 : unit.startsWith('h') ? 36e5 : unit === 'day' ? 864e5 : 6048e5;
    // "0 days ago" means today. A day or week with a count is only a date.
    return { at: new Date(now.getTime() - n * ms), dateOnly: (unit === 'day' || unit === 'week') && n > 0 };
  }
  if (raw === 'just now') return { at: now, dateOnly: false };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (raw === 'today') return { at: denverMidnight(today), dateOnly: true };
  if (raw === 'yesterday') return { at: new Date(denverMidnight(today).getTime() - 864e5), dateOnly: true };
  const exact = parseWhen(value);
  if (exact) {
    // "November 14, 2026" parses as UTC midnight with no time: treat as a plain date.
    if (!/\d{1,2}:\d{2}/.test(raw) && !/t\d{2}/.test(raw)) {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(exact.at);
      return { at: denverMidnight(day), dateOnly: true };
    }
    return exact;
  }
  return null;
}

export function passesWindow(item: { publishedAt: string; dateOnly: boolean }, window: NewsWindow, now: Date): boolean {
  if ((window === '3h' || window === '6h') && item.dateOnly) return false;
  const at = Date.parse(item.publishedAt);
  if (!Number.isFinite(at)) return false;
  const age = now.getTime() - at;
  return age >= -5 * 60 * 1000 && age <= WINDOW_MS[window];
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
  if (!newest) return { status: 'failed', checkedAt, error: 'No dated items' };
  const age = now.getTime() - Date.parse(newest);
  if (age > FRESH_MS) return { status: 'failed', checkedAt, newest, error: 'The newest item is older than 7 days.' };
  return { status: 'ok', checkedAt, newest, error: undefined };
}

export type FetchResult =
  | { ok: true; text: string; status?: number }
  | { ok: false; error: string; httpStatus?: number; blocked?: boolean; challenge?: boolean; timeout?: boolean };

export type FetchText = (url: string, headers?: Record<string, string>) => Promise<FetchResult>;

export type SourceReport = {
  name: string;
  status: 'ok' | 'failed' | 'disabled';
  reason: string;
  httpStatus: number | null;
  items: NewsItem[];
};

export function failureDetail(fail: Extract<FetchResult, { ok: false }>): { reason: string; blocked: boolean; httpStatus: number | null } {
  const httpStatus = Number.isFinite(fail.httpStatus) ? Number(fail.httpStatus) : null;
  if (fail.challenge) return { reason: 'Blocked (Cloudflare challenge)', blocked: true, httpStatus };
  if (fail.timeout || /took too long/i.test(fail.error)) return { reason: 'Timed out', blocked: false, httpStatus };
  if (httpStatus === 403) return { reason: 'Blocked (403)', blocked: true, httpStatus };
  if (httpStatus === 429) return { reason: 'Blocked (429)', blocked: true, httpStatus };
  if (fail.blocked) return { reason: fail.error || 'Blocked', blocked: true, httpStatus };
  if (httpStatus) return { reason: `HTTP ${httpStatus}`, blocked: false, httpStatus };
  return { reason: fail.error || 'The source could not be read.', blocked: false, httpStatus };
}

const NWS_UA = 'SLCScoopPostStudio/1.0 (+https://slcscoop.com)';

async function readSource(source: NewsSource, fetchText: FetchText): Promise<{ items: RawItem[]; error?: string; newest?: string; httpStatus?: number | null; blocked?: boolean; parse?: boolean; empty?: boolean }> {
  if (source.type === 'api') {
    if (!process.env.UDOT_API_KEY?.trim()) {
      return { items: [], error: 'Needs a UDOT developer key in UDOT_API_KEY. Closures and major incidents are the only events this source keeps.' };
    }
    return { items: [], error: 'The UDOT events endpoint is not configured yet. The source stays listed until a key and the events URL are both set.' };
  }
  const headers = source.type === 'nws' ? { 'user-agent': NWS_UA, accept: 'application/geo+json, application/json' } : undefined;
  const fetched = await fetchText(source.url, headers);
  if (!fetched.ok) {
    const detail = failureDetail(fetched);
    return { items: [], error: detail.reason, httpStatus: detail.httpStatus, blocked: detail.blocked };
  }
  if (/just a moment|cf-browser-verification|cf-challenge|cdn-cgi\/challenge/i.test(fetched.text.slice(0, 5000)) && /<html|<!doctype/i.test(fetched.text.slice(0, 400))) {
    return { items: [], error: 'Blocked (Cloudflare challenge)', httpStatus: fetched.status || 403, blocked: true };
  }
  if ((source.type === 'rss' || source.type === 'newsmap') && /^\s*(?:<!doctype html|<html)\b/i.test(fetched.text)) {
    return { items: [], error: 'The address returned a web page, not a feed.' };
  }
  try {
  if (source.type === 'newsmap') return { items: parseNewsSitemap(fetched.text), httpStatus: fetched.status || 200 };
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
  if (source.type === 'page') return { items: parsePage(fetched.text, source.url, source.selector, source.timeSelector), httpStatus: fetched.status || 200 };
  return { items: parseFeed(fetched.text), httpStatus: fetched.status || 200 };
  } catch {
    return { items: [], error: 'Could not parse the feed', httpStatus: fetched.status || null, parse: true };
  }
}

export async function collectNews(input: {
  sources: NewsSource[];
  now?: Date;
  window?: NewsWindow;
  recheck?: boolean;
  fetchText: FetchText;
}): Promise<{ items: NewsItem[]; held: NewsItem[]; sources: NewsSource[]; reports: SourceReport[] }> {
  const now = input.now || new Date();
  const window = input.window || '6h';
  const sources = input.sources.map((source) => ({ ...source }));
  const parsed = new Map<string, RawItem[]>();
  const pending = sources.filter((source) => {
    if (!source.enabled && !input.recheck) return false;
    const needsCheck = input.recheck || !source.status;
    return needsCheck || source.status === 'ok';
  });
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, Math.max(1, pending.length)) }, async () => {
    while (cursor < pending.length) {
      const source = pending[cursor];
      cursor += 1;
      let result: { items: RawItem[]; error?: string; newest?: string; httpStatus?: number | null; blocked?: boolean };
      try {
        result = await readSource(source, input.fetchText);
      } catch {
        result = { items: [], error: 'Could not parse the feed' };
      }
      const judged = judgeSource(result.items, now, result.error, result.newest);
      source.httpStatus = result.httpStatus ?? null;
      if (result.error || judged.status === 'failed') {
        source.status = 'failed';
        source.checkedAt = judged.checkedAt;
        source.newest = judged.newest;
        source.error = result.error || judged.error;
        source.reason = source.error;
        if (result.blocked) {
          source.failures = (source.failures || 0) + 1;
          if (source.failures >= 3) {
            source.enabled = false;
            source.reason = `Disabled after 3 blocked responses. ${source.error || ''}`.trim();
            source.error = source.reason;
          }
        }
      } else {
        source.status = 'ok';
        source.checkedAt = judged.checkedAt;
        source.newest = judged.newest;
        source.error = undefined;
        source.reason = undefined;
        source.failures = 0;
        if (input.recheck) source.enabled = true;
        parsed.set(source.id, result.items);
      }
    }
  }));
  const kept: NewsItem[] = [];
  for (const source of sources) {
    if (!source.enabled || source.status !== 'ok') continue;
    for (const raw of parsed.get(source.id) || []) {
      if (!isUtahStory({ title: raw.title, summary: raw.summary, url: raw.url, outlet: source.name })) continue;
      kept.push({
        id: `${source.id}:${raw.url}`,
        sourceId: source.id,
        source: source.name,
        title: raw.title,
        url: raw.url,
        summary: raw.summary,
        publishedAt: raw.publishedAt,
        dateOnly: raw.dateOnly,
        utah: 'yes',
      });
    }
  }
  const held: NewsItem[] = [];
  const fresh = (item: NewsItem) => passesWindow(item, window, now);
  const byTime = (a: NewsItem, b: NewsItem) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  const items = kept.filter(fresh).sort(byTime).slice(0, 80);
  const heldItems = held.filter(fresh).sort(byTime).slice(0, 40);
  const reports: SourceReport[] = sources.map((source) => {
    const mine = [...items, ...heldItems].filter((item) => item.sourceId === source.id);
    const httpStatus = source.httpStatus ?? null;
    if (!source.enabled && (source.failures || 0) >= 3) {
      return { name: source.name, status: 'disabled', reason: source.reason || source.error || 'Disabled after 3 blocked responses.', httpStatus, items: [] };
    }
    if (source.status !== 'ok') {
      const reason = source.reason || source.error || (source.status === 'failed' ? 'This source could not be read.' : 'Off');
      return { name: source.name, status: source.enabled ? 'failed' : 'disabled', reason, httpStatus, items: [] };
    }
    return { name: source.name, status: 'ok', reason: '', httpStatus, items: mine };
  });
  return { items, held: heldItems, sources, reports };
}

export const NEWS_SEARCH_DOMAINS = [
  'ksl.com', 'kutv.com', 'fox13now.com', 'sltrib.com', 'deseret.com', 'abc4.com',
  'kslnewsradio.com', 'kuer.org', 'utahnewsdispatch.com', 'police.slc.gov', 'udot.utah.gov', 'weather.gov',
];

export function normalizeSearchDomains(raw: unknown): string[] {
  if (!Array.isArray(raw)) return NEWS_SEARCH_DOMAINS.slice();
  const out: string[] = [];
  for (const item of raw) {
    const host = String(item ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,24}$/.test(host) || out.includes(host)) continue;
    out.push(host);
    if (out.length >= 30) break;
  }
  return out.length ? out : NEWS_SEARCH_DOMAINS.slice();
}

const SECTION = /^(news|sports|utah|local|politics|weather|traffic|video|videos|watch|live|home)$/i;

/** A story link has an article path. Homepages and section indexes are not stories. */
export function isArticleUrl(value: string): boolean {
  try {
    const path = new URL(value).pathname.replace(/\/amp\/?$/i, '').replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) return false;
    if (parts.length === 1 && (SECTION.test(parts[0]) || (parts[0].length < 8 && !/\d/.test(parts[0])))) return false;
    if (parts.every((part) => SECTION.test(part))) return false;
    return true;
  } catch {
    return false;
  }
}

export function urlKey(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/\/amp\/?$/, '').replace(/\/$/, '');
    // Protocol-agnostic: the model sometimes writes http:// for an https:// result.
    return `//${host}${path}`;
  } catch {
    return '';
  }
}

export type SearchHit = {
  title: string;
  url: string;
  outlet: string;
  published: string;
  summary: string;
  location: string;
  category: string;
  /** false when only the day is known (search result showed a date without a time). */
  timeConfirmed?: boolean;
};

/** Why search results were kept or dropped, so an empty list explains itself. */
export type SearchStats = {
  returned: number;
  kept: number;
  notInResults: number;
  noDate: number;
  tooOld: number;
  notUtah: number;
  badTitle: number;
};

export function emptySearchStats(): SearchStats {
  return { returned: 0, kept: 0, notInResults: 0, noDate: 0, tooOld: 0, notUtah: 0, badTitle: 0 };
}

/** Keep search rows whose URL came from the tool, whose time was on the page, and that are inside the window. */
export function acceptSearchItems(
  raw: unknown,
  allowedUrls: string[],
  hours: number,
  now: Date,
  opts: { ages?: Record<string, string>; stats?: SearchStats } = {},
): SearchHit[] {
  const stats = opts.stats || emptySearchStats();
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(allowedUrls.map(urlKey).filter(Boolean));
  const ages = new Map(Object.entries(opts.ages || {}).map(([u, a]) => [urlKey(u), a] as const));
  const maxAge = hours * 60 * 60 * 1000;
  const out: SearchHit[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    stats.returned += 1;
    const row = asObject(item);
    const url = String(row.url ?? '').trim();
    const key = urlKey(url);
    if (!key || !allowed.has(key) || !isArticleUrl(url)) { stats.notInResults += 1; continue; }
    if (seen.has(key)) continue;
    // The model's time first; otherwise the age the search result itself showed.
    const told = String(row.published ?? '');
    const when = parsePageAge(told, now) || parsePageAge(ages.get(key) || '', now);
    if (!when) { stats.noDate += 1; continue; }
    if (when.dateOnly) {
      // A plain date can't place a story in a 3h/6h window. For 12h/24h, keep it if that day overlaps the window.
      const dayEnd = when.at.getTime() + 864e5;
      if (hours < 12 || now.getTime() - dayEnd > maxAge || when.at.getTime() - now.getTime() > 864e5) { stats.tooOld += 1; continue; }
    } else {
      const age = now.getTime() - when.at.getTime();
      if (age < -5 * 60 * 1000 || age > maxAge) { stats.tooOld += 1; continue; }
    }
    const title = String(row.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (title.length < 4) { stats.badTitle += 1; continue; }
    const hit: SearchHit = {
      title,
      url,
      outlet: String(row.outlet ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      published: when.at.toISOString(),
      summary: String(row.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 280),
      location: String(row.location ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      category: String(row.category ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
      timeConfirmed: !when.dateOnly,
    };
    if (!isUtahStory(hit)) { stats.notUtah += 1; continue; }
    seen.add(key);
    out.push(hit);
  }
  stats.kept = out.length;
  return out;
}

function titleWords(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2));
}

function titlesMatch(a: string, b: string): boolean {
  const left = titleWords(a);
  const right = titleWords(b);
  if (left.size < 2 || right.size < 2) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size) >= 0.6;
}

/** Group the same story by URL, then by a similar headline. */
export function groupStories<T extends { title: string; url: string }>(items: T[]): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const key = urlKey(item.url);
    const found = groups.find((group) => group.some((have) => (key && urlKey(have.url) === key) || titlesMatch(have.title, item.title)));
    if (found) found.push(item);
    else groups.push([item]);
  }
  return groups;
}
