import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { ASSET_PREFIX, blobNotConfigured, blobOptions, blobToken, guard, isBlobUrl } from '@/lib/scoop';

export const dynamic = 'force-dynamic';

/** Browser uploads go straight to Blob, so this can exceed the 4.5 MB function body cap. */
const MAX_BYTES = 25 * 1024 * 1024;

const EXT_TYPES: Record<string, string[]> = {
  png: ['image/png', 'application/octet-stream'],
  webp: ['image/webp', 'application/octet-stream'],
  jpg: ['image/jpeg', 'image/jpg', 'application/octet-stream'],
  jpeg: ['image/jpeg', 'image/jpg', 'application/octet-stream'],
  svg: ['image/svg+xml', 'application/octet-stream'],
  ttf: ['font/ttf', 'application/x-font-ttf', 'application/octet-stream'],
  otf: ['font/otf', 'application/x-font-otf', 'application/vnd.ms-opentype', 'application/octet-stream'],
  woff: ['font/woff', 'application/font-woff', 'application/octet-stream'],
  woff2: ['font/woff2', 'application/octet-stream'],
};

function assetExtension(pathname: string): string | null {
  if (!pathname.startsWith(ASSET_PREFIX)) return null;
  const name = pathname.slice(ASSET_PREFIX.length);
  if (!name || name.length > 96 || /[\\/]|\.\./.test(name)) return null;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPES[ext] ? ext : null;
}

/** POST /api/scoop/assets — issues a client upload token. The file never passes through this function. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (body.type === 'blob.generate-client-token') {
    if (!assetExtension(body.payload.pathname)) {
      return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
    }
    if (!blobToken()) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      ...blobOptions(),
      onBeforeGenerateToken: async (pathname) => {
        const ext = assetExtension(pathname);
        if (!ext) throw new Error('unsupported_type');
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_BYTES,
          allowedContentTypes: EXT_TYPES[ext],
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    if (blobNotConfigured(error)) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : '';
    if (/unsupported_type/.test(message)) {
      return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
    }
    console.error('scoop asset token failed', error);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }
}

/** DELETE /api/scoop/assets?url=<blob url> */
export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const url = req.nextUrl.searchParams.get('url') || '';
  if (!isBlobUrl(url) || !new URL(url).pathname.slice(1).startsWith(ASSET_PREFIX)) {
    return NextResponse.json({ error: 'bad url' }, { status: 400 });
  }
  await del(url, blobOptions());
  return NextResponse.json({ ok: true });
}
