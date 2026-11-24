import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/scoop';
import { applyCaptionCredit, formatCredits, readCreditFields } from '@/lib/scoop-credit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MODEL = process.env.SCOOP_MODEL?.trim() || 'claude-sonnet-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** POST /api/scoop/caption → { caption }. The article URL is never sent. */
/** SLC Scoop captions always end with exactly these hashtags. Editors can add more by hand. */
const DEFAULT_HASHTAGS = '#SLCSCOOP #UTAH';
function withDefaultHashtags(text: string): string {
  const body = text
    .split('\n')
    .filter((line) => !/^\s*(#[\w-]+\s*)+$/.test(line))
    .join('\n')
    .replace(/[ \t]+#[\w-]+(?=[ \t]*$)/gm, '')
    .trim();
  return `${body}\n\n${DEFAULT_HASHTAGS}`;
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.replace(/\r\n/g, '\n').trim().slice(0, 12000) : '';
  if (excerpt.length < 40) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const headline = clean(body.headline, 240);
  const dek = clean(body.dek, 500);
  const location = clean(body.location, 80);
  const tags = clean(body.tags, 160);
  const siteName = clean(body.siteName, 80);
  const articleTitle = clean(body.articleTitle, 200);
  const named = readCreditFields({
    infoSource: body.infoSource || siteName,
    photoCredit: body.photoCredit,
    source: body.source,
  });
  const creditLine = formatCredits(named).captionLine;
  const attribution = named.infoSource
    ? `The information is from ${named.infoSource}${articleTitle ? `, “${articleTitle}”` : ''}. When a fact appears only in that reporting, attribute it in a sentence ("${named.infoSource} reports"). Do not present those claims as SLC Scoop’s own reporting.`
    : 'Use only what the article states. If it names another source, keep that credit.';

  const prompt = `Write an Instagram caption for this SLC Scoop post.

The graphic already shows this headline: ${headline || '(none)'}
Supporting line on the graphic: ${dek || '(none)'}
Location: ${location || '(none)'}
Information came from: ${named.infoSource || '(unknown)'}
Photo credit: ${named.photoCredit || '(unknown)'}

${attribution}

Credit rules:
- "Source: <name>" is only where the information came from. "Photo: <name>" is only who took or owns the image.
- Never write "Source: Photo:", "Photo: Source:", "Source: Photo by", or any other pair of labels.
- A photographer only → the credit line is "Photo: <name>".
- An outlet only → the credit line is "Source: <name>". Use the outlet's name, not its URL.
- Both, and they differ → attribute the outlet in a sentence ("${named.infoSource || 'the outlet'} reports"). Do not write a Photo line in the caption.
- Both are the same name → one "Source:" credit.
- Neither is known → no credit line. Never invent one, and never credit SLC Scoop for someone else's reporting or photo.
- Do not write the credit line yourself. It is added after your caption.

Article:
${excerpt}

Caption rules:
- Write 2 to 4 short sentences a person can post under the image.
- Use only facts stated in the article. Do not invent names, numbers, places, quotes, or causes.
- Do not repeat the headline.
- Direct, factual, and local. No clickbait, no opinion, no emoji.
- Do not write a Source or Photo line, and do not write any hashtags. Both are added after your caption.
- Reply with the caption only.`;

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
        max_tokens: 500,
        system: 'You write Instagram captions for SLC Scoop, an independent Salt Lake City news outlet. Voice: direct, factual, local, no clickbait, no opinion, no emoji. Reply with the caption only.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.status === 429) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    const raw = await res.text();
    if (!res.ok) return NextResponse.json({ error: 'failed' }, { status: 502 });
    const message = JSON.parse(raw) as { content?: { type: string; text?: string }[] };
    const written = (message.content ?? []).map((block) => (block.type === 'text' ? block.text ?? '' : '')).join('').trim();
    const caption = withDefaultHashtags(applyCaptionCredit(written, creditLine)).slice(0, 2200);
    if (caption.length < 20) return NextResponse.json({ error: 'failed' }, { status: 502 });
    return NextResponse.json({ caption });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
