import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { annualLeaveEntitlementDays, getCrewMember } from '@/lib/crew-directory';
import {
  backfillPtoAccrualForMember,
  computeAccruedPtoDays,
  computePtoDaysTaken,
  recomputePtoBalanceForMember,
} from '@/lib/pto-accrual';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let member = await getCrewMember(session.email);
  if (!member) {
    // Admins without a crew-directory entry have no tracked balance.
    return NextResponse.json({
      balanceDays: null,
      entitlementDays: null,
      accruedDays: null,
      takenDays: null,
      updatedAt: null,
    });
  }

  // Lazy catch-up so the crew dashboard stays accurate without waiting on cron.
  if (member.startDate) {
    try {
      const accrued = computeAccruedPtoDays(member.startDate);
      const taken = await computePtoDaysTaken(member.email);
      const expected = Math.round((accrued - taken) * 100) / 100;
      if ((member.ptoBalanceDays ?? 0) + 0.01 < expected) {
        await recomputePtoBalanceForMember(member.email);
      } else {
        await backfillPtoAccrualForMember(member.email);
      }
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
    updatedAt: member.ptoBalanceUpdatedAt,
  });
}
