import { NextRequest, NextResponse } from 'next/server';
import { guard, isBlobUrl } from '@/lib/scoop';
import { normalizeMeasure } from '@/lib/scoop-brand';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL = process.env.SCOOP_MODEL?.trim() || 'claude-sonnet-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_IMAGE = 1_600_000;

const SCHEMA = `{
  "headline": {"text": "", "lineCount": 2, "charsPerLine": [18, 16], "capHeight": 72, "fill": 0.9, "marginLeft": 60, "marginRight": 60},
  "dek": {"text": "", "lineCount": 2, "fontSize": 32, "gap": 16},
  "tag": "UTAH | PUBLIC SAFETY | SLCSCOOP",
  "category": "NEWS",
  "density": "regular"
}`;

async function imageBytes(reqBody: { imageUrl?: unknown; imageBase64?: unknown; mediaType?: unknown }) {
  if (typeof reqBody.imageBase64 === 'string' && reqBody.imageBase64.length > 40) {
    const type = String(reqBody.mediaType || 'image/jpeg');
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const data = reqBody.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    if (data.length > MAX_IMAGE * 1.4) return null;
    return { mediaType: type, data };
  }
  const url = typeof reqBody.imageUrl === 'string' ? reqBody.imageUrl : '';
  if (!isBlobUrl(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!/^image\/(jpeg|png|webp)$/.test(type)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX_IMAGE) return null;
  return { mediaType: type, data: buf.toString('base64') };
}

/** POST /api/scoop/reference/analyze  { imageUrl | imageBase64, pageW, pageH } → measured JSON */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: { imageUrl?: unknown; imageBase64?: unknown; mediaType?: unknown; pageW?: unknown; pageH?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const image = await imageBytes(body);
  if (!image) return NextResponse.json({ error: 'need an image' }, { status: 400 });
  const pageW = Math.min(4000, Math.max(100, Math.round(Number(body.pageW) || 1080)));
  const pageH = Math.min(4000, Math.max(100, Math.round(Number(body.pageH) || 1350)));

  const prompt = `Measure this finished SLC Scoop post. The image is ${pageW} by ${pageH} pixels. Report pixels in that space.

Read the headline and the dek exactly as printed, with one array entry per graphic line. Count characters on each headline line. Estimate the headline cap height in pixels, how much of its text block fills the area between the tag row and the dek (0 to 1), and the headline's left and right margins. Estimate the dek font size and the gap in pixels from the headline block's bottom to the dek's top. Read the category pill and the tag line. density is "tight", "regular", or "open".

Do not suggest new wording. Do not return coordinates of layers other than the margins and sizes named below.

Reply with JSON only, no prose and no code fence, in this shape:
${SCHEMA}`;

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
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    if (res.status === 429) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    const raw = await res.text();
    if (!res.ok) {
      console.error('scoop reference analyze failed', res.status, raw.slice(0, 400));
      return NextResponse.json({ error: 'analyze_failed' }, { status: 502 });
    }
    const message = JSON.parse(raw) as { content?: { type: string; text?: string }[] };
    const text = (message.content ?? []).map((block) => (block.type === 'text' ? block.text ?? '' : '')).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    return NextResponse.json({ measure: normalizeMeasure(JSON.parse(json)) });
  } catch (err) {
    console.error('scoop reference analyze failed', err);
    return NextResponse.json({ error: 'analyze_failed' }, { status: 502 });
  }
}
