import 'server-only';
import type { WeeklyDigest } from './weekly-digest';
import { countBusinessDays, type PtoRequest } from './pto-requests';
import { getCrewMember } from './crew-directory';
import { emailButton, escapeHtml, noteBlock, renderEmailHtml, statLine, warningBanner } from './email-template';

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
  html: string;
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

function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

/**
 * Optional — set RESEND_API_KEY + ADMIN_EMAILS. Fires the moment an
 * employee submits a new PTO/WFH request, with:
 *  - direct one-click Approve/Reject links (mutate immediately on GET,
 *    gated by the request's own single-use decisionToken — no login
 *    required). Approving/rejecting is idempotent (first click wins,
 *    later clicks/opens just show the already-decided state), which
 *    caps the downside of an email security scanner "pre-clicking" a
 *    link: worst case a decision lands a few minutes earlier than a
 *    human would have made it, not a duplicated/broken action.
 *  - a link to the same decision as a page with buttons, for anyone who
 *    wants to add a note before deciding.
 *  - the employee's current PTO balance and an overdraft warning if this
 *    request (PTO only — WFH doesn't draw from the balance) would take
 *    them negative.
 */
export async function notifyAdminsNewPtoRequest(request: PtoRequest): Promise<boolean> {
  const recipients = adminRecipients();
  if (recipients.length === 0) return false;

  const from = process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Crew <onboarding@resend.dev>';
  const range = formatRange(request.startDate, request.endDate);

  let balanceDays: number | null = null;
  let requestedDays: number | null = null;
  if (request.type === 'PTO') {
    requestedDays = countBusinessDays(request.startDate, request.endDate);
    try {
      const member = await getCrewMember(request.employeeEmail);
      balanceDays = member?.ptoBalanceDays ?? null;
    } catch {
      // Balance is a nice-to-have here — never block the notification on it.
    }
  }
  const overdraft = balanceDays !== null && requestedDays !== null && requestedDays > balanceDays;

  const quickApproveUrl = `${baseUrl()}/api/pto-decide/${request.id}?token=${request.decisionToken}&decision=approved`;
  const quickRejectUrl = `${baseUrl()}/api/pto-decide/${request.id}?token=${request.decisionToken}&decision=rejected`;
  const reviewPageUrl = `${baseUrl()}/pto-decide/${request.id}?token=${request.decisionToken}`;
  const dashboardUrl = `${baseUrl()}/admin/pto-requests`;

  const subject = `New ${request.type} request — ${request.employeeName}`;

  const textLines = [
    `${request.employeeName} requested ${request.type} for ${range}.`,
    request.note ? `\nNote: ${request.note}` : null,
    balanceDays !== null ? `\nCurrent balance: ${balanceDays} days · Requesting: ${requestedDays} days` : null,
    overdraft ? `\n⚠ This would take their balance negative.` : null,
    '',
    `Approve: ${quickApproveUrl}`,
    `Reject: ${quickRejectUrl}`,
    `Review (add a note first): ${reviewPageUrl}`,
    `All requests: ${dashboardUrl}`,
  ].filter((line) => line !== null);

  const bodyHtml = [
    `<p style="margin:0 0 4px 0;"><strong style="color:#ffffff;">${escapeHtml(request.employeeName)}</strong> requested <strong style="color:#ffffff;">${escapeHtml(request.type)}</strong> for <strong style="color:#ffffff;">${escapeHtml(range)}</strong>.</p>`,
    balanceDays !== null
      ? `<div style="margin:16px 0;">${statLine('Current balance', `${balanceDays} day${balanceDays === 1 ? '' : 's'}`)}${statLine('Requesting', `${requestedDays} day${requestedDays === 1 ? '' : 's'}`)}</div>`
      : '<div style="margin:16px 0 0 0;"></div>',
    overdraft
      ? warningBanner(
          `This would take ${request.employeeName.split(' ')[0]}'s balance negative (${((balanceDays ?? 0) - (requestedDays ?? 0)).toFixed(1)} days). Approve only if that's expected.`
        )
      : '',
    request.note ? noteBlock(request.note) : '',
    `<div style="margin:8px 0 18px 0;">${emailButton(quickApproveUrl, 'Approve', 'approve')}${emailButton(quickRejectUrl, 'Reject', 'reject')}</div>`,
    `<p style="margin:0;font-size:12px;color:#8b95a8;"><a href="${reviewPageUrl}" style="color:#38c2d6;text-decoration:none;">Review and add a note first</a> · <a href="${dashboardUrl}" style="color:#38c2d6;text-decoration:none;">See all requests</a></p>`,
  ].join('\n');

  return sendResendEmail({
    from,
    to: recipients,
    subject,
    text: textLines.join('\n'),
    html: renderEmailHtml({ heading: subject, preheader: textLines[0], bodyHtml }),
  });
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
  const from = process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Crew <onboarding@resend.dev>';
  const subject = `Your ${input.type} request was ${input.decision}`;
  const range = formatRange(input.startDate, input.endDate);

  const text = [
    `Hi ${input.employeeName},`,
    '',
    `Your ${input.type} request for ${range} was ${input.decision}.`,
    input.decisionNote ? `\nNote: ${input.decisionNote}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const badgeColor = input.decision === 'approved' ? '#7cc142' : '#dd0b83';
  const bodyHtml = [
    `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(input.employeeName.split(' ')[0])},</p>`,
    `<p style="margin:0 0 16px 0;">Your <strong style="color:#ffffff;">${escapeHtml(input.type)}</strong> request for <strong style="color:#ffffff;">${escapeHtml(range)}</strong> was <strong style="color:${badgeColor};text-transform:uppercase;">${escapeHtml(input.decision)}</strong>.</p>`,
    input.decisionNote ? noteBlock(input.decisionNote) : '',
  ].join('\n');

  return sendResendEmail({
    from,
    to: [input.to],
    subject,
    text,
    html: renderEmailHtml({ heading: subject, preheader: text.split('\n')[2] ?? subject, bodyHtml }),
  });
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
  const dashboardUrl = `${baseUrl()}/admin/pto-requests`;

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
      const range = formatRange(request.startDate, request.endDate);
      lines.push(`  - ${request.employeeName}: ${request.type} ${range}`);
    }
  }

  lines.push('', `Review at ${dashboardUrl}`);

  // --- HTML mirror of the same content ---
  const scheduleRowsHtml = hasAnyEntries
    ? digest.scheduleByDate
        .filter((d) => d.entries.length > 0)
        .map(
          (day) =>
            `<p style="margin:0 0 6px 0;"><strong style="color:#ffffff;">${escapeHtml(formatDigestDate(day.date))}</strong>: ${day.entries
              .map((e) => `${escapeHtml(e.name)} (${e.type === 'PTO' ? 'Out' : 'WFH'})`)
              .join(', ')}</p>`
        )
        .join('\n')
    : '<p style="margin:0;color:#8b95a8;">Nobody scheduled out or WFH this week.</p>';

  const pendingRowsHtml =
    digest.pending.length === 0
      ? '<p style="margin:0;color:#7cc142;">None 🎉</p>'
      : digest.pending
          .map(
            (r) =>
              `<p style="margin:0 0 4px 0;">${escapeHtml(r.employeeName)}: ${escapeHtml(r.type)} ${escapeHtml(formatRange(r.startDate, r.endDate))}</p>`
          )
          .join('\n');

  const bodyHtml = `
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#38c2d6;">This week's schedule</p>
    <div style="margin:0 0 20px 0;">${scheduleRowsHtml}</div>
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#38c2d6;">Pending requests</p>
    <div style="margin:0 0 18px 0;">${pendingRowsHtml}</div>
    <div>${emailButton(dashboardUrl, 'Review requests', 'neutral')}</div>
  `;

  return sendResendEmail({
    from,
    to: recipients,
    subject: `Anim-8 crew digest \u2014 week of ${formatDigestDate(digest.weekStart)}`,
    text: lines.join('\n'),
    html: renderEmailHtml({
      heading: `Week of ${formatDigestDate(digest.weekStart)}`,
      preheader: `${digest.pending.length} pending request${digest.pending.length === 1 ? '' : 's'}`,
      bodyHtml,
    }),
  });
}
