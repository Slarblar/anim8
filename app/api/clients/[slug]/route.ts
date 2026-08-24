import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';
import { createClientSubmission, getClientPortalTasks } from '@/lib/asana';
import {
  CLIENT_STATUS_NEW_SUBMISSION,
  FIELD_CLIENT_STATUS,
  FIELD_PRIMARY_LINK,
  INTAKE_SECTION_NEW_SUBMISSIONS,
} from '@/lib/client-portal-asana-config';

export const maxDuration = 60;

// Basic per-slug throttle so a leaked link can't be used to spam Asana.
// NOTE: this Map is per serverless instance, so it's a soft limit, not a
// hard guarantee. Swap for Vercel KV / Upstash rate limiting if this route
// needs to be bulletproof.
const recentSubmissions = new Map<string, number>();
const THROTTLE_MS = 60_000;
const MAX_ATTACHMENT_URLS = 5;

function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function parseAttachmentUrls(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && isVercelBlobUrl(item))
      .slice(0, MAX_ATTACHMENT_URLS);
  } catch {
    return [];
  }
}

async function resolveClientForApi(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;

  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    const url = new URL(`/api/clients/${redirectSlug}${req.nextUrl.search}`, req.url);
    return { redirect: NextResponse.redirect(url, 308) } as const;
  }

  return { notFound: true } as const;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const resolved = await resolveClientForApi(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { client } = resolved;

  try {
    const tasks = await getClientPortalTasks(
      client.filters,
      client.intakeProjectGid
    );
    return NextResponse.json(tasks);
  } catch (err) {
    console.error('Client task fetch failed', err);
    return NextResponse.json(
      { error: 'Could not load projects.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const resolved = await resolveClientForApi(req, params.slug);
  if ('redirect' in resolved && resolved.redirect) return resolved.redirect;
  if ('notFound' in resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { client } = resolved;

  const lastSubmit = recentSubmissions.get(client.slug);
  if (lastSubmit && Date.now() - lastSubmit < THROTTLE_MS) {
    return NextResponse.json(
      { error: 'Please wait a moment before submitting again.' },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error('Client submission formData parse failed', err);
    return NextResponse.json(
      {
        error:
          'That request was too large to upload here. Try again without attachments, or paste Drive / Dropbox links instead.',
      },
      { status: 413 }
    );
  }

  const name = formData.get('name');
  const brief = formData.get('brief');
  const referenceLinks = formData.get('referenceLinks');
  const dueOn = formData.get('dueOn');
  const attachmentUrlsRaw = formData.get('attachmentUrls');

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof brief !== 'string' ||
    !brief.trim()
  ) {
    return NextResponse.json(
      { error: 'Project name and brief are required.' },
      { status: 400 }
    );
  }

  try {
    const customFields: Record<string, string> = {
      [FIELD_CLIENT_STATUS]: CLIENT_STATUS_NEW_SUBMISSION,
    };
    for (const filter of client.filters) {
      customFields[filter.fieldGid] = filter.optionGid;
    }

    const linkText =
      typeof referenceLinks === 'string' ? referenceLinks.trim() : '';
    const attachmentUrls = parseAttachmentUrls(attachmentUrlsRaw);
    const primary = (linkText || attachmentUrls[0] || '').slice(0, 1024);
    if (primary) {
      customFields[FIELD_PRIMARY_LINK] = primary;
    }

    const noteParts = [brief.trim()];
    if (linkText) noteParts.push(`Primary link:\n${linkText}`);
    if (attachmentUrls.length > 0) {
      noteParts.push(
        `Attachments:\n${attachmentUrls.map((url, index) => `${index + 1}. ${url}`).join('\n')}`
      );
    }

    await createClientSubmission({
      name: `[${client.displayName}] ${name.trim()}`,
      notes: noteParts.join('\n\n'),
      dueOn: typeof dueOn === 'string' && dueOn ? dueOn : undefined,
      projectGid: client.intakeProjectGid,
      sectionGid: INTAKE_SECTION_NEW_SUBMISSIONS,
      customFields,
    });

    recentSubmissions.set(client.slug, Date.now());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Client submission failed', err);
    return NextResponse.json(
      { error: 'Something went wrong on our end. Please try again.' },
      { status: 500 }
    );
  }
}
