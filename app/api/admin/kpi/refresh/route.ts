import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { buildAdminKpiBoard } from '@/lib/admin-kpi';

/** Manual "refresh now" — busts the 6h Asana cache and reloads the full board. */
export async function POST() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    revalidateTag('kpi');
    const people = await buildAdminKpiBoard();
    return NextResponse.json({ people });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
