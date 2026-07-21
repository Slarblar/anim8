import { NextRequest, NextResponse } from 'next/server';
import { getClientOwnedTask, rejectClientEstimate } from '@/lib/asana';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';
import { notifyClientPortalTeam } from '@/lib/client-portal-notify';

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

  let body: { reason?: string; contactEmail?: string };
  try {
    body = (await req.json()) as { reason?: string; contactEmail?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return NextResponse.json({ error: 'Please share a reason for rejecting.' }, { status: 400 });
  }

  const contactEmail =
    typeof body.contactEmail === 'string' && body.contactEmail.trim()
      ? body.contactEmail.trim()
      : client.contactEmail;

  try {
    const task = await getClientOwnedTask(params.taskGid, client.filters);
    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await rejectClientEstimate({
      taskGid: params.taskGid,
      filters: client.filters,
      clientName: client.displayName,
      contactEmail,
      reason,
    });

    const estimateLine =
      task.billableHours != null && task.costEstimate != null
        ? `${task.billableHours} hrs · $${task.costEstimate.toLocaleString('en-US')}`
        : 'Estimate pending';

    await notifyClientPortalTeam({
      subject: `[Client portal] ${client.displayName} rejected: ${task.name}`,
      replyTo: contactEmail,
      body: [
        `${client.displayName} rejected a project estimate via the client portal.`,
        '',
        `Project: ${task.name}`,
        `Estimate: ${estimateLine}`,
        `Reason: ${reason}`,
        contactEmail ? `Contact: ${contactEmail}` : null,
        task.permalink_url ? `Asana: ${task.permalink_url}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Client reject failed', err);
    return NextResponse.json({ error: 'Something went wrong on our end.' }, { status: 500 });
  }
}
