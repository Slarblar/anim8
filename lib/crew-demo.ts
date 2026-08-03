import 'server-only';
import { performanceBand, type PersonKPISummary } from './kpi-shared';
import type { CrewStatusEntry, CrewStatusSnapshot } from './crew-status-cache';
import type { PtoRequest } from './pto-requests';
import { studioTodayDateString } from './studio-date';

/**
 * Showcase / onboarding preview for the crew portal.
 * When the signed-in user is on the demo allowlist, crew APIs return rich
 * mock data so the dashboard can be walked through without seeding KV or
 * depending on live Calendar / Asana.
 *
 * Disable with CREW_DEMO=0. Extra emails via CREW_DEMO_EMAILS (comma-separated).
 */

const DEFAULT_DEMO_EMAILS = ['jordan@anim-8.xyz'];

export function isCrewDemoUser(email: string | null | undefined): boolean {
  if (!email) return false;
  if (process.env.CREW_DEMO === '0') return false;
  const extras = (process.env.CREW_DEMO_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allow = new Set([...DEFAULT_DEMO_EMAILS, ...extras]);
  return allow.has(email.trim().toLowerCase());
}

export function getDemoMe(email: string): { name: string; email: string } {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'jordan@anim-8.xyz') {
    return { name: 'Jordan Nguyen', email: normalized };
  }
  const local = normalized.split('@')[0] ?? 'Demo';
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { name: name || 'Demo User', email: normalized };
}

function monthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
}

function monthLabel(year: number, monthIndex0: number, now: Date, isCurrent: boolean): string {
  if (isCurrent) return 'Current';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return year === now.getFullYear()
    ? months[monthIndex0]
    : `${months[monthIndex0]} ${year}`;
}

function withBand(month: string, label: string, score: number) {
  return { month, label, score, band: performanceBand(score) };
}

/** Your dashboard + /crew/kpi — polished mid/high performer sample. */
export function getDemoKpiSummary(email: string): PersonKPISummary {
  const me = getDemoMe(email);
  const now = new Date();
  const scores = [62, 71, 78, 88, 74, 81, 69, 92]; // oldest → newest across YTD-ish window
  const monthly: PersonKPISummary['monthly'] = [];
  for (let i = 7; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const score = scores[7 - i] ?? 70;
    monthly.push(
      withBand(
        monthKey(ref.getFullYear(), ref.getMonth()),
        monthLabel(ref.getFullYear(), ref.getMonth(), now, i === 0),
        score
      )
    );
  }

  const lastThreeMonthly = [3, 2, 1, 0].map((i) => {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const score = scores[7 - i] ?? 70;
    return withBand(
      monthKey(ref.getFullYear(), ref.getMonth()),
      monthLabel(ref.getFullYear(), ref.getMonth(), now, i === 0),
      score
    );
  });

  const ytdMonthly = monthly.filter((m) => m.month.startsWith(String(now.getFullYear())));
  const current = lastThreeMonthly[lastThreeMonthly.length - 1]!;
  const previous = lastThreeMonthly[lastThreeMonthly.length - 2]!;
  const ytdScore =
    Math.round(
      (ytdMonthly.reduce((sum, m) => sum + m.score, 0) / Math.max(ytdMonthly.length, 1)) * 10
    ) / 10;

  return {
    name: me.name,
    email: me.email,
    ytdScore,
    ytdTasks: 47,
    currentMonthScore: current.score,
    previousMonthScore: previous.score,
    currentMonthBand: current.band,
    previousMonthBand: previous.band,
    fteRatio: 1,
    weeklyContractedHours: 40,
    employmentType: 'full_time',
    monthly,
    lastThreeMonthly,
    ytdMonthly,
    qualityRatingsLast3Months: [
      { rating: '5 - Excellent', count: 9 },
      { rating: '4 - Good', count: 6 },
      { rating: '3 - Average', count: 2 },
    ],
    collaborationRatingsLast3Months: [
      { rating: '5 - Excellent', count: 11 },
      { rating: '4 - Good', count: 5 },
      { rating: '3 - Average', count: 1 },
    ],
  };
}

export function getDemoPtoBalance() {
  return {
    balanceDays: 7,
    entitlementDays: 12,
    accruedDays: 10,
    takenDays: 3,
    adjustmentDays: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** Today board — mix of in studio / WFH / out / PTO so the status chart reads clearly. */
export function getDemoStatusSnapshot(): CrewStatusSnapshot {
  const date = studioTodayDateString();
  const entries: CrewStatusEntry[] = [
    {
      name: 'Jordan Nguyen',
      email: 'jordan@anim-8.xyz',
      status: 'in',
      location: 'US',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
    {
      name: 'Mai Tran',
      email: 'mai.tran@anim-8studios.com',
      status: 'in',
      location: 'VN',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
    {
      name: 'Alex Pham',
      email: 'alex.pham@anim-8studios.com',
      status: 'WFH',
      note: 'Fixed WFH Wednesday',
      location: 'VN',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
    {
      name: 'Sam Le',
      email: 'sam.le@anim-8studios.com',
      status: 'WFH',
      location: 'VN',
      employmentType: 'part_time',
      weeklyContractedHours: 20,
    },
    {
      name: 'Riley Vo',
      email: 'riley.vo@anim-8studios.com',
      status: 'out',
      note: 'Marked out of studio',
      location: 'VN',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
    {
      name: 'Casey Nguyen',
      email: 'casey.nguyen@anim-8studios.com',
      status: 'PTO',
      note: 'Approved leave',
      location: 'US',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
    {
      name: 'Harper Do',
      email: 'harper.do@anim-8studios.com',
      status: 'in',
      location: 'VN',
      employmentType: 'contractor',
      weeklyContractedHours: 30,
    },
    {
      name: 'Quinn Bui',
      email: 'quinn.bui@anim-8studios.com',
      status: 'in',
      location: 'VN',
      employmentType: 'full_time',
      weeklyContractedHours: 40,
    },
  ];
  return {
    date,
    updatedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Sample PTO/WFH history for the PTO page — no KV writes. */
export function getDemoPtoRequests(email: string): PtoRequest[] {
  const me = getDemoMe(email);
  const today = studioTodayDateString();
  const [y, m] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = (day: number) => `${y}-${pad(m)}-${pad(day)}`;
  // Keep dates in-range for the current month when possible; fall back safely.
  const safeDay = (day: number) => d(Math.min(Math.max(day, 1), 28));

  return [
    {
      id: 'demo-pto-pending',
      employeeEmail: me.email,
      employeeName: me.name,
      type: 'PTO',
      startDate: safeDay(18),
      endDate: safeDay(19),
      note: 'Family visit',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      decisionToken: 'demo-token-not-usable',
    },
    {
      id: 'demo-wfh-approved',
      employeeEmail: me.email,
      employeeName: me.name,
      type: 'WFH',
      startDate: safeDay(8),
      endDate: safeDay(8),
      note: 'Deep-focus day',
      status: 'approved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
      decidedBy: 'admin@anim-8.xyz',
      decisionToken: 'demo-token-not-usable',
    },
    {
      id: 'demo-pto-approved',
      employeeEmail: me.email,
      employeeName: me.name,
      type: 'PTO',
      startDate: safeDay(3),
      endDate: safeDay(4),
      note: '',
      status: 'approved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
      decidedBy: 'admin@anim-8.xyz',
      decisionToken: 'demo-token-not-usable',
    },
  ];
}

export function isDemoPtoRequestId(id: string): boolean {
  return id.startsWith('demo-');
}
