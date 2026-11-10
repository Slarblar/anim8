import { describe, expect, it } from 'vitest';
import {
  defaultReportExempt,
  isExemptFromReports,
  reportExemptLockReason,
} from './crew-report-eligibility';

describe('report eligibility', () => {
  it('leaves VN crew on reports until the switch is turned on', () => {
    const member = { email: 'thi.do@anim-8studios.com', location: 'VN' as const };
    expect(defaultReportExempt(member)).toBe(false);
    expect(isExemptFromReports(member)).toBe(false);
    expect(isExemptFromReports({ ...member, reportExempt: true })).toBe(true);
    expect(reportExemptLockReason(member)).toBeNull();
  });

  it('always skips US-based crew and the shared test login', () => {
    const us = { email: 'alex@anim-8studios.com', location: 'US' as const, reportExempt: false };
    expect(isExemptFromReports(us)).toBe(true);
    expect(defaultReportExempt(us)).toBe(false);
    expect(reportExemptLockReason(us)).toMatch(/US-based/);

    const test = { email: 'Hello@anim-8studios.com', location: 'VN' as const, reportExempt: false };
    expect(isExemptFromReports(test)).toBe(true);
    expect(reportExemptLockReason(test)).toMatch(/Test accounts/);
  });
});
