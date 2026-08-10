import Image from 'next/image';
import Link from 'next/link';
import { getPtoRequest, ptoDaysForRequest, requestIsMakeupLate } from '@/lib/pto-requests';
import { getCrewMember } from '@/lib/crew-directory';
import { formatBothTimeZones } from '@/lib/timezone-format';

/**
 * Public, no-login-required page reached from the "New PTO/WFH request"
 * admin email — either the "Review and add a note first" link, or as the
 * landing/confirmation page after a direct Approve/Reject click. Security
 * comes entirely from the request's own `decisionToken` in the URL, not a
 * session — this route is intentionally outside middleware's /admin and
 * /api/admin matchers.
 *
 * This page itself only mutates via its POST form (the one-click GET
 * mutation lives in /api/pto-decide/[id] instead, used by the direct
 * email links) — see that route for why mutating on GET is an accepted
 * tradeoff there.
 */
export default async function PtoDecidePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const request = await getPtoRequest(params.id);
  const token = searchParams.token ?? '';

  const range = (start: string, end: string) => (start === end ? start : `${start} – ${end}`);

  let content: React.ReactNode;

  if (!request) {
    content = (
      <>
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">Request not found</h1>
        <p className="text-sm text-text-muted">This PTO/WFH request no longer exists.</p>
      </>
    );
  } else if (!token || token !== request.decisionToken) {
    content = (
      <>
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">Invalid or expired link</h1>
        <p className="text-sm text-text-muted">
          This link doesn&apos;t match a pending request. Review it from the{' '}
          <Link href="/admin/pto-requests" className="text-brand-cyan hover:underline">
            admin dashboard
          </Link>{' '}
          instead.
        </p>
      </>
    );
  } else if (request.status !== 'pending') {
    const badge =
      request.status === 'approved'
        ? 'text-brand-lime border-brand-lime/30 bg-brand-lime/10'
        : 'text-brand-pink border-brand-pink/30 bg-brand-pink/10';
    // The generic attribution used for the one-click email links (we can't
    // tell which of the 3 admins clicked without requiring a login) isn't
    // worth surfacing — only show a name when it was decided from the
    // authenticated admin dashboard instead.
    const decidedByName =
      request.decidedBy && request.decidedBy !== 'admin (via email link)' ? request.decidedBy : null;
    content = (
      <>
        <span className={`mb-3 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono ${badge}`}>
          {request.status}
        </span>
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">Already decided</h1>
        <p className="text-sm text-text-muted">
          {request.employeeName}&apos;s{' '}
          {request.type === 'PTO' ? 'PTO' : request.type === 'WFH' ? 'WFH' : 'make-up'} request for{' '}
          {range(request.startDate, request.endDate)} was {request.status}
          {decidedByName ? ` by ${decidedByName}` : ''}
          {request.decidedAt ? ` on ${formatBothTimeZones(request.decidedAt)}` : ''}. No further action needed.
        </p>
        {request.decisionNote ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-muted">
            &quot;{request.decisionNote}&quot;
          </p>
        ) : null}
      </>
    );
  } else {
    let balanceDays: number | null = null;
    let requestedDays: number | null = null;
    if (request.type === 'PTO') {
      requestedDays = ptoDaysForRequest(request);
      const member = await getCrewMember(request.employeeEmail);
      balanceDays = member?.ptoBalanceDays ?? null;
    }
    const overdraft = balanceDays !== null && requestedDays !== null && requestedDays > balanceDays;
    const typeLabel =
      request.type === 'PTO' ? 'PTO' : request.type === 'WFH' ? 'WFH' : 'Make-up';
    const isLate = requestIsMakeupLate(request);

    content = (
      <>
        <h1 className="mb-1 text-lg font-black uppercase tracking-tight text-white">
          {typeLabel} request — {request.employeeName}
        </h1>
        <p className="mb-4 text-sm text-text-muted">
          {range(request.startDate, request.endDate)}
          {request.dayPortion === 'half' ? ' · Half day' : ''}
          {request.type === 'MAKEUP' && request.lostDate ? ` · Making up for ${request.lostDate}` : ''}
        </p>
        {isLate ? (
          <p className="mb-4 rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
            Late — submitted with less than 14 days notice before the make-up day.
          </p>
        ) : null}
        {balanceDays !== null ? (
          <p className="mb-3 text-xs text-text-muted">
            Requesting {requestedDays} day{requestedDays === 1 ? '' : 's'} · Balance: {balanceDays} day
            {balanceDays === 1 ? '' : 's'}
          </p>
        ) : null}
        {overdraft ? (
          <p className="mb-4 rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
            ⚠ This would take {request.employeeName.split(' ')[0]}&apos;s balance negative (
            {((balanceDays ?? 0) - (requestedDays ?? 0)).toFixed(1)} days) — approve only if that&apos;s expected.
          </p>
        ) : null}
        {request.note ? (
          <p className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-muted">
            &quot;{request.note}&quot;
          </p>
        ) : null}

        <form method="POST" action={`/api/pto-decide/${request.id}`} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <label htmlFor="note" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-1.5">
            Note (optional, sent to {request.employeeName.split(' ')[0]})
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted/50 outline-none transition focus:border-brand-cyan/40 focus:ring-2 focus:ring-brand-cyan/15"
            placeholder="Optional context for the decision…"
          />
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              name="decision"
              value="approved"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-lime/50 bg-brand-lime px-4 py-2.5 text-sm font-bold text-brand-black shadow-[0_4px_20px_rgba(124,193,66,0.25)] transition hover:brightness-110"
            >
              Approve
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-pink/40 bg-brand-pink/10 px-4 py-2.5 text-sm font-bold text-brand-pink transition hover:border-brand-pink/55 hover:bg-brand-pink/15"
            >
              Reject
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        <Image
          src="/images/logos/anim-8-completewordmark-white-01.svg"
          alt="Anim-8"
          width={160}
          height={28}
          className="mx-auto mb-6 h-6 w-auto"
          priority
        />
        <div className="text-left">{content}</div>
      </div>
    </div>
  );
}
