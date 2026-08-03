import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoPtoBalance, isCrewDemoUser } from '@/lib/crew-demo';
import { annualLeaveEntitlementDays, getCrewMember } from '@/lib/crew-directory';
import {
  backfillPtoAccrualForMember,
  computeAccruedPtoDays,
  computePtoDaysTaken,
} from '@/lib/pto-accrual';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    return NextResponse.json(getDemoPtoBalance());
  }

  let member = await getCrewMember(session.email);
  if (!member) {
    // Admins without a crew-directory entry have no tracked balance.
    return NextResponse.json({
      balanceDays: null,
      entitlementDays: null,
      accruedDays: null,
      takenDays: null,
      adjustmentDays: null,
      updatedAt: null,
    });
  }

  // Lazy catch-up for missing months only — never force-recompute, so admin
  // Adjust PTO corrections aren't wiped when the crew page loads.
  if (member.startDate) {
    try {
      await backfillPtoAccrualForMember(member.email);
      member = (await getCrewMember(session.email)) ?? member;
    } catch {
      // Still return whatever we have — don't block the UI on accrual.
    }
  }

  const accruedDays = computeAccruedPtoDays(member.startDate);
  const takenDays = await computePtoDaysTaken(member.email);

  return NextResponse.json({
    balanceDays: member.ptoBalanceDays,
    entitlementDays: annualLeaveEntitlementDays(member.startDate),
    accruedDays,
    takenDays,
    adjustmentDays: member.ptoAdjustmentDays ?? 0,
    updatedAt: member.ptoBalanceUpdatedAt,
  });
}
