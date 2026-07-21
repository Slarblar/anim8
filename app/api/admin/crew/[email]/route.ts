import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { setCrewMemberActive } from '@/lib/crew-directory';

type PatchBody = { active?: boolean };

export async function PATCH(req: NextRequest, { params }: { params: { email: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: '"active" must be a boolean.' }, { status: 400 });
  }

  try {
    // Next.js already URL-decodes dynamic route params.
    await setCrewMemberActive(params.email, body.active);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 400 }
    );
  }
}
