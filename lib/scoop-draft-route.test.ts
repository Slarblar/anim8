import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DRAFT_IMAGE_BYTES } from './scoop-draft-images';

const jpeg = Buffer.from('hello').toString('base64');
const slot = { slot: 'Headline', maxChars: 80, caps: false, example: '' };
const calls: { url: string; body: { messages: { content: unknown }[] } }[] = [];

function model(obj: unknown) {
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(obj) }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/scoop/draft/route');
  return POST(new NextRequest('http://x/api/scoop/draft', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }));
}

beforeEach(() => {
  calls.length = 0;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.SCOOP_PASSCODE;
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return model({ fields: { Headline: 'A ROAD NEAR THE CAPITOL IS CLOSED' }, notes: '', sourceText: '' });
  });
});

describe('POST /api/scoop/draft images', () => {
  it('rejects too many images, a disallowed type, and an oversized image', async () => {
    const four = await post({ excerpt: 'x'.repeat(50), slots: [slot], images: [1, 2, 3, 4].map(() => ({ mediaType: 'image/jpeg', data: jpeg })) });
    expect(four.status).toBe(400);
    expect(await four.json()).toEqual({ error: 'bad_images' });

    const svg = await post({ excerpt: 'x'.repeat(50), slots: [slot], images: [{ mediaType: 'image/svg+xml', data: jpeg }] });
    expect(svg.status).toBe(400);

    const huge = await post({
      excerpt: 'x'.repeat(50),
      slots: [slot],
      images: [{ mediaType: 'image/jpeg', data: Buffer.alloc(DRAFT_IMAGE_BYTES + 1).toString('base64') }],
    });
    expect(huge.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('accepts a screenshot with no excerpt and sends it ahead of the prompt', async () => {
    const res = await post({ excerpt: '', slots: [slot], images: [{ mediaType: 'image/jpeg', data: jpeg }] });
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.fields.Headline).toBe('A ROAD NEAR THE CAPITOL IS CLOSED');
    expect(JSON.stringify(out)).not.toContain(jpeg);
    const content = calls[0].body.messages[0].content as { type: string; source?: { media_type: string; data: string }; text?: string }[];
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg } });
    expect(content[content.length - 1].type).toBe('text');
    expect(content[content.length - 1].text).toContain('Some sources are screenshots');
    expect(content[content.length - 1].text).toContain('sourceText');
  });

  it('still requires an excerpt when no screenshot is attached', async () => {
    const res = await post({ excerpt: 'too short', slots: [slot] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'need an excerpt and at least one text slot' });
    expect(calls).toHaveLength(0);
  });

  it('checks copied wording against the screenshot transcription', async () => {
    const transcribed = 'Police closed the road after the crash near the capitol this morning';
    const copied = 'Police closed the road after the crash near the capitol';
    vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { messages: { content: unknown }[] };
      calls.push({ url, body });
      const last = body.messages[body.messages.length - 1].content;
      const askingAgain = typeof last === 'string' && last.includes(copied.toLowerCase());
      return model(askingAgain
        ? { fields: { Headline: 'CAPITOL ROAD STAYS CLOSED' }, notes: '', sourceText: transcribed }
        : { fields: { Headline: copied }, notes: 'The alert is cut off at the bottom.', sourceText: transcribed });
    });
    const res = await post({ excerpt: 'hi', slots: [slot], images: [{ mediaType: 'image/jpeg', data: jpeg }] });
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.fields.Headline).toBe('CAPITOL ROAD STAYS CLOSED');
    expect(out.sourceText).toBe(transcribed);
    expect(calls).toHaveLength(2);
    const retry = calls[1].body.messages[calls[1].body.messages.length - 1].content;
    expect(retry).toContain(copied.toLowerCase());
  });
});
