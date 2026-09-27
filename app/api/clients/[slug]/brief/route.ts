import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';
import { deliverBrief, finalizeBrief, parseApprovedBrief, readSignedEffort, refineBrief } from '@/lib/brief-builder';
import type { BriefAnswer, BriefIntake } from '@/lib/brief-schema';

export const maxDuration = 60;

const recentSubmits = new Map<string, number>();
const SUBMIT_THROTTLE_MS = 60_000;
const MAX_LINKS = 10;
const MAX_UPLOADS = 5;

function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseIntake(value: unknown): BriefIntake | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const projectType = clip(raw.project_type, 200);
  const description = clip(raw.description, 4000);
  const dueDate = clip(raw.due_date, 10);
  if (!projectType || !description || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;

  const links = Array.isArray(raw.reference_links)
    ? raw.reference_links
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(isHttpUrl)
        .slice(0, MAX_LINKS)
    : [];
  const uploads = Array.isArray(raw.reference_uploads)
    ? raw.reference_uploads
        .filter((item): item is string => typeof item === 'string' && isVercelBlobUrl(item))
        .slice(0, MAX_UPLOADS)
    : [];

  return {
    project_type: projectType,
    description,
    due_date: dueDate,
    creative_direction: clip(raw.creative_direction, 2000),
    reference_links: links,
    reference_uploads: uploads,
  };
}

function parseAnswers(value: unknown): BriefAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: clip(item.id, 40),
      prompt: clip(item.prompt, 400),
      answer: clip(item.answer, 1000),
    }))
    .filter((item) => item.prompt && item.answer)
    .slice(0, 12);
}

async function resolveClient(req: NextRequest, slug: string) {
  const client = await getClientBySlug(slug);
  if (client) return { client } as const;
  const redirectSlug = await getClientPortalRedirect(slug);
  if (redirectSlug) {
    const url = new URL(`/api/clients/${redirectSlug}/brief${req.nextUrl.search}`, req.url);
    return { redirect: NextResponse.redirect(url, 308) } as const;
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
  let body: {
    action?: string;
    intake?: unknown;
    answers?: unknown;
    brief?: unknown;
    effortToken?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const intake = parseIntake(body.intake);
  if (!intake) {
    return NextResponse.json(
      { error: 'Tell us what we’re making, the gist, and when you need it.' },
      { status: 400 }
    );
  }
  const answers = parseAnswers(body.answers);

  try {
    if (body.action === 'refine') {
      const result = await refineBrief(intake, answers);
      return NextResponse.json(result);
    }

    if (body.action === 'finalize') {
      const result = await finalizeBrief(intake, answers);
      return NextResponse.json(result);
    }

    if (body.action === 'submit') {
      const last = recentSubmits.get(client.slug);
      if (last && Date.now() - last < SUBMIT_THROTTLE_MS) {
        return NextResponse.json(
          { error: 'Give it a second before sending another one.' },
          { status: 429 }
        );
      }

      const brief = parseApprovedBrief(body.brief);
      if (!brief) {
        return NextResponse.json(
          { error: 'It needs a name and at least one thing you’ll get.' },
          { status: 400 }
        );
      }
      const effort = typeof body.effortToken === 'string' ? await readSignedEffort(body.effortToken) : null;
      if (!effort) {
        return NextResponse.json(
          { error: 'Look it over once more, then send it.' },
          { status: 400 }
        );
      }

      const result = await deliverBrief({
        clientName: client.displayName,
        filters: client.filters,
        intake,
        brief,
        effort,
      });
      recentSubmits.set(client.slug, Date.now());
      return NextResponse.json({ ok: true, rush: result.rush });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('Brief builder failed', err);
    return NextResponse.json(
      { error: 'Something hiccuped. Try again.' },
      { status: 500 }
    );
  }
}
