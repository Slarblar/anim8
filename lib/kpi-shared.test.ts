import { describe, expect, it } from 'vitest';
import {
  buildStaffKpiCsv,
  describeKpiPull,
  describeStaffKpiPeriod,
  kpiMonthlyGoal,
  kpiPullAgoLabel,
  parseStaffKpiPeriod,
  performanceBand,
  selectableStaffKpiMonths,
  staffKpiSlice,
  type PersonKPISummary,
} from './kpi-shared';

const NOW = new Date('2026-11-09T18:00:00Z');

function summary(overrides: Partial<PersonKPISummary> = {}): PersonKPISummary {
  return {
    name: 'Thi Do',
    email: 'thi.do@anim-8studios.com',
    ytdScore: 140,
    ytdTasks: 8,
    currentMonthScore: 10,
    previousMonthScore: 90,
    currentMonthBand: 'poor',
    previousMonthBand: 'great',
    fteRatio: 1,
    weeklyContractedHours: 40,
    employmentType: 'full_time',
    monthly: [
      { month: '2026-01', label: 'Jan', score: 40, band: 'average' },
      { month: '2026-10', label: 'Oct', score: 90, band: 'great' },
      { month: '2026-11', label: 'Nov', score: 10, band: 'poor' },
    ],
    tasksByMonth: { '2026-01': 2, '2026-10': 5, '2026-11': 1 },
    lastThreeMonthly: [],
    ytdMonthly: [],
    qualityRatingsLast3Months: [],
    collaborationRatingsLast3Months: [],
    ...overrides,
  };
}

describe('parseStaffKpiPeriod', () => {
  it('defaults to the last closed Denver month', () => {
    expect(parseStaffKpiPeriod(undefined, NOW)).toEqual({ kind: 'month', month: '2026-10' });
    expect(parseStaffKpiPeriod('nope', NOW)).toEqual({ kind: 'month', month: '2026-10' });
  });

  it('accepts MTD, YTD, all time, and a month', () => {
    expect(parseStaffKpiPeriod('MTD', NOW)).toEqual({ kind: 'mtd' });
    expect(parseStaffKpiPeriod('ytd', NOW)).toEqual({ kind: 'ytd' });
    expect(parseStaffKpiPeriod('all', NOW)).toEqual({ kind: 'all' });
    expect(parseStaffKpiPeriod('2026-03', NOW)).toEqual({ kind: 'month', month: '2026-03' });
  });
});

describe('describeStaffKpiPeriod', () => {
  it('builds MTD, YTD, and closed-month windows on the Denver calendar', () => {
    const mtd = describeStaffKpiPeriod({ kind: 'mtd' }, NOW);
    expect(mtd.label).toBe('November 2026 month to date');
    expect(mtd.monthKeys).toEqual(['2026-11']);
    expect(mtd.closed).toBe(false);

    const ytd = describeStaffKpiPeriod({ kind: 'ytd' }, NOW);
    expect(ytd.monthKeys).toHaveLength(11);
    expect(ytd.monthKeys?.[0]).toBe('2026-01');
    expect(ytd.monthKeys?.at(-1)).toBe('2026-11');

    const october = describeStaffKpiPeriod({ kind: 'month', month: '2026-10' }, NOW);
    expect(october.label).toBe('October 2026');
    expect(october.closed).toBe(true);

    const november = describeStaffKpiPeriod({ kind: 'month', month: '2026-11' }, NOW);
    expect(november.closed).toBe(false);
  });
});

