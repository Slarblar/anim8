import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { listAllPtoRequests, listPendingPtoRequests } from '@/lib/pto-requests';

export async function GET(req: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const requests = status === 'pending' ? await listPendingPtoRequests() : await listAllPtoRequests();
  return NextResponse.json({ requests });
}
