import { NextRequest, NextResponse } from 'next/server';
import { guard, isBlobUrl } from '@/lib/scoop';
import { brandFrom, headlineGuide, normalizeDraft, readBrand, tagsLine, type CategoryRule, type HeadlineGuide } from '@/lib/scoop-brand';
import { copyReport } from '@/lib/scoop-copycheck';
import { parseModelJson } from '@/lib/scoop-json';
import { cleanArticleText } from '@/lib/scoop-link';
import { incidentLocation } from '@/lib/scoop-news';

/** SLC Scoop rewrites. It does not borrow another outlet's sentences. */
const OWN_WORDS = `Write the headline, the dek, and the article in SLC Scoop's voice, not the source's. Match the voice samples: short, specific, and local. Do not reuse any run of 7 or more words from the excerpt, and do not follow its sentence order. Rewording is not new reporting: keep every fact exactly as stated.
Direct quotes are the exception: keep a quote word for word, inside quotation marks, and name who said it. Never change, trim, or invent a quote.`;

const ARTICLE_RULE = (outlet: string) => `article: the website story, in the same voice as the graphic. Prefer 300 to 800 words, in short paragraphs separated by a blank line.
SLC Scoop sounds like a Salt Lake desk talking to a neighbor: direct, factual, local. Short sentences. Name the place. Say who did what. No clickbait, no opinion, no emoji, no "here's what we know," no sign-off.
- Open on the newest fact: who, what, where, when.
- Then the detail a reader here needs. Name a person or agency only when they said or did something ("police said").${outlet ? `
- Name ${outlet} once, in the first or second paragraph. After that, do not name the outlet again and do not keep saying who reported the incident. The Source line already credits them.` : ''}
- No headline, no byline, nothing that is not in the excerpt.
- If the excerpt is too thin for 300 words, write fewer. Never pad. When the excerpt supports it, write the full story, up to 800 words.`;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Slot = { slot: string; maxChars: number; caps: boolean; example: string };
type VoiceRef = { headline: string; dek: string; category: string };

const VOICE_LIMIT = 24;

