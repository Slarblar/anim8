type CrewLocation = 'US' | 'VN';

/**
 * Shared logins that exist only to exercise /crew. They are never real
 * headcount, so staff reports skip them even if the exempt switch is off.
 * Add an email here when a new test login is created.
 */
const REPORT_TEST_ACCOUNTS = new Set(['hello@anim-8studios.com']);

export function isTestCrewAccount(email: string): boolean {
  return REPORT_TEST_ACCOUNTS.has(email.trim().toLowerCase());
}

type ReportEligibility = {
  email: string;
  location?: CrewLocation;
  /** Manual "leave this person off reports" flag. US and test logins are exempt either way. */
  reportExempt?: boolean;
};

/** Default for records saved before the switch existed. US and test logins are exempt separately. */
export function defaultReportExempt(member: ReportEligibility): boolean {
  return member.reportExempt === true;
}

/**
 * Left off every staff report. Test accounts and US-based crew always are.
 * Anyone else is exempt only when the crew-directory switch is on.
 */
export function isExemptFromReports(member: ReportEligibility): boolean {
  if (isTestCrewAccount(member.email)) return true;
  if ((member.location ?? 'VN') === 'US') return true;
  return member.reportExempt === true;
}

/** Why the switch is locked on, or null when an admin can toggle it. */
export function reportExemptLockReason(member: ReportEligibility): string | null {
  if (isTestCrewAccount(member.email)) return 'Test accounts stay off reports.';
  if ((member.location ?? 'VN') === 'US') return 'US-based crew stay off reports.';
  return null;
}
