import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/** Collections the post builder is allowed to read and write. */
export const COLLECTIONS = new Set(['library', 'templates', 'brand', 'references', 'postrefs']);
export const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Every stored JSON doc lives under this Vercel Blob prefix. */
export const STORE_PREFIX = 'scoop/store/';
export const ASSET_PREFIX = 'scoop/assets/';

/**
 * Optional shared team passcode. If SCOOP_PASSCODE is set, every API call
 * must send it in the `x-scoop-pass` header (the page asks for it once and
 * remembers it per browser). Leave it unset only behind other protection.
 */
/** Prefixed Scoop store when present, otherwise the project's shared Blob store. */
export function blobToken(): string | undefined {
  const token = process.env.SCOOP_READ_WRITE_TOKEN?.trim() || process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

export function blobOptions(): { token?: string } {
  const token = blobToken();
  return token ? { token } : {};
}

/** True when the error is a missing Blob token, so the editor can fall back to offline mode. */
export function blobNotConfigured(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /No blob credentials|BLOB_READ_WRITE_TOKEN|read-write token|blob credentials/i.test(message);
}

export function guard(req: NextRequest): NextResponse | null {
  const pass = process.env.SCOOP_PASSCODE;
  if (!pass) return null;
  const got = Buffer.from(req.headers.get('x-scoop-pass') ?? '');
  const want = Buffer.from(pass);
  if (got.length === want.length && timingSafeEqual(got, want)) return null;
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

/** Only proxy files that live in this project's public Blob store. */
export function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/**
 * Stored doc pathnames look like `scoop/store/<col>/<id>--<timestamp>-<random>.json`.
 * Every save writes a new blob and deletes the older ones, so the CDN never
 * serves a stale cached version of a template.
 */
export function parseDocPath(pathname: string, col: string): { id: string; ts: number } | null {
  const rest = pathname.slice(`${STORE_PREFIX}${col}/`.length);
  const m = rest.match(/^([A-Za-z0-9_-]{1,64})--(\d+)(?:-[A-Za-z0-9]+)?\.json$/);
  return m ? { id: m[1], ts: Number(m[2]) } : null;
}
