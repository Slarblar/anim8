import { NextRequest, NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { getDemoPtoRequests, isCrewDemoUser } from '@/lib/crew-demo';
import {
  createPtoRequest,
  listPtoRequestsForEmployee,
  type DayPortion,
  type PtoRequestType,
} from '@/lib/pto-requests';
import { notifyAdminsNewPtoRequest } from '@/lib/crew-notify';
import { normalizeDayPortion } from '@/lib/pto-days';

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
  type?: PtoRequestType;
  startDate?: string;
  endDate?: string;
  note?: string;
  dayPortion?: DayPortion;
  lostDate?: string | null;
};

function isValidType(type: unknown): type is PtoRequestType {
  return type === 'PTO' || type === 'WFH' || type === 'MAKEUP';
}

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

  if (!isValidType(body.type)) {
    return NextResponse.json({ error: 'Type must be PTO, WFH, or MAKEUP.' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
  }
  if (body.type === 'MAKEUP' && !body.lostDate) {
    return NextResponse.json(
      { error: 'Make-up day requests must include the day being made up.' },
      { status: 400 }
    );
  }

  try {
    const request = await createPtoRequest({
      employeeEmail: session.email,
      employeeName: session.name,
      type: body.type,
      startDate: body.startDate,
      endDate: body.type === 'MAKEUP' ? body.startDate : body.endDate,
      note: body.note ?? '',
      dayPortion: body.type === 'MAKEUP' ? 'full' : normalizeDayPortion(body.dayPortion),
      lostDate: body.type === 'MAKEUP' ? body.lostDate : null,
    });

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
