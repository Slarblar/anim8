import Image from 'next/image';
import Link from 'next/link';
import { adminEmails } from '@/lib/auth-roles';
import { requireAdminSession } from '@/lib/auth-guards';
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
 * Approve/Reject in the admin email land here first. Nothing is decided
 * until the confirmation form is posted — a GET must not approve, or mail
 * scanners decide the request before a person does.
 */
export default async function PtoDecidePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string; intent?: string; confirmed?: string; error?: string };
}) {
  const request = await getPtoRequest(params.id);
  const token = searchParams.token ?? '';
  const intent = searchParams.intent === 'approved' || searchParams.intent === 'rejected' ? searchParams.intent : null;
  const justConfirmed = searchParams.confirmed === 'approved' || searchParams.confirmed === 'rejected';
  const approverError = searchParams.error === 'approver';
  const sessionAdmin = await requireAdminSession();
  const approverChoices = adminEmails();

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
    const approved = request.status === 'approved';
    const badge = approved
      ? 'text-brand-lime border-brand-lime/30 bg-brand-lime/10'
      : 'text-brand-pink border-brand-pink/30 bg-brand-pink/10';
    const typeLabel = request.type === 'PTO' ? 'PTO' : request.type === 'WFH' ? 'WFH' : 'make-up';
    const showingConfirmation = justConfirmed && searchParams.confirmed === request.status;
    const headline = showingConfirmation
      ? approved
        ? 'Approved'
        : 'Rejected'
      : 'Already decided';
    content = (
      <>
        <span className={`mb-3 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono ${badge}`}>
          {request.status}
        </span>
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-white">{headline}</h1>
        <p className="text-sm text-text-muted">
          {showingConfirmation
            ? `${request.employeeName}'s ${typeLabel} request for ${range(request.startDate, request.endDate)} is ${request.status}.`
            : `${request.employeeName}'s ${typeLabel} request for ${range(request.startDate, request.endDate)} was already ${request.status}.`}
          {request.decidedBy ? ` ${approved ? 'Approved' : 'Rejected'} by ${request.decidedBy}` : ''}
          {request.decidedAt ? ` on ${formatBothTimeZones(request.decidedAt)}` : ''}.
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

    const confirming = intent === 'approved' || intent === 'rejected';
    content = (
      <>
        <h1 className="mb-1 text-lg font-black uppercase tracking-tight text-white">
          {confirming
            ? `${intent === 'approved' ? 'Confirm approval' : 'Confirm rejection'} — ${request.employeeName}`
            : `${typeLabel} request — ${request.employeeName}`}
        </h1>
        <p className="mb-4 text-sm text-text-muted">
          {range(request.startDate, request.endDate)}
          {request.dayPortion === 'half' ? ' · Half day' : ''}
          {request.type === 'MAKEUP' && request.lostDate ? ` · PTO day ${request.lostDate}` : ''}
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
          {approverError ? (
            <p className="rounded-lg border border-brand-pink/30 bg-brand-pink/10 px-3.5 py-2.5 text-xs text-brand-pink">
              Choose which admin is confirming this decision.
            </p>
          ) : null}
          <label htmlFor="approver" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-1.5">
            {intent === 'rejected' ? 'Rejecting as' : 'Approving as'}
          </label>
          {sessionAdmin ? (
            <>
              <input type="hidden" name="approver" value={sessionAdmin.email} />
              <p className="text-sm font-bold text-white">{sessionAdmin.name || sessionAdmin.email}</p>
            </>
          ) : (
            <select
              id="approver"
              name="approver"
              required
              defaultValue=""
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-brand-cyan/40 focus:ring-2 focus:ring-brand-cyan/15"
            >
              <option value="" disabled>
                Select your name
              </option>
              {approverChoices.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          )}
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
            {intent !== 'rejected' ? (
              <button
                type="submit"
                name="decision"
                value="approved"
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-lime/50 bg-brand-lime px-4 py-2.5 text-sm font-bold text-brand-black shadow-[0_4px_20px_rgba(124,193,66,0.25)] transition hover:brightness-110"
              >
                {intent === 'approved' ? 'Confirm approval' : 'Approve'}
              </button>
            ) : null}
            {intent !== 'approved' ? (
              <button
                type="submit"
                name="decision"
                value="rejected"
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-pink/40 bg-brand-pink/10 px-4 py-2.5 text-sm font-bold text-brand-pink transition hover:border-brand-pink/55 hover:bg-brand-pink/15"
              >
                {intent === 'rejected' ? 'Confirm rejection' : 'Reject'}
              </button>
            ) : null}
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
