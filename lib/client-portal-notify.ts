import 'server-only';

const RESEND_API = 'https://api.resend.com/emails';

/** Optional — set RESEND_API_KEY + CLIENT_PORTAL_TEAM_EMAIL in Vercel for email alerts. */
export async function notifyClientPortalTeam(input: {
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const to = process.env.CLIENT_PORTAL_TEAM_EMAIL ?? 'hello@anim-8.xyz';
  const from =
    process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Client Portal <onboarding@resend.dev>';

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: input.subject,
      text: input.body,
      reply_to: input.replyTo?.trim() || undefined,
    }),
  });

  return res.ok;
}
