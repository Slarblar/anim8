import { NextRequest, NextResponse } from 'next/server';
import { rolloverAllMeetingAttendance } from '@/lib/crew-directory';
import { sendMonthlyAttendanceDigest } from '@/lib/crew-notify';
import { monthKeyInTimeZone } from '@/lib/pto-accrual-shared';

/**
 * Vercel Cron job (see vercel.json) — 1st of every month (01:00 UTC).
 * Snapshots last month's late/absent counts, resets counters, emails admins.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const currentMonth = monthKeyInTimeZone();
    const closed = await rolloverAllMeetingAttendance(currentMonth);
    // All rows share the closed month key when present; fall back for empty months.
    const closedMonth = closed[0]?.monthKey ?? previousMonthKey(currentMonth);
    const sent = await sendMonthlyAttendanceDigest(closed, closedMonth);
    return NextResponse.json({
      ok: true,
      sent,
      closedMonth,
      people: closed.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Monthly attendance digest failed.' },
      { status: 500 }
    );
  }
}

function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${prev.y}-${String(prev.m).padStart(2, '0')}`;
}
