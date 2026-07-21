import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import {
  adjustCrewMemberPtoBalance,
  setCrewMemberActive,
  setCrewMemberStartDate,
} from '@/lib/crew-directory';

type PatchBody = { active?: boolean; adjustBalanceDays?: number; startDate?: string | null };

export async function PATCH(req: NextRequest, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const hasActive = typeof body.active === 'boolean';
  const hasAdjustment = typeof body.adjustBalanceDays === 'number' && body.adjustBalanceDays !== 0;
  const hasStartDate = body.startDate !== undefined;

  if (!hasActive && !hasAdjustment && !hasStartDate) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    // Next.js already URL-decodes dynamic route params.
    if (hasActive) {
      await setCrewMemberActive(params.email, body.active as boolean);
    }
    let member = null;
    if (hasStartDate) {
      member = await setCrewMemberStartDate(params.email, body.startDate ?? null);
    }
    if (hasAdjustment) {
      member = await adjustCrewMemberPtoBalance(params.email, body.adjustBalanceDays as number);
    }
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 400 }
    );
  }
}
