import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { listAllPtoRequests, listPendingPtoRequests, ptoDaysForRequest, requestIsMakeupLate } from '@/lib/pto-requests';
import { listCrewMembers } from '@/lib/crew-directory';

export async function GET(req: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const [requests, members] = await Promise.all([
    status === 'pending' ? listPendingPtoRequests() : listAllPtoRequests(),
    listCrewMembers(),
  ]);

  const balanceByEmail = new Map(members.map((member) => [member.email, member.ptoBalanceDays]));

  // Only PTO draws from the balance — WFH / make-up do not.
  const enriched = requests.map((request) => ({
    ...request,
    employeeBalanceDays: request.type === 'PTO' ? balanceByEmail.get(request.employeeEmail) ?? null : null,
    requestedDays: request.type === 'PTO' ? ptoDaysForRequest(request) : null,
    isLate: requestIsMakeupLate(request),
  }));

  return NextResponse.json({ requests: enriched });
}