describe('staffKpiSlice', () => {
  const person = summary();

  it('sums YTD months, zero-fills gaps, and averages only scored months', () => {
    const slice = staffKpiSlice(person, describeStaffKpiPeriod({ kind: 'ytd' }, NOW), NOW);
    expect(slice.score).toBe(140);
    expect(slice.months).toHaveLength(11);
    expect(slice.monthsScored).toBe(3);
    expect(slice.averageScored).toBe(46.67);
    expect(slice.tasks).toBe(8);
    expect(slice.bonus).toBeNull();
    expect(slice.months.find((month) => month.month === '2026-02')?.score).toBe(0);
  });

  it('marks bonus from the closed-month threshold and leaves the open month in progress', () => {
    const october = staffKpiSlice(person, describeStaffKpiPeriod({ kind: 'month', month: '2026-10' }, NOW), NOW);
    expect(october.score).toBe(90);
    expect(october.band).toBe('great');
    expect(october.bonus).toBe('yes');
    expect(october.tasks).toBe(5);

    const atThreshold = staffKpiSlice(
      summary({
        monthly: [{ month: '2026-09', label: 'Sep', score: 55, band: performanceBand(55) }],
        tasksByMonth: { '2026-09': 1 },
      }),
      describeStaffKpiPeriod({ kind: 'month', month: '2026-09' }, NOW),
      NOW
    );
    expect(atThreshold.bonus).toBe('yes');

    const below = staffKpiSlice(
      summary({
        monthly: [{ month: '2026-09', label: 'Sep', score: 54.99, band: performanceBand(54.99) }],
        tasksByMonth: { '2026-09': 1 },
      }),
      describeStaffKpiPeriod({ kind: 'month', month: '2026-09' }, NOW),
      NOW
    );
    expect(below.bonus).toBe('no');

    const open = staffKpiSlice(person, describeStaffKpiPeriod({ kind: 'mtd' }, NOW), NOW);
    expect(open.bonus).toBe('in_progress');
    expect(open.score).toBe(10);

    const empty = staffKpiSlice(person, describeStaffKpiPeriod({ kind: 'month', month: '2026-09' }, NOW), NOW);
    expect(empty.score).toBe(0);
    expect(empty.band).toBeNull();
    expect(empty.bonus).toBe('none');
    expect(empty.tasks).toBe(0);
  });

  it('keeps all-time to months that were actually scored', () => {
    const slice = staffKpiSlice(person, describeStaffKpiPeriod({ kind: 'all' }, NOW), NOW);
    expect(slice.months.map((month) => month.month)).toEqual(['2026-01', '2026-10', '2026-11']);
    expect(slice.score).toBe(140);
  });
});

describe('monthly goal line', () => {
  it('uses 50 for full-time and 40 for part-time', () => {
    expect(kpiMonthlyGoal({ employmentType: 'full_time', weeklyContractedHours: 40 })).toBe(50);
    expect(kpiMonthlyGoal({ employmentType: 'part_time', weeklyContractedHours: 30 })).toBe(40);
    expect(kpiMonthlyGoal({ employmentType: 'part_time', weeklyContractedHours: 40 })).toBe(40);
    expect(kpiMonthlyGoal({ employmentType: 'contractor', weeklyContractedHours: 40 })).toBe(50);
    expect(kpiMonthlyGoal({ employmentType: 'contractor', weeklyContractedHours: 20 })).toBe(40);
  });
});

describe('Asana pull age', () => {
  const pulledAt = '2026-11-22T23:02:00.000Z';
  const now = new Date('2026-11-22T23:14:20.000Z');

  it('formats the clock in the timezone it is given', () => {
    expect(describeKpiPull(pulledAt, now, 'America/Denver')).toEqual({
      clock: '4:02 PM MST',
      minutesAgo: 12,
    });
    expect(describeKpiPull(pulledAt, now, 'Asia/Ho_Chi_Minh')).toEqual({
      clock: '6:02 AM GMT+7',
      minutesAgo: 12,
    });
    expect(kpiPullAgoLabel(12, 'en')).toBe('12 min ago');
    expect(kpiPullAgoLabel(0, 'en')).toBe('just now');
    expect(kpiPullAgoLabel(12, 'vn')).toBe('12 phút trước');
  });
});

describe('staff KPI export', () => {
  it('offers recent months plus older scored months, newest first', () => {
    const months = selectableStaffKpiMonths(['2024-06'], NOW);
    expect(months[0]?.key).toBe('2026-11');
    expect(months.at(-1)?.key).toBe('2024-06');
    expect(months.some((month) => month.key === '2025-01')).toBe(true);
  });

  it('writes one CSV row per month and escapes names', () => {
    const window = describeStaffKpiPeriod({ kind: 'month', month: '2026-10' }, NOW);
    const csv = buildStaffKpiCsv(
      [
        {
          name: 'Do, Thi',
          email: 'thi.do@anim-8studios.com',
          role: 'Animator',
          level: 'Mid',
          employment: 'Full-time',
          location: 'VN',
          fteRatio: 1,
          kpi: summary(),
        },
      ],
      window,
      NOW
    );
    expect(csv.startsWith('\uFEFFName,Email,')).toBe(true);
    expect(csv).toContain('"Do, Thi"');
    expect(csv).toContain('2026-10,90.0,Great,5,Yes');
  });
});
