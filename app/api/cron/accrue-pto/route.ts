import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyPtoAccrual } from '@/lib/pto-accrual';

/**
 * Vercel Cron job (see vercel.json) — 1st of every month. Grants each active
 * crew member their prorated monthly PTO accrual (Handbook 3.7).
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
    const result = await runMonthlyPtoAccrual();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Accrual failed.' },
      { status: 500 }
    );
  }
}
