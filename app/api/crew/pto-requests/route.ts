import { NextRequest, NextResponse } from 'next/server';
import { requireCrewSession } from '@/lib/auth-guards';
import { createPtoRequest, listPtoRequestsForEmployee } from '@/lib/pto-requests';

export async function GET() {
  const session = await requireCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit request.' },
      { status: 400 }
    );
  }
}
