import 'server-only';
import type { WeeklyDigest } from './weekly-digest';

const RESEND_API = 'https://api.resend.com/emails';

function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

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

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text: body,
    }),
  });

  return res.ok;
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
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = adminRecipients();
  if (!apiKey || recipients.length === 0) return false;

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

  lines.push('', 'Review at /admin/pto-requests');

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `Anim-8 crew digest \u2014 week of ${formatDigestDate(digest.weekStart)}`,
      text: lines.join('\n'),
    }),
  });

  return res.ok;
}
