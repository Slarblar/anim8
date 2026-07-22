import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { buildAdminKpiBoard } from '@/lib/admin-kpi';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const people = await buildAdminKpiBoard();
    return NextResponse.json({ people });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load KPI board.' },
      { status: 500 }
    );
  }
}
