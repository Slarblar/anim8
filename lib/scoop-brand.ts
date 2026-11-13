import { list } from '@vercel/blob';
import { STORE_PREFIX, blobOptions, parseDocPath } from '@/lib/scoop';

export type CategoryRule = { id: string; description: string; when: string };

export const DEFAULT_CATEGORIES: CategoryRule[] = [
  { id: 'BREAKING', description: 'An event happening now or in the last few hours.', when: 'Use for public safety or major impact that is still unfolding.' },
  { id: 'NEWS', description: 'The default for a reported story.', when: 'Use when no narrower topic category fits.' },
  { id: 'UPDATE', description: 'A new development on a story we already posted.', when: 'Use only when the editor marks the post as a follow-up.' },
  { id: 'CORRECTION', description: 'A fix to a previous post.', when: 'Use only when the editor marks that this corrects a previous post.' },
  { id: 'POLICY', description: 'Government action, budgets, laws, and agency rules.', when: 'Use when the story is about a policy decision rather than a single incident.' },
  { id: 'POLITICS', description: 'Elections, campaigns, and elected officials.', when: 'Use when the political contest or office is the story.' },
  { id: 'COURTS', description: 'Hearings, rulings, charges, and sentences.', when: 'Use when the story turns on a court proceeding.' },
  { id: 'CRIME', description: 'A reported crime or police investigation.', when: 'Use when the incident itself is the news and it is not mainly a court update.' },
  { id: 'WEATHER', description: 'Forecasts, storms, and weather warnings.', when: 'Use for weather that affects people in the coverage area.' },
  { id: 'BUSINESS', description: 'Companies, jobs, and the local economy.', when: 'Use when a business or market change is the story.' },
  { id: 'COMMUNITY', description: 'Neighborhoods, schools, culture, and local life.', when: 'Use for community events and local features that are not breaking news.' },
  { id: 'SPORTS', description: 'Games, athletes, and local sports.', when: 'Use for a sports result or sports news.' },
  { id: 'HISTORY', description: 'A look back at a past event.', when: 'Use when the post is a history item rather than news from today.' },
  { id: 'SPONSORED', description: 'A paid or partner placement.', when: 'Use only for a sponsored template.' },
  { id: 'TIP', description: 'A reader tip or call for information.', when: 'Use when the post asks the public for help.' },
];

export const DEFAULT_TAGS = [
  'UTAH',
  'PUBLIC SAFETY',
  'COMMUNITY',
  'HEALTH CARE',
  'NATIVE AMERICAN',
  'COURTS',
  'POLITICS',
  'WEATHER',
  'BUSINESS',
  'EDUCATION',
  'HOUSING',
  'TRANSIT',
  'ENVIRONMENT',
  'ELECTIONS',
];

export const STORY_TYPES = ['breaking', 'policy', 'crime', 'courts', 'weather', 'business', 'community', 'feature', 'correction', 'update'] as const;

