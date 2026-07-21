import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth-guards';
import { getCustomFieldEnumOptions } from '@/lib/asana';
import { FIELD_DESIGN_CLIENTS } from '@/lib/client-portal-asana-config';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const options = await getCustomFieldEnumOptions(FIELD_DESIGN_CLIENTS);
    return NextResponse.json({ options: options.filter((option) => option.enabled) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load Asana options.' },
      { status: 500 }
    );
  }
}
