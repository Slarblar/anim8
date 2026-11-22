import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { buildAdminKpiBoard } from '@/lib/admin-kpi';
import { getKpiFetchedAt } from '@/lib/kpi';

/** Manual "refresh now" — busts the 15-minute Asana cache and reloads the full board. */
export async function POST() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    revalidateTag('kpi');
    const [people, fetchedAt] = await Promise.all([buildAdminKpiBoard(), getKpiFetchedAt()]);
    return NextResponse.json({ people, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