function cleanLines(value: unknown, maxLines: number, maxChars: number): string {
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

function cleanRefs(raw: unknown): VoiceRef[] {
  if (!Array.isArray(raw)) return [];
  const out: VoiceRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<VoiceRef>;
    const headline = cleanLines(row.headline, 4, 280);
    const dek = cleanLines(row.dek, 4, 500);
    const category = String(row.category ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (headline.length < 8) continue;
    out.push({ headline, dek, category });
    if (out.length >= VOICE_LIMIT) break;
  }
  return out;
}

function systemPrompt(refs: VoiceRef[]): string {
  const examples = refs.length
    ? `\n\nVoice examples from posts SLC Scoop already published. Match their cadence, specificity, how they attribute, and what they leave out. ${headlineRule({ perLine: 24, lines: 3, cap: 0 })} These events are not the story you are writing. Never reuse their names, numbers, places, or quotes.\n\n${refs
        .map((ref, i) => {
          const parts = [`Example ${i + 1}${ref.category ? ` · ${ref.category}` : ''}`, `Headline:\n${ref.headline}`];
          if (ref.dek) parts.push(`Dek:\n${ref.dek}`);
          return parts.join('\n');
        })
        .join('\n\n')}`
    : '';
  return `You write Instagram news graphics for SLC Scoop, an independent Salt Lake City news outlet. Tagline: "Reprogramming the news." Voice: direct, factual, local, no clickbait, no opinion, no emoji.${examples}`;
}

/** Same Sonnet id the client-request briefs already call. Override with SCOOP_MODEL. */
const MODEL = process.env.SCOOP_MODEL?.trim() || 'claude-sonnet-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function cleanLink(raw: unknown): { title: string; siteName: string; published: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const siteName = String(row.siteName ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!siteName) return null;
  return {
    title: String(row.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
    siteName,
    published: String(row.published ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
  };
}

function attribution(link: { title: string; siteName: string; published: string } | null): string {
  if (!link) return '';
  const headline = link.title ? `, headline “${link.title}”` : '';
  const when = link.published ? `, published ${link.published}` : '';
  return `\nThe facts below come from ${link.siteName}${headline}${when}. The Source line is the outlet credit. Do not name ${link.siteName} in the headline or the dek. In the article, name ${link.siteName} once, then do not mention the outlet again. Do not present the reporting as SLC Scoop’s own.\n`;
}

function headlineRule(spec: HeadlineGuide): string {
  const size = spec.cap ? ` The headline is set at ${spec.cap}px. Do not rely on a bigger size to fit a longer line.` : '';
  return `Headline rule: each line is at most ${spec.perLine} characters, counting spaces. Use ${spec.lines} lines when each line still fills the box. A full line is close to ${spec.perLine} characters. Do not put one word on a line. Put a newline between lines. Do not write a fourth line.${size}`;
}

function buildPrompt(excerpt: string, slots: Slot[], link: { title: string; siteName: string; published: string } | null) {
  return `Fill each text slot of the graphic using ONLY facts stated in the excerpt. Never invent names, numbers, places, quotes or causes. If the excerpt doesn't support a slot, return an empty string for it.

Slot guidance (match by slot name):
- Headline: the single most newsworthy fact, active voice, present tense, specific. Use single quotes for any quoted phrase. ${headlineRule({ perLine: 24, lines: 3, cap: 0 })}
- Dek / Sub: 1-2 sentences, at most 3 lines, adding who, where and the key detail the headline leaves out. You may say what police or an official said. Do not name the outlet. The Source line already credits them.
- Category: one or two words, e.g. NEWS, BREAKING, UPDATE, COURTS, POLITICS, WEATHER, CRIME, BUSINESS, COMMUNITY.
- Tags: at most 3 topic tags plus SLCSCOOP, four tags on the line. Example: "UTAH  |  PUBLIC SAFETY  |  COMMUNITY  |  SLCSCOOP".
- Location: the closest city and the state, always "Logan, UT". No county, no extra words. Do not copy the sample city in the slot example.
- Source / Credit: "Source: <name>" only if the excerpt names a photo or information source.
- Any other slot: follow its example text's role and length.

${OWN_WORDS}

Each slot has maxChars (a hard limit so it fits the layout) and an example showing its role. "caps": true means it is displayed uppercase, so write it in normal case.

Slots:
${JSON.stringify(slots, null, 1)}

${attribution(link)}
Excerpt:
"""
${excerpt}
"""

Reply with JSON only, no prose and no code fence: {"fields": {"<slot name exactly as given>": "<text>"}, "notes": "<one short sentence flagging anything unclear, unverified or missing in the excerpt, or an empty string>"}`;
}

type ZoneBudget = { role: string; x: number; y: number; w: number; h: number; perLine: number; maxLines: number; minSize: number; maxSize: number };
type LayoutRef = { id: string; storyType: string; imageUrl: string; measure: unknown; copy: { headline: string; dek: string; category: string; tags: string } };

function cleanZones(raw: unknown): ZoneBudget[] {
  if (!Array.isArray(raw)) return [];
  const out: ZoneBudget[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<ZoneBudget>;
    const role = String(row.role ?? '').slice(0, 24);
    if (!role) continue;
    out.push({
      role,
      x: Math.round(Number(row.x) || 0),
      y: Math.round(Number(row.y) || 0),
      w: Math.max(1, Math.round(Number(row.w) || 1)),
      h: Math.max(1, Math.round(Number(row.h) || 1)),
      perLine: Math.min(80, Math.max(4, Math.round(Number(row.perLine) || 24))),
      maxLines: Math.min(4, Math.max(1, Math.round(Number(row.maxLines) || 1))),
      minSize: Math.round(Number(row.minSize) || 0),
      maxSize: Math.round(Number(row.maxSize) || 0),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function cleanLayoutRefs(raw: unknown): LayoutRef[] {
  if (!Array.isArray(raw)) return [];
  const out: LayoutRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<LayoutRef> & { copy?: Partial<LayoutRef['copy']> };
    const id = String(row.id ?? '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) continue;
    const copy: Partial<LayoutRef['copy']> = row.copy && typeof row.copy === 'object' ? row.copy : {};
    out.push({
      id,
      storyType: String(row.storyType ?? '').slice(0, 24),
      imageUrl: isBlobUrl(String(row.imageUrl ?? '')) ? String(row.imageUrl) : '',
      measure: row.measure && typeof row.measure === 'object' ? row.measure : null,
      copy: {
        headline: cleanLines(copy.headline, 4, 280),
        dek: cleanLines(copy.dek, 4, 500),
        category: String(copy.category ?? '').slice(0, 40),
        tags: String(copy.tags ?? '').slice(0, 180),
      },
    });
    if (out.length >= 3) break;
  }
  return out;
}

function categoryBlock(categories: CategoryRule[]) {
  return categories
    .map((c) => `${c.id}: ${c.description} ${c.when}`.trim())
    .join('\n');
}

function measureNote(measure: unknown): string {
  if (!measure || typeof measure !== 'object') return '';
  const row = measure as { headline?: { lineCount?: unknown }; dek?: { lineCount?: unknown }; density?: unknown };
  const headline = Math.round(Number(row.headline?.lineCount) || 0);
  const dek = Math.round(Number(row.dek?.lineCount) || 0);
  const density = typeof row.density === 'string' ? row.density.replace(/\s+/g, ' ').trim().slice(0, 24) : '';
  const bits = [headline ? `${headline} headline lines` : '', dek ? `${dek} dek lines` : '', density].filter(Boolean);
  return bits.length ? `Layout: ${bits.join(', ')}.` : '';
}

function layoutPrompt(excerpt: string, zones: ZoneBudget[], categories: CategoryRule[], tags: string[], refs: LayoutRef[], voice: VoiceRef[], pageCount: number, flags: { followUp: boolean; correction: boolean }, link: { title: string; siteName: string; published: string } | null) {
  const header = headlineGuide(refs);
  const zoneText = zones
    .map((z) => z.role === 'headline'
      ? `headline: ${header.perLine} characters per line, counting spaces, and at most ${header.lines} lines.${header.cap ? ` Set at ${header.cap}px.` : ''}`
      : `${z.role}: about ${z.perLine} characters per line, up to ${z.maxLines} lines. The fitter chooses the size between ${z.minSize || '?'} and ${z.maxSize || '?'} px.`)
    .join('\n');
  const examples = refs
    .map((ref, i) => {
      const parts = [`Reference ${i + 1} id=${ref.id}${ref.storyType ? ` · ${ref.storyType}` : ''}`];
      if (ref.copy.headline) parts.push(`Headline:\n${ref.copy.headline}`);
      if (ref.copy.dek) parts.push(`Dek:\n${ref.copy.dek}`);
      if (ref.copy.category || ref.copy.tags) parts.push(`Category: ${ref.copy.category || '—'}\nTags: ${ref.copy.tags || '—'}`);
      const measured = measureNote(ref.measure);
      if (measured) parts.push(measured);
      return parts.join('\n');
    })
    .join('\n\n');
  const voiceText = voice.length
    ? voice.map((ref, i) => `Voice ${i + 1}${ref.category ? ` · ${ref.category}` : ''}\n${ref.headline}${ref.dek ? `\n${ref.dek}` : ''}`).join('\n\n')
    : '';
  return `Write one SLC Scoop post from the excerpt. You choose the words, the category, up to 3 topic tags, and which reference to follow. You do not choose font sizes, coordinates, or layer positions. A separate fitter does that.

Use only facts stated in the excerpt. Never invent names, numbers, places, quotes, or causes.

${OWN_WORDS}

${ARTICLE_RULE(link ? link.siteName : '')}

Categories — pick exactly one id from this list:
${categoryBlock(categories)}
${flags.correction ? 'The editor marked this as a correction. Set category to CORRECTION.' : 'Do not choose CORRECTION. The editor did not mark this as a correction.'}
${flags.followUp ? 'The editor marked this as a follow-up, so UPDATE is allowed when this is a new development on a story already posted.' : 'Do not choose UPDATE. The editor did not mark this as a follow-up.'}

Topic tags — pick at most 3 from this list. The fitter adds SLCSCOOP, so the line is four tags and no more:
${tags.join(', ')}
If a useful tag is missing from the list, put it in suggestedTags and do not include it in topicTags.

Text zones and the character budget at the target size:
${zoneText || 'No zones were sent.'}

${headlineRule(header)}
Give 3 headline options. Each option's lines array is those graphic lines. The dek is at most 3 lines and does not repeat the headline. Do not name the outlet in the headline or the dek.
Location is the closest city and the state, always written "Logan, UT". "Near Logan" means Logan, UT. Do not drop the comma or the UT. Use "Utah" only when the story names no city. Do not keep a sample city, the outlet's home city, or the city where an agency is based when the incident happened somewhere else. The city in the JSON example is the format only.
${pageCount > 1 ? `This template has ${pageCount} pages. Return a pages array of ${pageCount} items. Each item has its own headlines (3 options) and dek. Page 1 is the cover. Later pages continue the same story without repeating the cover headline.` : 'Return a single cover. pages may be omitted.'}

Layout references show line count, density, and spacing. Their events are not this story. Never reuse their names, numbers, places, or quotes. Follow a reference's line count only when each of your lines still fills the box. Do not copy a one-word line. Set referenceId to the reference this story should follow, or "" if none apply.
${examples ? `\n${examples}` : '\nNo layout references were sent.'}
${voiceText ? `\nVoice samples are SLC Scoop's cadence for the dek and the website article. Do not reuse their facts. Headlines still follow the headline rule.\n\n${voiceText}` : ''}

${attribution(link)}
Excerpt:
"""
${excerpt}
"""

Reply with JSON only, no prose and no code fence:
{"article":"Paragraph one.\n\nParagraph two.","category":"NEWS","categoryReason":"why this category","topicTags":["UTAH","PUBLIC SAFETY"],"suggestedTags":[],"headlines":[{"lines":["CITY DENIES THE CLAIM","AFTER 111 DAYS AT WORK"]}],"dek":"One or two sentences.","location":"Logan, UT","source":"","referenceId":"","notes":"","pages":[{"headlines":[{"lines":["CITY DENIES THE CLAIM","AFTER 111 DAYS AT WORK"]}],"dek":""}]}`;
}

async function layoutImage(url: string) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 1_200_000) return null;
    return { type: 'image' as const, source: { type: 'base64' as const, media_type: type as 'image/jpeg' | 'image/png' | 'image/webp', data: buf.toString('base64') } };
  } catch {
    return null;
  }
}

function fieldsFrom(draft: ReturnType<typeof normalizeDraft>, slots: Slot[]) {
  const headline = draft.headlines[0]?.lines.join('\n') || '';
  const tags = tagsLine(draft.topicTags);
  const byRole: Record<string, string> = {
    headline,
    title: headline,
    quote: headline,
    dek: draft.dek,
    sub: draft.dek,
    summary: draft.dek,
    supporting: draft.dek,
    category: draft.category,
    tags,
    location: draft.location,
    source: draft.source.startsWith('Source') || !draft.source ? draft.source : `Source: ${draft.source}`,
  };
  const fields: Record<string, string> = {};
  for (const slot of slots) {
    const key = slot.slot.toLowerCase();
    const role = /headline|title|quote/.test(key) ? 'headline' : /dek|sub|summary|supporting|body/.test(key) ? 'dek' : /category/.test(key) ? 'category' : /tag/.test(key) ? 'tags' : /location/.test(key) ? 'location' : /source|credit|attribution/.test(key) ? 'source' : '';
    if (role && byRole[role]) fields[slot.slot] = byRole[role].slice(0, slot.maxChars + 40);
  }
  if (!slots.length) {
    fields.Headline = headline;
    fields.Dek = draft.dek;
    fields.Category = draft.category;
    fields.Tags = tags;
    fields.Location = draft.location;
    fields.Source = byRole.source;
  }
  return fields;
}

function cleanArticle(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 7000);
}

/** The words a draft wrote, by field, for the copy check. */
function draftText(out: Record<string, unknown>, layout: boolean): Record<string, string> {
  if (!layout) {
    const fields = (out.fields && typeof out.fields === 'object' ? out.fields : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '')]));
  }
  const heads = Array.isArray(out.headlines) ? out.headlines : [];
  const pages = Array.isArray(out.pages) ? out.pages : [];
  const lines = (h: unknown) => (h && typeof h === 'object' && Array.isArray((h as { lines?: unknown }).lines) ? (h as { lines: unknown[] }).lines.join(' ') : '');
  return {
    headline: heads.map(lines).join(' / '),
    dek: [String(out.dek ?? ''), ...pages.map((p) => String((p as { dek?: unknown })?.dek ?? ''))].join(' '),
    article: String(out.article ?? ''),
  };
}

/** POST /api/scoop/draft  { excerpt, slots, references? } → { fields, notes, article, copyWarnings } */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: {
    excerpt?: unknown;
    slots?: unknown;
    references?: unknown;
    voice?: unknown;
    zones?: unknown;
    layoutRefs?: unknown;
    pageCount?: unknown;
    followUp?: unknown;
    correction?: unknown;
    categories?: unknown;
    tags?: unknown;
    link?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const excerpt = cleanArticleText(typeof body.excerpt === 'string' ? body.excerpt : '').slice(0, 12000).trim();
  const slots = (Array.isArray(body.slots) ? body.slots : [])
    .slice(0, 20)
    .filter((s): s is Slot => !!s && typeof (s as Slot).slot === 'string')
    .map((s) => ({
      slot: s.slot.slice(0, 40),
      maxChars: Math.min(Math.max(Number(s.maxChars) || 60, 8), 400),
      caps: !!s.caps,
      example: String(s.example ?? '').slice(0, 160),
    }));
  const zones = cleanZones(body.zones);
  if (excerpt.length < 40 || (!slots.length && !zones.length)) {
    return NextResponse.json({ error: 'need an excerpt and at least one text slot' }, { status: 400 });
  }

  try {
    const layout = zones.length > 0;
    const layoutRefs = layout ? cleanLayoutRefs(body.layoutRefs) : [];
    const flags = { followUp: body.followUp === true, correction: body.correction === true };
    const stored = layout ? await readBrand() : null;
    const brand = stored && (stored.categories.length || stored.tags.length)
      ? stored
      : brandFrom({ categories: body.categories, tags: body.tags });
    const voice = cleanRefs(body.voice ?? body.references).slice(0, layout ? 8 : VOICE_LIMIT);
    const link = cleanLink(body.link);
    const content: ({ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } })[] = [];
    if (layout) {
      for (const ref of layoutRefs) {
        const image = await layoutImage(ref.imageUrl);
        if (image) {
          content.push({ type: 'text', text: `Layout reference image id=${ref.id}` });
          content.push(image);
        }
      }
      content.push({
        type: 'text',
        text: layoutPrompt(excerpt, zones, brand.categories, brand.tags, layoutRefs, voice, Math.min(6, Math.max(1, Math.round(Number(body.pageCount) || 1))), flags, link),
      });
    }
    const system = layout
      ? 'You write Instagram news graphics and the website story for SLC Scoop, an independent Salt Lake City news outlet. Tagline: "Reprogramming the news." Voice: direct, factual, local, short sentences, no clickbait, no opinion, no emoji. Rewrite in that voice. Never copy a source\'s sentences. You never choose pixel sizes or coordinates. Reply with JSON only.'
      : systemPrompt(voice);
    const messages: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: layout ? content : buildPrompt(excerpt, slots, link) }];
    const ask = async (ms: number) => {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(ms),
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: layout ? 4500 : 1500, system, messages }),
      });
      const raw = await res.text();
      if (!res.ok) return { status: res.status, raw, text: '', out: null as Record<string, unknown> | null };
      const message = JSON.parse(raw) as { content?: { type: string; text?: string }[] };
      const text = (message.content ?? []).map((block) => (block.type === 'text' ? block.text ?? '' : '')).join('');
      let out: Record<string, unknown> | null = null;
      try { out = parseModelJson(text); }
      catch (error) {
        console.error('scoop draft json', error instanceof Error ? error.message : error);
      }
      return { status: res.status, raw, text, out };
    };
    const started = Date.now();
    let reply = await ask(45_000);
    if (reply.status === 200 && !reply.out) {
      messages.push({ role: 'assistant', content: reply.text.slice(0, 8000) });
      messages.push({ role: 'user', content: 'That reply was not valid JSON. Reply again with one JSON object only. Separate list items with commas. Put line breaks inside strings as \\n. No markdown fence.' });
      const again = await ask(25_000).catch(() => null);
      if (again?.out) reply = again;
    }
    if (reply.status === 429) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    if (!reply.out) {
      console.error('scoop draft failed', reply.status, reply.raw.slice(0, 500));
      return NextResponse.json({ error: 'draft_failed' }, { status: 502 });
    }
    let copied = copyReport(excerpt, draftText(reply.out, layout));
    if (copied.length && Date.now() - started < 22_000) {
      messages.push({ role: 'assistant', content: reply.text });
      messages.push({
        role: 'user',
        content: `These parts copy the source word for word:\n${copied.map((c) => `- ${c.field}: "${c.phrases.join('", "')}"`).join('\n')}\nRewrite those fields in SLC Scoop's voice, with the same facts. Keep direct quotes exact and in quotation marks. Reply with the complete JSON again, same shape.`,
      });
      const second = await ask(55_000 - (Date.now() - started)).catch(() => null);
      if (second?.out) {
        const again = copyReport(excerpt, draftText(second.out, layout));
        if (again.length <= copied.length) { reply = second; copied = again; }
      }
    }
    const out = reply.out as { fields?: Record<string, unknown>; notes?: unknown; article?: unknown };
    const copyWarnings = copied.map((c) => `${c.field} repeats the source: "${c.phrases[0]}"`);
    if (!layout) {
      const fields: Record<string, string> = {};
      for (const slot of slots) {
        const value = out.fields?.[slot.slot];
        if (typeof value === 'string') fields[slot.slot] = value.slice(0, slot.maxChars + 40);
      }
      return NextResponse.json({ fields, notes: typeof out.notes === 'string' ? out.notes : '', copyWarnings });
    }
    const draft = normalizeDraft(out, brand, flags, layoutRefs.map((ref) => ref.id));
    draft.location = incidentLocation(excerpt, draft.location);
    return NextResponse.json({
      ...draft,
      tags: tagsLine(draft.topicTags),
      fields: fieldsFrom(draft, slots),
      article: cleanArticle(out.article),
      copyWarnings,
    });
  } catch (err) {
    console.error('scoop draft failed', err);
    return NextResponse.json({ error: 'draft_failed' }, { status: 502 });
  }
}
