import 'server-only';
import type { WeeklyDigest } from './weekly-digest';
import type { PtoRequest } from './pto-requests';

const RESEND_API = 'https://api.resend.com/emails';

function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Base URL for links inside emails — see APP_BASE_URL in .env.local.example. */
function baseUrl(): string {
  return (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Thin wrapper around the Resend API that actually surfaces failures.
 * Resend returns 403 (not a network error) if `from` is still the
 * onboarding@resend.dev sandbox address and `to` isn't the Resend
 * account's own email — a very easy way for "emails are configured" to
 * silently mean "emails always fail" without this logging. Check Vercel
 * function logs for "[crew-notify]" if reports of missing emails come up
 * again — see CLIENT_PORTAL_FROM_EMAIL in .env.local.example.
 */
async function sendResendEmail(payload: {
  from: string;
  to: string[];
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '<no body>');
    console.error(
      `[crew-notify] Resend send failed (${res.status}) from="${payload.from}" to=${JSON.stringify(payload.to)}: ${errorBody}`
    );
  }

  return res.ok;
}

/**
 * Optional — set RESEND_API_KEY + ADMIN_EMAILS. Fires the moment an
 * employee submits a new PTO/WFH request, with a link to a no-login-
 * required decision page (gated by the request's own decisionToken)
 * with Approve/Reject buttons, plus a fallback link into
 * /admin/pto-requests for anyone who'd rather review it there.
 *
 * The decision link deliberately lands on a page with real buttons
 * rather than mutating on GET directly — email security scanners /
 * link-preview bots often "click" every link in a message, and a GET
 * request that immediately approved or rejected would let a bot decide
 * PTO requests by accident.
 */
export async function notifyAdminsNewPtoRequest(request: PtoRequest): Promise<boolean> {
  const recipients = adminRecipients();
  if (recipients.length === 0) return false;

  const from = process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Crew <onboarding@resend.dev>';
  const range =
    request.startDate === request.endDate ? request.startDate : `${request.startDate} – ${request.endDate}`;
  const decideUrl = `${baseUrl()}/pto-decide/${request.id}?token=${request.decisionToken}`;
  const reviewUrl = `${baseUrl()}/admin/pto-requests`;

  const subject = `New ${request.type} request — ${request.employeeName}`;
  const body = [
    `${request.employeeName} requested ${request.type} for ${range}.`,
    request.note ? `\nNote: ${request.note}` : null,
    '',
    `Approve or reject: ${decideUrl}`,
    `Review all requests: ${reviewUrl}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return sendResendEmail({ from, to: recipients, subject, text: body });
}

/** Optional — set RESEND_API_KEY in Vercel for PTO/WFH decision emails. */
export async function notifyEmployeePtoDecision(input: {
  to: string;
  employeeName: string;
  type: 'PTO' | 'WFH';
  startDate: string;
  endDate: string;
  decision: 'approved' | 'rejected';
  decisionNote?: string;
}): Promise<boolean> {
  const from =
    process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Crew <onboarding@resend.dev>';
  const subject = `Your ${input.type} request was ${input.decision}`;
  const range =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} – ${input.endDate}`;

  const body = [
    `Hi ${input.employeeName},`,
    '',
    `Your ${input.type} request for ${range} was ${input.decision}.`,
    input.decisionNote ? `\nNote: ${input.decisionNote}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return sendResendEmail({ from, to: [input.to], subject, text: body });
}

function formatDigestDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Optional — set RESEND_API_KEY + ADMIN_EMAILS for the Monday-morning digest. */
export async function sendWeeklyAdminDigest(digest: WeeklyDigest): Promise<boolean> {
  const recipients = adminRecipients();
  if (recipients.length === 0) return false;

  const from = process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Crew <onboarding@resend.dev>';

  const lines: string[] = ['This week\u2019s schedule:', ''];
  const hasAnyEntries = digest.scheduleByDate.some((day) => day.entries.length > 0);
  if (!hasAnyEntries) {
    lines.push('Nobody scheduled out or WFH this week.');
  } else {
    for (const { date, entries } of digest.scheduleByDate) {
      if (entries.length === 0) continue;
      lines.push(`${formatDigestDate(date)}:`);
      for (const entry of entries) {
        lines.push(`  - ${entry.name} (${entry.type === 'PTO' ? 'Out' : 'WFH'})`);
      }
    }
  }

  lines.push('', 'Pending requests awaiting your approval:');
  if (digest.pending.length === 0) {
    lines.push('None \u{1F389}');
  } else {
    for (const request of digest.pending) {
      const range =
        request.startDate === request.endDate
          ? request.startDate
          : `${request.startDate} \u2013 ${request.endDate}`;
      lines.push(`  - ${request.employeeName}: ${request.type} ${range}`);
    }
  }

  lines.push('', `Review at ${baseUrl()}/admin/pto-requests`);

  return sendResendEmail({
    from,
    to: recipients,
    subject: `Anim-8 crew digest \u2014 week of ${formatDigestDate(digest.weekStart)}`,
    text: lines.join('\n'),
  });
}
