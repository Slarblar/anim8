import { NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { syncCrewStatusForDate } from '@/lib/crew-status-sync';
import { studioTodayDateString } from '@/lib/studio-date';

/** Manual "refresh now" button — same sync logic as the cron job, on demand. */
export async function POST() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await syncCrewStatusForDate(studioTodayDateString());
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed.' },
      { status: 500 }
    );
  }
}
