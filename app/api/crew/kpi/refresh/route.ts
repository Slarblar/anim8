import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoKpiSummary, isCrewDemoUser } from '@/lib/crew-demo';
import { getKPIDataForUser, getKpiFetchedAt } from '@/lib/kpi';

/** Manual "refresh now" button — busts the 15-minute Asana cache and re-fetches. */
export async function POST() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    return NextResponse.json({ summary: getDemoKpiSummary(session.email) });
  }

  try {
    revalidateTag('kpi');
    const [summary, fetchedAt] = await Promise.all([
      getKPIDataForUser(session.email),
      getKpiFetchedAt(),
    ]);
    return NextResponse.json({ summary, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
