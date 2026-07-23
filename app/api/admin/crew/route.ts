import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import {
  addOrUpdateCrewMember,
  listCrewMembers,
  type CrewLocation,
  type EmploymentType,
} from '@/lib/crew-directory';

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contractor'];

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
  level?: string;
  startDate?: string;
  initialPtoBalanceDays?: number;
  location?: CrewLocation;
  employmentType?: EmploymentType;
  weeklyContractedHours?: number;
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
      level: body.level ?? '',
      startDate: body.startDate || null,
      initialPtoBalanceDays:
        typeof body.initialPtoBalanceDays === 'number' ? body.initialPtoBalanceDays : undefined,
      location: body.location === 'US' || body.location === 'VN' ? body.location : undefined,
      employmentType: body.employmentType && EMPLOYMENT_TYPES.includes(body.employmentType) ? body.employmentType : undefined,
      weeklyContractedHours:
        typeof body.weeklyContractedHours === 'number' && body.weeklyContractedHours > 0
          ? body.weeklyContractedHours
          : undefined,
    });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add crew member.' },
      { status: 400 }
    );
  }
}
