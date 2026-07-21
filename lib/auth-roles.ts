/** Admin allowlist — comma-separated emails in ADMIN_EMAILS (e.g. "jordan@anim-8.xyz,chris@anim-8.xyz"). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
