import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { createClientLink, listClientRecords } from '@/lib/client-registry';
import { createCustomFieldEnumOption } from '@/lib/asana';
import { FIELD_DESIGN_CLIENTS } from '@/lib/client-portal-asana-config';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clients = await listClientRecords();
  return NextResponse.json({ clients });
}

type CreateClientBody = {
  displayName?: string;
  contactEmail?: string;
  slug?: string;
  fieldOptionGid?: string;
  fieldOptionName?: string;
  driveFolderUrl?: string;
};

export async function POST(req: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateClientBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const displayName = body.displayName?.trim();
  const contactEmail = body.contactEmail?.trim();
  if (!displayName || !contactEmail) {
    return NextResponse.json(
      { error: 'Display name and contact email are required.' },
      { status: 400 }
    );
  }

  let optionGid = body.fieldOptionGid?.trim();
  const newOptionName = body.fieldOptionName?.trim();

  try {
    if (!optionGid) {
      if (!newOptionName) {
        return NextResponse.json(
          { error: 'Select an existing Asana client, or provide a name to create a new one.' },
          { status: 400 }
        );
      }
      const created = await createCustomFieldEnumOption(FIELD_DESIGN_CLIENTS, newOptionName);
      optionGid = created.gid;
    }

    const record = await createClientLink({
      displayName,
      contactEmail,
      slug: body.slug?.trim() || undefined,
      driveFolderUrl: body.driveFolderUrl,
      filters: [{ fieldGid: FIELD_DESIGN_CLIENTS, optionGid }],
    });

    return NextResponse.json({ client: record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create client.' },
      { status: 400 }
    );
  }
}
