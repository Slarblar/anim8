import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';
import { toInspoPiece } from '@/lib/work-bank';
import { listWorkPieces } from '@/lib/work-bank-store';

async function resolveClient(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;
  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    return {
      redirect: NextResponse.redirect(new URL(`/api/clients/${redirectSlug}/inspo`, req.url), 308),
    } as const;
  }
  return { notFound: true } as const;
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const resolved = await resolveClient(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pieces = (await listWorkPieces()).map(toInspoPiece);
  return NextResponse.json({ pieces });
}
