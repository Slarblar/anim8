import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { getClientRecordForAdmin } from '@/lib/client-registry';
import { getClientTaskLinks } from '@/lib/asana';

/** On-demand lookup — admin clicking "View in Asana" for a specific client. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClientRecordForAdmin(params.slug);
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

  try {
    const links = await getClientTaskLinks(client.filters, client.intakeProjectGid);
    return NextResponse.json({ links });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load Asana tasks.' },
      { status: 500 }
    );
  }
}
