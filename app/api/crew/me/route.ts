import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoMe, isCrewDemoUser } from '@/lib/crew-demo';

/** Lightweight "who am I" endpoint — just for the "Welcome back, {name}" greeting on the dashboard. */
export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    return NextResponse.json(getDemoMe(session.email));
  }

  return NextResponse.json({ name: session.name, email: session.email });
}
