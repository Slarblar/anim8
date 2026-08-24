import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';

export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;

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

  try {
    const json = await handleUpload({
      body,
      request: req,
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
      onUploadCompleted: async () => {
        // Token mint is enough — the form attaches blob URLs to the Asana task.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error('Blob client upload failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not upload file.' },
      { status: 400 }
    );
  }
}
