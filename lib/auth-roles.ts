/**
 * Always an admin, even when a deployment's ADMIN_EMAILS env is behind.
 * The shared studio inbox signs in on anim-8studios.com.
 */
const BUILTIN_ADMIN_EMAILS = ['admin@anim-8studios.com'];

/** Admin allowlist — ADMIN_EMAILS (comma-separated) plus BUILTIN_ADMIN_EMAILS. */
export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...BUILTIN_ADMIN_EMAILS])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
