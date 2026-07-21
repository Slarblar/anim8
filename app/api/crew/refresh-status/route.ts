import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { syncCrewStatusForDate } from '@/lib/crew-status-sync';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Manual "refresh now" button — same sync logic as the cron job, on demand. */
export async function POST() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await syncCrewStatusForDate(todayDateString());
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
