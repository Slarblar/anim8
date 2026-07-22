import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { getAdminKpiPerson } from '@/lib/admin-kpi';

export async function GET(_req: Request, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const email = decodeURIComponent(params.email);
    const person = await getAdminKpiPerson(email);
    if (!person) {
      return NextResponse.json({ error: 'Crew member not found.' }, { status: 404 });
    }
    return NextResponse.json({ person });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load KPI profile.' },
      { status: 500 }
    );
  }
}
