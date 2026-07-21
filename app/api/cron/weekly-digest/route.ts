import { NextRequest, NextResponse } from 'next/server';
import { buildWeeklyDigest } from '@/lib/weekly-digest';
import { sendWeeklyAdminDigest } from '@/lib/crew-notify';

/**
 * Vercel Cron job (see vercel.json) — Monday 01:00 UTC, which lands at
 * ~8am Vietnam time / Sunday evening US time. Sends ADMIN_EMAILS this
 * week's PTO/WFH schedule plus anything still pending approval.
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
    const digest = await buildWeeklyDigest();
    const sent = await sendWeeklyAdminDigest(digest);
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Digest failed.' },
      { status: 500 }
    );
  }
}
