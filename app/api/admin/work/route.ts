import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { parseWorkInput } from '@/lib/work-bank';
import { createWorkPiece, listWorkPieces } from '@/lib/work-bank-store';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pieces = await listWorkPieces();
  return NextResponse.json({ pieces });
}

export async function POST(req: NextRequest) {
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
    const piece = await createWorkPiece(parsed);
    return NextResponse.json({ piece });
  } catch (err) {
    console.error('Work bank create failed', err);
    return NextResponse.json({ error: 'Could not save that piece.' }, { status: 500 });
  }
}
