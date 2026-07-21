import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { deactivateClientLink, reactivateClientLink, renameClientLink } from '@/lib/client-registry';

type PatchBody = {
  action?: 'deactivate' | 'reactivate' | 'rename';
  newSlug?: string;
};

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    if (body.action === 'deactivate') {
      await deactivateClientLink(params.slug);
    } else if (body.action === 'reactivate') {
      await reactivateClientLink(params.slug);
    } else if (body.action === 'rename') {
      const newSlug = body.newSlug?.trim();
      if (!newSlug) {
        return NextResponse.json({ error: 'New slug is required.' }, { status: 400 });
      }
      await renameClientLink(params.slug, newSlug);
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 400 }
    );
  }
}
