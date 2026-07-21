import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { addOrUpdateCrewMember, listCrewMembers } from '@/lib/crew-directory';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await listCrewMembers();
  return NextResponse.json({ members });
}

type CreateCrewBody = {
  email?: string;
  name?: string;
  role?: string;
  startDate?: string;
  initialPtoBalanceDays?: number;
};

export async function POST(req: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateCrewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.email?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  try {
    const member = await addOrUpdateCrewMember({
      email: body.email,
      name: body.name,
      role: body.role ?? '',
      startDate: body.startDate || null,
      initialPtoBalanceDays:
        typeof body.initialPtoBalanceDays === 'number' ? body.initialPtoBalanceDays : undefined,
    });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add crew member.' },
      { status: 400 }
    );
  }
}
