import { del, list } from '@vercel/blob';
import { google, type drive_v3 } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { DRIVE_TMP_PREFIX, blobOptions, guard, isBlobUrl } from '@/lib/scoop';
import {
  DRIVE_FOLDER_MIME,
  DRIVE_TIMEZONE_DEFAULT,
  driveErrorReason,
  driveFolderPath,
  driveFolderUrl,
  driveMime,
  driveQuote,
  safeDriveName,
  serviceAccountFromEnv,
} from '@/lib/scoop-drive';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Saves finished posts to the SLC Scoop shared drive with SLC Scoop's own service account.
 * Only SCOOP_* variables are read, so another Google account configured on this site is never used.
 *
 * Env vars:
 *   SCOOP_DRIVE_FOLDER_ID       the shared drive's ID, or a folder inside it (required)
 *   SCOOP_DRIVE_SA_JSON         the whole service-account key file, pasted as is (or base64-encoded)
 *     or, instead of the JSON:
 *   SCOOP_DRIVE_SA_EMAIL + SCOOP_DRIVE_SA_PRIVATE_KEY
 *   SCOOP_TIMEZONE              folder dates, default America/Denver
 * The service account must be a member of the shared drive with the Content manager role.
 */
function driveConfig() {
  const { email, key } = serviceAccountFromEnv(process.env);
  const root = (process.env.SCOOP_DRIVE_FOLDER_ID || '').trim();
  const timeZone = (process.env.SCOOP_TIMEZONE || DRIVE_TIMEZONE_DEFAULT).trim();
  return { email, key, root, timeZone, ready: Boolean(email && key && root) };
}

function driveClient(cfg: ReturnType<typeof driveConfig>) {
  const auth = new google.auth.JWT({ email: cfg.email, key: cfg.key, scopes: ['https://www.googleapis.com/auth/drive'] });
  return google.drive({ version: 'v3', auth });
}

async function findChild(drive: drive_v3.Drive, parent: string, name: string, folder: boolean) {
  const q = [
    `'${driveQuote(parent)}' in parents`,
    `name = '${driveQuote(name)}'`,
    'trashed = false',
    folder ? `mimeType = '${DRIVE_FOLDER_MIME}'` : `mimeType != '${DRIVE_FOLDER_MIME}'`,
  ].join(' and ');
  const r = await drive.files.list({
    q,
    fields: 'files(id,name,webViewLink,createdTime)',
    orderBy: 'createdTime',
    pageSize: 5,
    corpora: 'allDrives',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return r.data.files?.[0] ?? null;
}

async function ensureFolder(drive: drive_v3.Drive, parent: string, name: string): Promise<string> {
  const found = await findChild(drive, parent, name, true);
  if (found?.id) return found.id;
  const made = await drive.files.create({
    requestBody: { name, mimeType: DRIVE_FOLDER_MIME, parents: [parent] },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!made.data.id) throw new Error('folder_create_failed');
  return made.data.id;
}

function isTmpBlob(url: string) {
  return isBlobUrl(url) && new URL(url).pathname.slice(1).startsWith(DRIVE_TMP_PREFIX);
}

/** Temporary copies are deleted after each save; this catches any left behind by a closed tab. */
async function sweepTmp() {
  try {
    const { blobs } = await list({ prefix: DRIVE_TMP_PREFIX, limit: 200, ...blobOptions() });
    const old = blobs.filter((b) => Date.now() - new Date(b.uploadedAt).getTime() > 6 * 3600 * 1000).map((b) => b.url);
    if (old.length) await del(old, blobOptions());
  } catch {
    /* best effort */
  }
}

/** GET /api/scoop/drive[?check=1] → { configured, email, ok?, name?, reason? } */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const cfg = driveConfig();
  if (!cfg.ready) return NextResponse.json({ configured: false }, { headers: { 'cache-control': 'no-store' } });
  const out: Record<string, unknown> = { configured: true, email: cfg.email };
  if (req.nextUrl.searchParams.get('check')) {
    try {
      const r = await driveClient(cfg).files.get({ fileId: cfg.root, fields: 'id,name,driveId', supportsAllDrives: true });
      out.ok = true;
      out.name = r.data.name || '';
      out.sharedDrive = Boolean(r.data.driveId);
      if (!r.data.driveId) {
        out.ok = false;
        out.reason = 'needs_shared_drive';
      }
    } catch (error) {
      out.ok = false;
      out.reason = driveErrorReason(error);
    }
    sweepTmp();
  }
  return NextResponse.json(out, { headers: { 'cache-control': 'no-store' } });
}

type Incoming = { name?: unknown; url?: unknown };

/** POST /api/scoop/drive { ts, files: [{ name, url }] } → { folderUrl, path, files: [{ name, url }] } */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const cfg = driveConfig();
  if (!cfg.ready) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: { ts?: unknown; files?: unknown; post?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const incoming = (Array.isArray(body.files) ? body.files : []) as Incoming[];
  const files: { name: string; url: string }[] = [];
  for (const f of incoming.slice(0, 12)) {
    const name = safeDriveName(f?.name);
    const url = typeof f?.url === 'string' ? f.url : '';
    if (!name || !isTmpBlob(url)) return NextResponse.json({ error: 'bad file' }, { status: 400 });
    files.push({ name, url });
  }
  if (!files.length) return NextResponse.json({ error: 'no files' }, { status: 400 });

  const ts = Number(body.ts);
  const post = typeof body.post === 'string' ? body.post : files[0].name.replace(/(-\d+)?\.[a-z]+$/i, '');
  const path = driveFolderPath(Number.isFinite(ts) ? ts : Date.now(), cfg.timeZone, post);
  const drive = driveClient(cfg);
  try {
    let parent = cfg.root;
    for (const part of path) parent = await ensureFolder(drive, parent, part);
    const saved: { name: string; url: string }[] = [];
    for (const f of files) {
      const r = await fetch(f.url, { cache: 'no-store' });
      if (!r.ok) throw Object.assign(new Error('temp file missing'), { code: 410 });
      const buf = Buffer.from(await r.arrayBuffer());
      const media = { mimeType: driveMime(f.name), body: Readable.from(buf) };
      // A correction re-exports the same names, so replace the file instead of adding a copy.
      const existing = await findChild(drive, parent, f.name, false);
      const res = existing?.id
        ? await drive.files.update({ fileId: existing.id, media, fields: 'id,name,webViewLink', supportsAllDrives: true })
        : await drive.files.create({
            requestBody: { name: f.name, parents: [parent] },
            media,
            fields: 'id,name,webViewLink',
            supportsAllDrives: true,
          });
      saved.push({ name: f.name, url: res.data.webViewLink || '' });
    }
    return NextResponse.json({ ok: true, folderUrl: driveFolderUrl(parent), path: path.join(' / '), files: saved });
  } catch (error) {
    const reason = driveErrorReason(error);
    console.error('scoop drive save failed', reason, error instanceof Error ? error.message : error);
    const status = reason === 'rate_limited' ? 429 : reason === 'failed' ? 502 : 403;
    return NextResponse.json({ error: reason, email: cfg.email }, { status });
  } finally {
    await del(files.map((f) => f.url), blobOptions()).catch(() => {});
  }
}