/** Publishers whose reporting must be credited. Hosts and subdomains match. Editable in brand settings. */
export const DEFAULT_OUTLETS = [
  'sltrib.com',
  'deseret.com',
  'ksl.com',
  'fox13now.com',
  'kutv.com',
  'abc4.com',
  'kslnewsradio.com',
];

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function cleanLines(value: unknown, maxLines: number, maxChars: number): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/"""/g, '"')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n')
    .slice(0, maxChars);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizeCategories(raw: unknown): CategoryRule[] {
  if (!Array.isArray(raw)) return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const out: CategoryRule[] = [];
  for (const item of raw) {
    const row = asObject(item);
    const id = String(row.id ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 24);
    if (id.length < 2 || out.some((c) => c.id === id)) continue;
    out.push({
      id,
      description: String(row.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
      when: String(row.when ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
    });
    if (out.length >= 24) break;
  }
  return out.length ? out : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_TAGS.slice();
  const out: string[] = [];
  for (const item of raw) {
    const tag = String(item ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .slice(0, 32);
    if (tag.length < 2 || tag === 'SLCSCOOP' || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= 80) break;
  }
  return out.length ? out : DEFAULT_TAGS.slice();
}

export function normalizeOutlets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_OUTLETS.slice();
  const out: string[] = [];
  for (const item of raw) {
    let host = String(item ?? '').trim().toLowerCase();
    host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '').replace(/^www\./, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,24}$/.test(host) || out.includes(host)) continue;
    out.push(host);
    if (out.length >= 80) break;
  }
  return out.length ? out : DEFAULT_OUTLETS.slice();
}

export function brandFrom(raw: unknown): { categories: CategoryRule[]; tags: string[]; outlets: string[] } {
  const row = asObject(raw);
  return { categories: normalizeCategories(row.categories), tags: normalizeTags(row.tags), outlets: normalizeOutlets(row.outlets) };
}

export async function readBrand(): Promise<{ categories: CategoryRule[]; tags: string[]; outlets: string[] }> {
  try {
    const { blobs } = await list({ prefix: `${STORE_PREFIX}brand/settings--`, limit: 100, ...blobOptions() });
    let best: { url: string; ts: number } | null = null;
    for (const blob of blobs) {
      const parsed = parseDocPath(blob.pathname, 'brand');
      if (!parsed || parsed.id !== 'settings') continue;
      if (!best || parsed.ts > best.ts) best = { url: blob.url, ts: parsed.ts };
    }
    if (!best) return brandFrom(null);
    const res = await fetch(best.url, { cache: 'no-store' });
    if (!res.ok) return brandFrom(null);
    return brandFrom(await res.json());
  } catch {
    return brandFrom(null);
  }
}

export type HeadlineOption = { lines: string[] };

export type NormalizedDraft = {
  category: string;
  categoryReason: string;
  topicTags: string[];
  suggestedTags: string[];
  headlines: HeadlineOption[];
  dek: string;
  location: string;
  source: string;
  referenceId: string;
  notes: string;
  pages: { headlines: HeadlineOption[]; dek: string }[];
};

const HEADLINE_LINE = 23;
const HEADLINE_MAX_LINES = 3;

/** Break a headline into at most 3 lines of 23 characters, counting spaces. */
function wrapHeadline(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && next.length > HEADLINE_LINE) {
        out.push(current);
        current = word;
        if (out.length >= HEADLINE_MAX_LINES) return out;
      } else current = next;
    }
    if (current) out.push(current);
    if (out.length >= HEADLINE_MAX_LINES) break;
  }
  return out.slice(0, HEADLINE_MAX_LINES).filter(Boolean);
}

function headlineOption(raw: unknown): HeadlineOption | null {
  if (typeof raw === 'string') {
    const lines = wrapHeadline(cleanLines(raw, 6, 280).split('\n'));
    return lines.length ? { lines } : null;
  }
  const row = asObject(raw);
  const fromLines = Array.isArray(row.lines) ? row.lines : Array.isArray(row.headlineLines) ? row.headlineLines : null;
  if (fromLines) {
    const lines = wrapHeadline(fromLines.map((line) => String(line ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    if (lines.join(' ').length >= 3) return { lines };
  }
  if (typeof row.headline === 'string') return headlineOption(row.headline);
  return null;
}

function collectHeadlines(raw: unknown): HeadlineOption[] {
  const row = asObject(raw);
  const bag = Array.isArray(row.headlines) ? row.headlines : [];
  const out: HeadlineOption[] = [];
  for (const item of bag) {
    const opt = headlineOption(item);
    if (!opt) continue;
    const key = opt.lines.join('\n');
    if (out.some((have) => have.lines.join('\n') === key)) continue;
    out.push(opt);
    if (out.length >= 3) break;
  }
  if (!out.length) {
    const single = headlineOption(row.headlineLines ?? row.headline);
    if (single) out.push(single);
  }
  return out;
}

function tagKey(tag: string) {
  return tag.toUpperCase().replace(/\s+/g, ' ').trim();
}

export function tagsLine(topics: string[]): string {
  const body = topics.map(tagKey).filter((tag) => tag && tag !== 'SLCSCOOP');
  return body.concat('SLCSCOOP').join('  |  ');
}

export function normalizeDraft(
  raw: unknown,
  brand: { categories: CategoryRule[]; tags: string[] },
  flags: { followUp?: boolean; correction?: boolean },
  referenceIds: string[]
): NormalizedDraft {
  const row = asObject(raw);
  const allowed = new Map(brand.categories.map((c) => [c.id.toUpperCase(), c.id]));
  let category = tagKey(String(row.category ?? ''));
  let categoryReason = String(row.categoryReason ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (flags.correction) {
    category = allowed.get('CORRECTION') || 'CORRECTION';
    categoryReason = 'You marked this as a correction.';
  } else if (category === 'CORRECTION' || !allowed.has(category)) {
    categoryReason = category === 'CORRECTION'
      ? 'Correction is only used when you mark the post as a correction.'
      : category
        ? 'That category is not in the list, so this stays NEWS.'
        : categoryReason;
    category = allowed.get('NEWS') || brand.categories[0]?.id || 'NEWS';
  } else if (category === 'UPDATE' && !flags.followUp) {
    category = allowed.get('NEWS') || 'NEWS';
    categoryReason = 'Update is only used when you mark the post as a follow-up.';
  } else {
    category = allowed.get(category) || category;
  }

  const known = new Map(brand.tags.map((tag) => [tagKey(tag), tagKey(tag)]));
  const topicTags: string[] = [];
  const suggestedTags: string[] = [];
  const seen = new Set<string>();
  const incoming = (Array.isArray(row.topicTags) ? row.topicTags : []).concat(Array.isArray(row.suggestedTags) ? row.suggestedTags : []);
  for (const item of incoming) {
    const tag = tagKey(String(item ?? ''));
    if (!tag || tag === 'SLCSCOOP' || seen.has(tag)) continue;
    seen.add(tag);
    if (known.has(tag)) {
      if (topicTags.length < 3) topicTags.push(known.get(tag) || tag);
    } else if (suggestedTags.length < 6 && tag.length <= 32) suggestedTags.push(tag);
  }

  const headlines = collectHeadlines(row);
  const dek = cleanLines(row.dek, 4, 500);
  const pagesIn = Array.isArray(row.pages) ? row.pages.slice(0, 6) : [];
  const pages = pagesIn.map((page) => ({
    headlines: collectHeadlines(page),
    dek: cleanLines(asObject(page).dek, 4, 500),
  }));
  if (!pages.length && headlines.length) pages.push({ headlines, dek });

  const referenceId = referenceIds.includes(String(row.referenceId ?? '')) ? String(row.referenceId) : '';
  return {
    category,
    categoryReason,
    topicTags,
    suggestedTags,
    headlines: pages[0]?.headlines || headlines,
    dek: pages[0]?.dek || dek,
    location: String(row.location ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
    source: String(row.source ?? '').replace(/\s+/g, ' ').trim().slice(0, 140),
    referenceId,
    notes: String(row.notes ?? '').replace(/\s+/g, ' ').trim().slice(0, 280),
    pages,
  };
}

export function normalizeMeasure(raw: unknown) {
  const row = asObject(raw);
  const headline = asObject(row.headline);
  const dek = asObject(row.dek);
  const chars = Array.isArray(headline.charsPerLine)
    ? headline.charsPerLine.map((n) => clamp(Math.round(Number(n) || 0), 0, 80)).filter((n) => n > 0).slice(0, 4)
    : [];
  const density = ['tight', 'regular', 'open'].includes(String(row.density)) ? String(row.density) : 'regular';
  return {
    headline: {
      text: cleanLines(headline.text, 4, 280),
      lineCount: clamp(Math.round(Number(headline.lineCount) || chars.length || 1), 1, 4),
      charsPerLine: chars,
      capHeight: clamp(Math.round(Number(headline.capHeight) || 72), 10, 200),
      fill: clamp(Number(headline.fill) || 0.9, 0.3, 1),
      marginLeft: clamp(Math.round(Number(headline.marginLeft) || 60), 0, 400),
      marginRight: clamp(Math.round(Number(headline.marginRight) || 60), 0, 400),
    },
    dek: {
      text: cleanLines(dek.text, 4, 500),
      lineCount: clamp(Math.round(Number(dek.lineCount) || 1), 1, 4),
      fontSize: clamp(Math.round(Number(dek.fontSize) || 32), 8, 80),
      gap: clamp(Math.round(Number(dek.gap) || 16), 0, 80),
    },
    tag: String(row.tag ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
    category: tagKey(String(row.category ?? '')).slice(0, 24),
    density,
  };
}
