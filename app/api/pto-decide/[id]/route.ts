import { NextRequest, NextResponse } from 'next/server';
import { getPtoRequest } from '@/lib/pto-requests';
import { applyPtoDecision } from '@/lib/pto-decision';

/**
 * Token-authenticated approve/reject. No session required — see
 * lib/pto-requests.ts `decisionToken`. Two entry points:
 *
 *  - GET  (?token=...&decision=approved|rejected) — the direct one-click
 *    links in the "new PTO/WFH request" email. Mutates immediately.
 *    Deciding is idempotent (checked via existing.status !== 'pending'),
 *    so the realistic worst case if an email security scanner "clicks"
 *    this link on our behalf is a decision landing a few minutes earlier
 *    than a human would have made it — not a duplicate or broken action.
 *  - POST (form body: token, decision, note) — submitted from the
 *    /pto-decide/[id] review page, for anyone who wants to add a note
 *    before deciding.
 */
async function decide(
  req: NextRequest,
  params: { id: string },
  input: { token: string; decision: FormDataEntryValue | string | null; note?: string }
) {
  const redirectBack = () => {
    const url = new URL(`/pto-decide/${params.id}`, req.url);
    if (input.token) url.searchParams.set('token', input.token);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    return redirectBack();
  }

  const existing = await getPtoRequest(params.id);
  if (!existing || !input.token || input.token !== existing.decisionToken || existing.status !== 'pending') {
    // Invalid token, already decided, or not found — the page itself
    // explains each case, so just send them back to it.
    return redirectBack();
  }

  try {
    await applyPtoDecision({
      id: params.id,
      decision: input.decision,
      // No login on this path — anyone with the (secret, single-request)
      // link in the admin email can act, so we can't attribute a specific
      // admin. The admin dashboard is still the source of truth for
      // "who decided what" when it's done there instead.
      decidedBy: 'admin (via email link)',
      note: input.note || undefined,
    });
  } catch {
    // Fall through to the confirmation page either way — it re-reads the
    // request and will show whatever the true current state is.
  }

  return redirectBack();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const decision = req.nextUrl.searchParams.get('decision');
  return decide(req, params, { token, decision });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const token = String(formData.get('token') ?? '');
  const decision = formData.get('decision');
  const note = String(formData.get('note') ?? '').trim();
  return decide(req, params, { token, decision, note });
}
