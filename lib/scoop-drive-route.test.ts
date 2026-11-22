import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the shared drive.
type Item = { id: string; name: string; mimeType: string; parents: string[]; body?: string; trashed?: boolean };
const store: { items: Item[]; seq: number; fail?: { code: number; message: string } } = { items: [], seq: 0 };
const deleted: string[] = [];
const FOLDER = 'application/vnd.google-apps.folder';

function parseQ(q: string) {
  const parent = /'([^']+)' in parents/.exec(q)?.[1];
  const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)?.[1]?.replace(/\\'/g, "'");
  const folder = q.includes(`mimeType = '${FOLDER}'`);
  return { parent, name, folder };
}
async function readBody(body: NodeJS.ReadableStream) {
  let s = '';
  for await (const c of body as AsyncIterable<Buffer>) s += c.toString();
  return s;
}
vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: class { constructor(public o: unknown) {} } },
    drive: () => ({
      files: {
        get: async ({ fileId }: { fileId: string }) => {
          if (store.fail) throw store.fail;
          return { data: { id: fileId, name: 'SLCSCOOP', driveId: 'drive1' } };
        },
        list: async ({ q }: { q: string }) => {
          if (store.fail) throw store.fail;
          const { parent, name, folder } = parseQ(q);
          const files = store.items.filter((i) => i.parents.includes(parent!) && i.name === name && (i.mimeType === FOLDER) === folder && !i.trashed);
          return { data: { files: files.map((f) => ({ id: f.id, name: f.name })) } };
        },
        create: async ({ requestBody, media }: { requestBody: { name: string; parents: string[]; mimeType?: string }; media?: { mimeType: string; body: NodeJS.ReadableStream } }) => {
          if (store.fail) throw store.fail;
          const it: Item = { id: 'id' + ++store.seq, name: requestBody.name, parents: requestBody.parents, mimeType: requestBody.mimeType || media!.mimeType };
          if (media) it.body = await readBody(media.body);
          store.items.push(it);
          return { data: { id: it.id, name: it.name, webViewLink: 'https://drive.google.com/file/d/' + it.id } };
        },
        update: async ({ fileId, media }: { fileId: string; media: { body: NodeJS.ReadableStream } }) => {
          const it = store.items.find((i) => i.id === fileId)!;
          it.body = await readBody(media.body);
          return { data: { id: it.id, name: it.name, webViewLink: 'https://drive.google.com/file/d/' + it.id } };
        },
      },
    }),
  },
}));
vi.mock('@vercel/blob', () => ({
  del: async (urls: string[] | string) => { deleted.push(...([] as string[]).concat(urls)); },
  list: async () => ({ blobs: [] }),
}));

const TMP = 'https://abc.public.blob.vercel-storage.com/scoop/drive-tmp/';
const req = (body: unknown) =>
  new (require('next/server').NextRequest)('http://x/api/scoop/drive', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  store.items = []; store.seq = 0; store.fail = undefined; deleted.length = 0;
  process.env.SCOOP_DRIVE_FOLDER_ID = 'root';
  process.env.SCOOP_DRIVE_SA_EMAIL = 'scoop@proj.iam.gserviceaccount.com';
  process.env.SCOOP_DRIVE_SA_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----';
  delete process.env.SCOOP_PASSCODE;
  vi.stubGlobal('fetch', async (url: string) => new Response('bytes of ' + url.split('/').pop()));
});

describe('POST /api/scoop/drive', () => {
  it('creates Year / Month / Day folders once and files the post there', async () => {
    const { POST } = await import('@/app/api/scoop/drive/route');
    const ts = Date.UTC(2026, 10, 21, 3); // Nov 20, 8 p.m. in Utah
    const files = [{ name: 'lake-low.png', url: TMP + 'lake-low-a1.png' }, { name: 'lake-low.webp', url: TMP + 'lake-low-a2.webp' }, { name: 'lake-low.txt', url: TMP + 'lake-low-a3.txt' }];
    const r = await POST(req({ ts, files }));
    const out = await r.json();
    expect(r.status).toBe(200);
    expect(out.path).toBe('2026 / 11-November / 2026-11-20_lake-low');
    const folders = store.items.filter((i) => i.mimeType === FOLDER).map((i) => i.name);
    expect(folders).toEqual(['2026', '11-November', '2026-11-20_lake-low']);
    const day = store.items.find((i) => i.name === '2026-11-20_lake-low')!;
    expect(out.folderUrl).toBe('https://drive.google.com/drive/folders/' + day.id);
    expect(store.items.filter((i) => i.parents.includes(day.id)).map((i) => i.name)).toEqual(['lake-low.png', 'lake-low.webp', 'lake-low.txt']);
    expect(deleted).toHaveLength(3);

    // Second post the same day reuses the folders.
    await POST(req({ ts: ts + 3600_000, files: [{ name: 'other.png', url: TMP + 'other-b.png' }] }));
    expect(store.items.filter((i) => i.mimeType === FOLDER).map((i) => i.name)).toEqual(['2026', '11-November', '2026-11-20_lake-low', '2026-11-20_other']);

    // A correction replaces the file instead of adding a duplicate.
    vi.stubGlobal('fetch', async () => new Response('corrected'));
    await POST(req({ ts, files: [{ name: 'lake-low.png', url: TMP + 'lake-low-c.png' }] }));
    const pngs = store.items.filter((i) => i.name === 'lake-low.png');
    expect(pngs).toHaveLength(1);
    expect(pngs[0].body).toBe('corrected');
  });

  it('rejects files that are not temporary export copies', async () => {
    const { POST } = await import('@/app/api/scoop/drive/route');
    const r = await POST(req({ ts: Date.now(), files: [{ name: 'x.png', url: 'https://abc.public.blob.vercel-storage.com/scoop/assets/logo.png' }] }));
    expect(r.status).toBe(400);
    const r2 = await POST(req({ ts: Date.now(), files: [{ name: '../x.png', url: TMP + 'x.png' }] }));
    expect(r2.status).toBe(400);
  });

  it('explains a missing share, and still cleans up the temp copies', async () => {
    const { POST } = await import('@/app/api/scoop/drive/route');
    store.fail = { code: 404, message: 'File not found: root.' };
    const r = await POST(req({ ts: Date.now(), files: [{ name: 'x.png', url: TMP + 'x.png' }] }));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'no_access', email: 'scoop@proj.iam.gserviceaccount.com' });
    expect(deleted).toEqual([TMP + 'x.png']);
  });

  it('reports not configured without env', async () => {
    const { POST, GET } = await import('@/app/api/scoop/drive/route');
    delete process.env.SCOOP_DRIVE_FOLDER_ID;
    expect((await POST(req({ ts: 1, files: [] }))).status).toBe(503);
    const g = await GET(new (require('next/server').NextRequest)('http://x/api/scoop/drive?check=1'));
    expect(await g.json()).toEqual({ configured: false });
  });

  it('status check confirms access to the shared drive', async () => {
    const { GET } = await import('@/app/api/scoop/drive/route');
    const g = await GET(new (require('next/server').NextRequest)('http://x/api/scoop/drive?check=1'));
    expect(await g.json()).toMatchObject({ configured: true, ok: true, name: 'SLCSCOOP', sharedDrive: true });
  });
});
