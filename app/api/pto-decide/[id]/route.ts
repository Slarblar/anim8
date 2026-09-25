import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/auth-roles';
import { getPtoRequest } from '@/lib/pto-requests';
import { applyPtoDecision } from '@/lib/pto-decision';

/**
 * Token-authenticated approve/reject. No session required — see
 * lib/pto-requests.ts `decisionToken`.
 *
 * GET never mutates. Older admin emails linked here with
 * ?decision=approved|rejected; mail scanners were opening those links and
 * deciding the request before a person confirmed, so the follow-up page
 * always read "already decided". GET now only forwards to the confirmation
 * page. The decision itself is the POST from that page, which also records
 * which admin confirmed.
 */
function pageUrl(req: NextRequest, id: string, token: string, extra?: Record<string, string>) {
  const url = new URL(`/pto-decide/${id}`, req.url);
  if (token) url.searchParams.set('token', token);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const decision = req.nextUrl.searchParams.get('decision') ?? '';
  const intent = decision === 'approved' || decision === 'rejected' ? decision : '';
  return NextResponse.redirect(pageUrl(req, params.id, token, intent ? { intent } : undefined), { status: 303 });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const token = String(formData.get('token') ?? '');
  const decision = formData.get('decision');
  const note = String(formData.get('note') ?? '').trim();
  const approver = String(formData.get('approver') ?? '').trim().toLowerCase();

  const back = (extra?: Record<string, string>) =>
    NextResponse.redirect(pageUrl(req, params.id, token, extra), { status: 303 });

  if (decision !== 'approved' && decision !== 'rejected') {
    return back();
  }

  const existing = await getPtoRequest(params.id);
  if (!existing || !token || token !== existing.decisionToken || existing.status !== 'pending') {
    return back();
  }

  if (!isAdminEmail(approver)) {
    return back({ intent: decision, error: 'approver' });
  }

  try {
    await applyPtoDecision({
      id: params.id,
      decision,
      decidedBy: approver,
      note: note || undefined,
    });
  } catch {
    return back();
  }

  return back({ confirmed: decision });
}
