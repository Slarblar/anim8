import 'server-only';
import { emailButton, escapeHtml, renderEmailHtml } from './email-template';
import { publicAppOrigin } from './client-portal-url';

const RESEND_API = 'https://api.resend.com/emails';

function fromAddress(): string {
  return process.env.CLIENT_PORTAL_FROM_EMAIL ?? 'Anim-8 Client Portal <onboarding@resend.dev>';
}

/** Optional — set RESEND_API_KEY + CLIENT_PORTAL_TEAM_EMAIL in Vercel for email alerts. */
export async function notifyClientPortalTeam(input: {
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const to = process.env.CLIENT_PORTAL_TEAM_EMAIL ?? 'hello@anim-8.xyz';

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject: input.subject,
      text: input.body,
      reply_to: input.replyTo?.trim() || undefined,
    }),
  });

  return res.ok;
}

export function clientPortalVerifyUrl(token: string): string {
  return `${publicAppOrigin()}/clients/verify?token=${encodeURIComponent(token)}`;
}

/** Magic link so a client can open their portal from /clients without the slug. */
export async function sendClientPortalLoginEmail(input: {
  to: string;
  displayName: string;
  token: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const verifyUrl = clientPortalVerifyUrl(input.token);
  const minutes = 30;
  const subject = 'Your Anim-8 client portal';
  const text = [
    `Open your ${input.displayName} portal at Anim-8:`,
    verifyUrl,
    '',
    `This link expires in ${minutes} minutes. If you didn't request it, you can ignore this email.`,
  ].join('\n');

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[client-portal-login] RESEND_API_KEY unset — magic link for ${input.to}: ${verifyUrl}`);
    }
    return false;
  }

  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">Use this link to open the <strong style="color:#ffffff;">${escapeHtml(input.displayName)}</strong> portal. You won't need to remember a special URL.</p>`,
    emailButton(verifyUrl, 'Open my portal'),
    `<p style="margin:16px 0 0 0;font-size:13px;color:#8b95a8;">This link expires in ${minutes} minutes. If you didn't request it, you can ignore this email.</p>`,
  ].join('');

  const html = renderEmailHtml({
    heading: 'Your client portal',
    bodyHtml,
    preheader: `Open your ${input.displayName} portal`,
    footer: 'Anim-8 client portal',
  });

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '<no body>');
    console.error(
      `[client-portal-login] Resend send failed (${res.status}) to=${input.to}: ${errorBody}`
    );
  }

  return res.ok;
}

