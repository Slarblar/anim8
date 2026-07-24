import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { getClientRecordForAdmin } from '@/lib/client-registry';
import { getClientPortalTasks } from '@/lib/asana';

/** On-demand lookup — admin expanding a client's card to see project progress + due dates. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClientRecordForAdmin(params.slug);
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

  try {
    const tasks = await getClientPortalTasks(client.filters, client.intakeProjectGid);
    return NextResponse.json(tasks);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load projects.' },
      { status: 500 }
    );
  }
}
