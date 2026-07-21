import 'server-only';

const RESEND_API = 'https://api.resend.com/emails';

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
