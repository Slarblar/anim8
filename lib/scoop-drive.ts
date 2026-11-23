/**
 * Google Drive helpers for the post builder. Exports land in the SLC Scoop shared drive as
 *   <root>/<YYYY>/<MM Month>/<YYYY-MM-DD>/<post files>
 * dated in Utah time, so a post made at 11 p.m. doesn't file itself under tomorrow.
 */
export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
export const DRIVE_TIMEZONE_DEFAULT = 'America/Denver';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Matches the team's existing layout: 00_POSTS / 2026 / 11-November / 2026-11-20_<post> */
export function driveFolderPath(ts: number, timeZone = DRIVE_TIMEZONE_DEFAULT, post = ''): string[] {
  const when = Number.isFinite(ts) && ts > 0 ? new Date(ts) : new Date();
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(when);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: DRIVE_TIMEZONE_DEFAULT, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(when);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const y = get('year'), m = get('month'), d = get('day');
  const day = `${y}-${m}-${d}`;
  const slug = postFolderSlug(post);
  return [y, `${m}-${MONTHS[Number(m) - 1] ?? ''}`, slug ? `${day}_${slug}` : day];
}

/** Post folder suffix: lowercase words and dashes, like the existing hand-made folders. */
export function postFolderSlug(post: unknown): string {
  return String(post ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}

/** File names the builder is allowed to write: plain words, dashes, dots; png / webp / txt only. */
export function safeDriveName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const n = name.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(n) || n.includes('..')) return null;
  return /\.(png|webp|txt)$/i.test(n) ? n : null;
}

export function driveMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'text/plain';
}

/** Escapes a value for a Drive search query string literal. */
export function driveQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function driveFolderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

/** Turns a Google API failure into a reason the editor can explain to the team. */
export function driveErrorReason(error: unknown): 'no_access' | 'needs_shared_drive' | 'rate_limited' | 'failed' {
  const e = error as { code?: unknown; status?: unknown; message?: unknown; response?: { status?: unknown } };
  const status = Number(e?.code ?? e?.status ?? e?.response?.status);
  const message = String(e?.message ?? '');
  if (/storage quota|storageQuotaExceeded/i.test(message)) return 'needs_shared_drive';
  if (status === 429 || /rate limit/i.test(message)) return 'rate_limited';
  if (status === 401 || status === 403 || status === 404) return 'no_access';
  return 'failed';
}

/** Google's own error, safe to show and to log. The private key is never included. */
export function driveErrorDetail(error: unknown): string {
  const e = error as { code?: unknown; message?: unknown; response?: { data?: { error?: unknown; error_description?: unknown } } };
  const data = e?.response?.data;
  const bits = [
    e?.code != null ? String(e.code) : '',
    typeof data?.error === 'string' ? data.error : '',
    typeof data?.error_description === 'string' ? data.error_description : '',
    String(e?.message ?? ''),
  ].filter(Boolean);
  let text = Array.from(new Set(bits)).join(' · ');
  if (/DECODER|PEM|asn1|private key|no start line|bad base64/i.test(text)) text = 'The private key could not be read. Check SCOOP_DRIVE_SA_PRIVATE_KEY: one line, starting -----BEGIN PRIVATE KEY----- and ending -----END PRIVATE KEY-----\\n, with no extra quotes. ' + text;
  else if (/invalid_grant|account not found|invalid_client/i.test(text)) text = 'Google rejected the service account login. Check SCOOP_DRIVE_SA_EMAIL matches the key file, and that the key was not deleted. ' + text;
  else if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(text)) text = 'The Google Drive API is turned off for this project. Enable it in Google Cloud → APIs & Services → Library → Google Drive API (same project as the service account). ' + text;
  else if (/File not found/i.test(text)) text = 'The service account cannot see the folder. Add its email to the SLCSCOOP shared drive as Content manager, and check SCOOP_DRIVE_FOLDER_ID. ' + text;
  return text.replace(/-----BEGIN[^-]*-----[\s\S]*?-----END[^-]*-----/g, '[key]').slice(0, 400);
}

/**
 * SLC Scoop's service account from SCOOP_* env vars only. Accepts the whole JSON key file
 * (pasted raw or base64-encoded) in SCOOP_DRIVE_SA_JSON, or SCOOP_DRIVE_SA_EMAIL + SCOOP_DRIVE_SA_PRIVATE_KEY.
 */
export function serviceAccountFromEnv(env: Record<string, string | undefined>): { email: string; key: string } {
  const unescape = (k: string) => (k.includes('\\n') ? k.replace(/\\n/g, '\n') : k);
  const raw = (env.SCOOP_DRIVE_SA_JSON || '').trim();
  if (raw) {
    let text = raw;
    if (!text.startsWith('{')) {
      try {
        text = Buffer.from(text, 'base64').toString('utf8');
      } catch {
        text = '';
      }
    }
    try {
      const j = JSON.parse(text) as { client_email?: unknown; private_key?: unknown };
      const email = typeof j.client_email === 'string' ? j.client_email.trim() : '';
      const key = typeof j.private_key === 'string' ? unescape(j.private_key) : '';
      if (email && key) return { email, key };
    } catch {
      /* fall through to the separate variables */
    }
  }
  return {
    email: (env.SCOOP_DRIVE_SA_EMAIL || '').trim(),
    key: unescape(env.SCOOP_DRIVE_SA_PRIVATE_KEY || ''),
  };
}
