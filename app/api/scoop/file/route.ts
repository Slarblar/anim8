import { NextRequest, NextResponse } from 'next/server';
import { guard, isBlobUrl } from '@/lib/scoop';

/**
 * GET /api/scoop/file?u=<blob url>
 * Serves a library file from this origin so the canvas can export images
 * that use it (cross-origin images would taint the canvas and block export).
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const u = req.nextUrl.searchParams.get('u') || '';
  if (!isBlobUrl(u)) return NextResponse.json({ error: 'bad url' }, { status: 400 });
  const r = await fetch(u);
  if (!r.ok || !r.body) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(r.body, {
    headers: {
      'content-type': r.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'private, max-age=3600',
    },
  });
}
