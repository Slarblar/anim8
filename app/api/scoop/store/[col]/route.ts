import { del, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS, STORE_PREFIX, blobNotConfigured, blobOptions, guard, parseDocPath } from '@/lib/scoop';

export const dynamic = 'force-dynamic';

/** GET /api/scoop/store/:col → every doc in the collection as [{ id, ...data }]. */
export async function GET(req: NextRequest, { params }: { params: { col: string } }) {
  const denied = guard(req);
  if (denied) return denied;
  const { col } = params;
  if (!COLLECTIONS.has(col)) return NextResponse.json({ error: 'unknown collection' }, { status: 404 });

  const prefix = `${STORE_PREFIX}${col}/`;
  const blobs: { url: string; pathname: string }[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await list({ prefix, cursor, limit: 1000, ...blobOptions() });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (error) {
    if (blobNotConfigured(error)) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    console.error('scoop store list failed', error);
    return NextResponse.json({ error: 'store_failed' }, { status: 500 });
  }

  // Keep the newest version of each doc; clean up anything older.
  const latest = new Map<string, { url: string; ts: number }>();
  const stale: string[] = [];
  for (const b of blobs) {
    const p = parseDocPath(b.pathname, col);
    if (!p) continue;
    const cur = latest.get(p.id);
    if (!cur || p.ts > cur.ts) {
      if (cur) stale.push(cur.url);
      latest.set(p.id, { url: b.url, ts: p.ts });
    } else stale.push(b.url);
  }
  if (stale.length) del(stale, blobOptions()).catch(() => {});

  const docs = await Promise.all(
    [...latest].map(async ([id, { url }]) => {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      return { id, ...(await r.json()) };
    })
  );
  return NextResponse.json(docs.filter(Boolean), { headers: { 'cache-control': 'no-store' } });
}
