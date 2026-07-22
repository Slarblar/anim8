import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getKPIDataForUser } from '@/lib/kpi';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const summary = await getKPIDataForUser(session.email);
    return NextResponse.json({ summary, email: session.email });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load KPI data.' },
      { status: 500 }
    );
  }
}
