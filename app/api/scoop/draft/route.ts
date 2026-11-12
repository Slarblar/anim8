import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';

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
    ? `\n\nVoice examples from posts SLC Scoop already published. Match their cadence, specificity, how they attribute, and what they leave out. Headline line breaks in the examples are intentional. Write a headline of 2 or 3 lines when the excerpt has enough fact to fill them, and keep a true one-line story as one line. Do not add a line that does not carry a fact from the excerpt. These events are not the story you are writing. Never reuse their names, numbers, places, or quotes.\n\n${refs
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

function buildPrompt(excerpt: string, slots: Slot[]) {
  return `Fill each text slot of the graphic using ONLY facts stated in the excerpt. Never invent names, numbers, places, quotes or causes. If the excerpt doesn't support a slot, return an empty string for it.

Slot guidance (match by slot name):
- Headline: the single most newsworthy fact, active voice, present tense, specific. Use single quotes for any quoted phrase. Put a newline between graphic lines. Aim for 2 or 3 lines when the facts support it, and stay within maxChars. A true one-line headline stays one line.
- Dek / Sub: 1-2 sentences, at most 3 lines, adding who, where and the key detail the headline leaves out. Attribute claims ("police say", "X says").
- Category: one or two words, e.g. NEWS, BREAKING, UPDATE, COURTS, POLITICS, WEATHER, CRIME, BUSINESS, COMMUNITY.
- Tags: 3-4 topic tags separated by "  |  " ending with SLCSCOOP, e.g. "UTAH  |  PUBLIC SAFETY  |  COMMUNITY  |  SLCSCOOP".
- Location: "City, UT" style (or the state's postal code if not Utah).
- Source / Credit: "Source: <name>" only if the excerpt names a photo or information source.
- Any other slot: follow its example text's role and length.

Each slot has maxChars (a hard limit so it fits the layout) and an example showing its role. "caps": true means it is displayed uppercase, so write it in normal case.

Slots:
${JSON.stringify(slots, null, 1)}

Excerpt:
"""
${excerpt}
"""

Reply with JSON only, no prose and no code fence: {"fields": {"<slot name exactly as given>": "<text>"}, "notes": "<one short sentence flagging anything unclear, unverified or missing in the excerpt, or an empty string>"}`;
}

/** POST /api/scoop/draft  { excerpt, slots, references? } → { fields, notes } */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: { excerpt?: unknown; slots?: unknown; references?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.slice(0, 12000).trim() : '';
  const slots = (Array.isArray(body.slots) ? body.slots : [])
    .slice(0, 20)
    .filter((s): s is Slot => !!s && typeof (s as Slot).slot === 'string')
    .map((s) => ({
      slot: s.slot.slice(0, 40),
      maxChars: Math.min(Math.max(Number(s.maxChars) || 60, 8), 400),
      caps: !!s.caps,
      example: String(s.example ?? '').slice(0, 160),
    }));
  if (excerpt.length < 40 || !slots.length) {
    return NextResponse.json({ error: 'need an excerpt and at least one text slot' }, { status: 400 });
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt(cleanRefs(body.references)),
        messages: [{ role: 'user', content: buildPrompt(excerpt, slots) }],
      }),
    });
    if (res.status === 429) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    const raw = await res.text();
    if (!res.ok) {
      console.error('scoop draft failed', res.status, raw.slice(0, 500));
      return NextResponse.json({ error: 'draft_failed' }, { status: 502 });
    }
    const message = JSON.parse(raw) as { content?: { type: string; text?: string }[] };
    const text = (message.content ?? []).map((block) => (block.type === 'text' ? block.text ?? '' : '')).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const out = JSON.parse(json) as { fields?: Record<string, unknown>; notes?: unknown };
    const fields: Record<string, string> = {};
    for (const slot of slots) {
      const value = out.fields?.[slot.slot];
      if (typeof value === 'string') fields[slot.slot] = value.slice(0, slot.maxChars + 40);
    }
    return NextResponse.json({ fields, notes: typeof out.notes === 'string' ? out.notes : '' });
  } catch (err) {
    console.error('scoop draft failed', err);
    return NextResponse.json({ error: 'draft_failed' }, { status: 502 });
  }
}
