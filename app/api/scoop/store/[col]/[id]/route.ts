import { del, list, put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import {
  COLLECTIONS,
  ID_RE,
  STORE_PREFIX,
  blobNotConfigured,
  blobOptions,
  guard,
  parseDocPath,
} from '@/lib/scoop';

export const dynamic = 'force-dynamic';
const MAX_DOC_BYTES = 1024 * 1024;

type Ctx = { params: { col: string; id: string } };

function check(req: NextRequest, { params }: Ctx) {
  const denied = guard(req);
  if (denied) return denied;
  if (!COLLECTIONS.has(params.col) || !ID_RE.test(params.id)) {
    return NextResponse.json({ error: 'bad path' }, { status: 400 });
  }
  return null;
}

async function versionsOf(col: string, id: string) {
  const { blobs } = await list({
    prefix: `${STORE_PREFIX}${col}/${id}--`,
    limit: 1000,
    ...blobOptions(),
  });
  return blobs.filter((b) => parseDocPath(b.pathname, col)?.id === id);
}

/** GET /api/scoop/store/:col/:id → the newest copy of one doc, as { id, ...data }. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const bad = check(req, ctx);
  if (bad) return bad;
  const { col, id } = ctx.params;
  try {
    const versions = await versionsOf(col, id);
    let best: { url: string; ts: number } | null = null;
    for (const b of versions) {
      const p = parseDocPath(b.pathname, col);
      if (!p || p.id !== id) continue;
      if (!best || p.ts > best.ts) best = { url: b.url, ts: p.ts };
    }
    if (!best) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const r = await fetch(best.url, { cache: 'no-store' });
    if (!r.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const data = await r.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...data }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (blobNotConfigured(error)) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    console.error('scoop store read failed', error);
    return NextResponse.json({ error: 'store_failed' }, { status: 500 });
  }
}

/** PUT /api/scoop/store/:col/:id → create or replace a doc. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const bad = check(req, ctx);
  if (bad) return bad;
  const { col, id } = ctx.params;

  const text = await req.text();
  if (text.length > MAX_DOC_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return NextResponse.json({ error: 'body must be an object' }, { status: 400 });
  }

  try {
    const older = await versionsOf(col, id);
    await put(`${STORE_PREFIX}${col}/${id}--${Date.now()}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
      ...blobOptions(),
    });
    if (older.length) await del(older.map((b) => b.url), blobOptions());
  } catch (error) {
    if (blobNotConfigured(error)) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    console.error('scoop store save failed', error);
    return NextResponse.json({ error: 'store_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/scoop/store/:col/:id → remove a doc and all its versions. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const bad = check(req, ctx);
  if (bad) return bad;
  const all = await versionsOf(ctx.params.col, ctx.params.id);
  if (all.length) await del(all.map((b) => b.url), blobOptions());
  return NextResponse.json({ ok: true });
}
