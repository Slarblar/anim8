import { NextRequest, NextResponse } from 'next/server';
import { getPtoRequest } from '@/lib/pto-requests';
import { applyPtoDecision } from '@/lib/pto-decision';

/**
 * Token-authenticated approve/reject, submitted from the form on
 * /pto-decide/[id] (reached via the "New PTO/WFH request" admin email).
 * No session required — see lib/pto-requests.ts `decisionToken`.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const token = String(formData.get('token') ?? '');
  const decision = formData.get('decision');
  const note = String(formData.get('note') ?? '').trim();

  const redirectBack = () => {
    const url = new URL(`/pto-decide/${params.id}`, req.url);
    if (token) url.searchParams.set('token', token);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (decision !== 'approved' && decision !== 'rejected') {
    return redirectBack();
  }

  const existing = await getPtoRequest(params.id);
  if (!existing || !token || token !== existing.decisionToken || existing.status !== 'pending') {
    // Invalid token, already decided, or not found — the page itself
    // explains each case, so just send them back to it.
    return redirectBack();
  }

  try {
    await applyPtoDecision({
      id: params.id,
      decision,
      // No login on this path — anyone with the (secret, single-request)
      // link in the admin email can act, so we can't attribute a specific
      // admin. The admin dashboard is still the source of truth for
      // "who decided what" when it's done there instead.
      decidedBy: 'admin (via email link)',
      note: note || undefined,
    });
  } catch {
    // Fall through to the confirmation page either way — it re-reads the
    // request and will show whatever the true current state is.
  }

  return redirectBack();
}
