import { NextRequest, NextResponse } from 'next/server';
import { approveClientEstimate } from '@/lib/asana';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';

async function resolveClient(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;

  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    const url = new URL(
      req.url.replace(`/clients/${slug}/`, `/clients/${redirectSlug}/`)
    );
    return { redirect: NextResponse.redirect(url, 308) } as const;
  }

  return { notFound: true } as const;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; taskGid: string } }
) {
  const resolved = await resolveClient(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { client } = resolved;

  try {
    await approveClientEstimate(params.taskGid, client.filters, client.displayName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Approval failed';
    const status = message === 'Task not found' ? 404 : message === 'Estimate not ready' ? 400 : 500;
    console.error('Client approve failed', err);
    return NextResponse.json({ error: message }, { status });
  }
}
