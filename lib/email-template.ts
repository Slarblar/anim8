import 'server-only';

/** Anim-8 brand palette (tailwind.config.ts `brand.*`) — kept as raw hex since email clients don't see Tailwind. */
const COLORS = {
  black: '#0f0f0f',
  cardBg: '#15161c',
  border: 'rgba(255,255,255,0.08)',
  cyan: '#38c2d6',
  lime: '#7cc142',
  pink: '#dd0b83',
  textBody: '#c7cbd6',
  textMuted: '#8b95a8',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "Bulletproof" table-based button — plain CSS buttons render inconsistently across email clients. */
export function emailButton(
  href: string,
  label: string,
  variant: 'approve' | 'reject' | 'neutral' = 'neutral'
): string {
  const bg = variant === 'approve' ? COLORS.lime : variant === 'reject' ? COLORS.cardBg : COLORS.cyan;
  const color = variant === 'reject' ? COLORS.pink : COLORS.black;
  const border = variant === 'reject' ? `2px solid ${COLORS.pink}` : `2px solid ${bg}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;margin:4px 8px 4px 0;">
  <tr>
    <td align="center" style="border-radius:8px;background:${bg};border:${border};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${color};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function warningBanner(text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
  <tr><td style="padding:10px 14px;background:rgba(221,11,131,0.12);border:1px solid rgba(221,11,131,0.35);border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.pink};">⚠ ${escapeHtml(text)}</td></tr>
</table>`;
}

export function noteBlock(text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
  <tr><td style="padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid ${COLORS.border};border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.textBody};">&ldquo;${escapeHtml(text)}&rdquo;</td></tr>
</table>`;
}

export function statLine(label: string, value: string): string {
  return `<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.textMuted};">${escapeHtml(label)}: <strong style="color:#ffffff;">${escapeHtml(value)}</strong></p>`;
}

/**
 * Wraps `bodyHtml` in the shared Anim-8 branded shell — dark card, cyan→lime
 * accent bar, wordmark, uppercase heading. `bodyHtml` is trusted (built by
 * our own template helpers), NOT raw user input — escape anything dynamic
 * with `escapeHtml` before interpolating it into `bodyHtml`.
 */
export function renderEmailHtml(input: {
  heading: string;
  bodyHtml: string;
  preheader?: string;
  footer?: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.black};">
    ${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.black};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
            <tr><td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.lime});">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 28px 4px 28px;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 22px 0;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">ANIM<span style="color:${COLORS.cyan};">-8</span></p>
                <h1 style="margin:0 0 16px 0;font-size:18px;font-weight:800;letter-spacing:-0.01em;text-transform:uppercase;color:#ffffff;">${escapeHtml(input.heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.textBody};">
                ${input.bodyHtml}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.textMuted};">${escapeHtml(input.footer ?? 'Anim-8 crew & admin portal')}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export { escapeHtml };
