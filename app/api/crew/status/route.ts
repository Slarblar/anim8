import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getCrewStatusSnapshot } from '@/lib/crew-status-cache';
import { syncCrewStatusForDate } from '@/lib/crew-status-sync';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = todayDateString();
  let snapshot = await getCrewStatusSnapshot(date);

  if (!snapshot) {
    try {
      snapshot = await syncCrewStatusForDate(date);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Could not load today\u2019s status.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ snapshot });
}
