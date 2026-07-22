import { NextRequest, NextResponse } from 'next/server';
import { syncCrewStatusForDate } from '@/lib/crew-status-sync';
import { studioTodayDateString } from '@/lib/studio-date';

/**
 * Vercel Cron job (see vercel.json, every 15 min) — Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically when that env var is
 * set, so this isn't reachable by the public internet.
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
    const snapshot = await syncCrewStatusForDate(studioTodayDateString());
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed.' },
      { status: 500 }
    );
  }
}
