import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';

/** Lightweight "who am I" endpoint — just for the "Welcome back, {name}" greeting on the dashboard. */
export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ name: session.name, email: session.email });
}
