import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug } from '@/lib/client-registry';
import { createClientSubmission, attachFileToTask, getClientPortalTasks } from '@/lib/asana';
import {
  CLIENT_STATUS_NEW_SUBMISSION,
  FIELD_CLIENT_STATUS,
  FIELD_PRIMARY_LINK,
} from '@/lib/client-portal-asana-config';

// Basic per-slug throttle so a leaked link can't be used to spam Asana.
// NOTE: this Map is per serverless instance, so it's a soft limit, not a
// hard guarantee. Swap for Vercel KV / Upstash rate limiting if this route
// needs to be bulletproof.
const recentSubmissions = new Map<string, number>();
const THROTTLE_MS = 60_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const client = await getClientBySlug(params.slug);
  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
  const client = await getClientBySlug(params.slug);
  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const lastSubmit = recentSubmissions.get(client.slug);
  if (lastSubmit && Date.now() - lastSubmit < THROTTLE_MS) {
    return NextResponse.json(
      { error: 'Please wait a moment before submitting again.' },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const name = formData.get('name');
  const brief = formData.get('brief');
  const referenceLinks = formData.get('referenceLinks');
  const dueOn = formData.get('dueOn');
  const files = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0);

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

    if (typeof referenceLinks === 'string' && referenceLinks.trim()) {
      customFields[FIELD_PRIMARY_LINK] = referenceLinks.trim();
    }

    const task = await createClientSubmission({
      name: `[${client.displayName}] ${name.trim()}`,
      notes: brief.trim(),
      dueOn: typeof dueOn === 'string' && dueOn ? dueOn : undefined,
      projectGid: client.intakeProjectGid,
      sectionGid: client.intakeSectionGid,
      customFields,
    });

    // Sequential on purpose — Asana's attachment endpoint doesn't love bursts.
    for (const file of files.slice(0, 5)) {
      await attachFileToTask(task.gid, file);
    }

    recentSubmissions.set(client.slug, Date.now());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Client submission failed', err);
    return NextResponse.json(
      { error: 'Something went wrong on our end.' },
      { status: 500 }
    );
  }
}
