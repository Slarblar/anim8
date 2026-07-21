import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { annualLeaveEntitlementDays, getCrewMember } from '@/lib/crew-directory';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getCrewMember(session.email);
  if (!member) {
    // Admins without a crew-directory entry have no tracked balance.
    return NextResponse.json({ balanceDays: null, entitlementDays: null, updatedAt: null });
  }

  return NextResponse.json({
    balanceDays: member.ptoBalanceDays,
    entitlementDays: annualLeaveEntitlementDays(member.startDate),
    updatedAt: member.ptoBalanceUpdatedAt,
  });
}
