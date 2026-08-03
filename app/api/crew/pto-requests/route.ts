import { NextRequest, NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoPtoRequests, isCrewDemoUser } from '@/lib/crew-demo';
import { createPtoRequest, listPtoRequestsForEmployee } from '@/lib/pto-requests';
import { notifyAdminsNewPtoRequest } from '@/lib/crew-notify';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    return NextResponse.json({ requests: getDemoPtoRequests(session.email) });
  }

  const requests = await listPtoRequestsForEmployee(session.email);
  return NextResponse.json({ requests });
}

type CreateBody = {
  type?: 'PTO' | 'WFH';
  startDate?: string;
  endDate?: string;
  note?: string;
};

export async function POST(req: NextRequest) {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isCrewDemoUser(session.email)) {
    return NextResponse.json(
      { error: 'Demo preview — new PTO/WFH requests are not saved for this account.' },
      { status: 400 }
    );
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (body.type !== 'PTO' && body.type !== 'WFH') {
    return NextResponse.json({ error: 'Type must be PTO or WFH.' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
  }

  try {
    const request = await createPtoRequest({
      employeeEmail: session.email,
      employeeName: session.name,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      note: body.note ?? '',
    });

    // Best-effort — a missing/misconfigured Resend key shouldn't block the
    // request itself from being submitted. Awaited (not fire-and-forget)
    // because Vercel can freeze the function the instant the response is
    // sent, which would silently drop an un-awaited background send.
    try {
      await notifyAdminsNewPtoRequest(request);
    } catch {
      // Swallow — the request was already saved successfully.
    }

    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit request.' },
      { status: 400 }
    );
  }
}
