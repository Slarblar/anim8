import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';

export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const UPLOADS_UNAVAILABLE =
  'File uploads are temporarily unavailable. Submit without attachments, or add files in your Drive folder.';

function readWriteToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

async function resolveClient(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;
  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    return {
      redirect: NextResponse.redirect(
        new URL(`/api/clients/${redirectSlug}/blob${req.nextUrl.search}`, req.url),
        308
      ),
    } as const;
  }
  return { notFound: true } as const;
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const resolved = await resolveClient(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { client } = resolved;
  const prefix = `client-portal/${client.slug}/`;

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.type === 'blob.generate-client-token' && !readWriteToken()) {
    console.error('BLOB_READ_WRITE_TOKEN is not set; cannot mint client upload tokens.');
    return NextResponse.json({ error: UPLOADS_UNAVAILABLE }, { status: 503 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      token: readWriteToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(prefix)) {
          throw new Error('Invalid upload path.');
        }
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_BYTES,
          tokenPayload: JSON.stringify({ slug: client.slug }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error('Blob client upload failed', err);
    const message = err instanceof Error ? err.message : '';
    const uploadsDown =
      /BLOB_READ_WRITE_TOKEN|read-write token|blob credentials/i.test(message);
    return NextResponse.json(
      { error: uploadsDown ? UPLOADS_UNAVAILABLE : 'Could not upload file.' },
      { status: uploadsDown ? 503 : 400 }
    );
  }
}
