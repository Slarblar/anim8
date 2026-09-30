import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';

export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const PREFIX = 'work-bank/';

const UPLOADS_UNAVAILABLE = 'Image uploads are temporarily unavailable.';

function readWriteToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.type === 'blob.generate-client-token' && !readWriteToken()) {
    console.error('BLOB_READ_WRITE_TOKEN is not set; cannot mint work-bank upload tokens.');
    return NextResponse.json({ error: UPLOADS_UNAVAILABLE }, { status: 503 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      token: readWriteToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(PREFIX)) throw new Error('Invalid upload path.');
        return {
          addRandomSuffix: true,
          allowedContentTypes: ['image/webp'],
          maximumSizeInBytes: MAX_FILE_BYTES,
          tokenPayload: JSON.stringify({ admin: admin.email }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error('Work bank upload failed', err);
    const message = err instanceof Error ? err.message : '';
    const uploadsDown = /BLOB_READ_WRITE_TOKEN|read-write token|blob credentials/i.test(message);
    return NextResponse.json(
      { error: uploadsDown ? UPLOADS_UNAVAILABLE : 'Could not upload that image.' },
      { status: uploadsDown ? 503 : 400 }
    );
  }
}
