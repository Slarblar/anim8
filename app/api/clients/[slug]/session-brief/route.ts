import { NextRequest, NextResponse } from 'next/server';
import { getClientBySlug, getClientPortalRedirect } from '@/lib/client-registry';
import { shapeSessionBrief, type SessionFollowUp } from '@/lib/brief-builder';

export const maxDuration = 60;

const recent = new Map<string, number>();
const THROTTLE_MS = 2_000;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client) {
    const redirectSlug = await getClientPortalRedirect(params.slug);
    if (redirectSlug) {
      return NextResponse.redirect(new URL(`/api/clients/${redirectSlug}/session-brief`, req.url), 308);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const last = recent.get(client.slug);
  if (last && Date.now() - last < THROTTLE_MS) {
    return NextResponse.json({ error: 'Please wait a moment.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const facts = clip(raw.facts, 8000);
  if (!facts) return NextResponse.json({ error: 'Add a few answers before writing the brief.' }, { status: 400 });

  const followUps: SessionFollowUp[] = Array.isArray(raw.followUps)
    ? raw.followUps
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item) => ({ prompt: clip(item.prompt, 220), answer: clip(item.answer, 800) }))
        .filter((item) => item.prompt)
        .slice(0, 3)
    : [];

  try {
    recent.set(client.slug, Date.now());
    const shaped = await shapeSessionBrief({ facts, followUps });
    return NextResponse.json(shaped);
  } catch (err) {
    console.error('Session brief failed', err);
    return NextResponse.json({ error: 'Could not shape the brief.' }, { status: 500 });
  }
}
