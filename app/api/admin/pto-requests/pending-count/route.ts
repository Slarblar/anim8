import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { countPendingPtoRequests } from '@/lib/pto-requests';

/** Lightweight poll target for the nav badge — avoids fetching/hydrating full request records. */
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const count = await countPendingPtoRequests();
  return NextResponse.json({ count });
}
