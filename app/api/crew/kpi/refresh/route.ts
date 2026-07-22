import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getKPIDataForUser } from '@/lib/kpi';

/** Manual "refresh now" button — busts the 6h Asana cache and re-fetches. */
export async function POST() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    revalidateTag('kpi');
    const summary = await getKPIDataForUser(session.email);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
