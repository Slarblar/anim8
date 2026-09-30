import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { parseWorkInput } from '@/lib/work-bank';
import { deleteWorkPiece, updateWorkPiece } from '@/lib/work-bank-store';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = parseWorkInput(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const piece = await updateWorkPiece(params.id, parsed);
    if (!piece) return NextResponse.json({ error: 'That piece is gone.' }, { status: 404 });
    return NextResponse.json({ piece });
  } catch (err) {
    console.error('Work bank update failed', err);
    return NextResponse.json({ error: 'Could not update that piece.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const removed = await deleteWorkPiece(params.id);
    if (!removed) return NextResponse.json({ error: 'That piece is gone.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Work bank delete failed', err);
    return NextResponse.json({ error: 'Could not delete that piece.' }, { status: 500 });
  }
}
