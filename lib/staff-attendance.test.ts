import { describe, expect, it } from 'vitest';
import { describeStaffKpiPeriod } from './kpi-shared';
import { staffAttendanceSlice } from './staff-attendance';

const NOW = new Date('2026-11-09T18:00:00Z');

describe('staffAttendanceSlice', () => {
  const marks = [
    { month: '2026-10', late: 2, absent: 1 },
    { month: '2026-11', late: 1, absent: 0 },
  ];
  const timeOff = [
    {
      id: 'a',
      type: 'PTO',
      status: 'approved',
      startDate: '2026-10-05',
      endDate: '2026-10-06',
      dayPortion: 'full' as const,
      note: 'Trip',
    },
    {
      id: 'b',
      type: 'PTO',
      status: 'pending',
      startDate: '2026-10-12',
      endDate: '2026-10-12',
      dayPortion: 'full' as const,
    },
    {
      id: 'c',
      type: 'WFH',
      status: 'approved',
      startDate: '2026-10-20',
      endDate: '2026-10-20',
      dayPortion: 'full' as const,
    },
  ];

  it('totals tardy and missing marks for a closed month and keeps approved PTO separate', () => {
    const slice = staffAttendanceSlice(
      marks,
      timeOff,
      describeStaffKpiPeriod({ kind: 'month', month: '2026-10' }, NOW)
    );
    expect(slice.late).toBe(2);
    expect(slice.absent).toBe(1);
    expect(slice.ptoDays).toBe(2);
    expect(slice.timeOff.map((row) => row.id)).toEqual(['a']);
  });

  it('counts a half day and ignores months outside the window', () => {
    const slice = staffAttendanceSlice(
      marks,
      [
        {
          id: 'half',
          type: 'PTO',
          status: 'approved',
          startDate: '2026-11-03',
          endDate: '2026-11-03',
          dayPortion: 'half' as const,
        },
      ],
      describeStaffKpiPeriod({ kind: 'mtd' }, NOW)
    );
    expect(slice.late).toBe(1);
    expect(slice.absent).toBe(0);
    expect(slice.ptoDays).toBe(0.5);
  });

  it('sums every stored month for all time', () => {
    const slice = staffAttendanceSlice(marks, timeOff, describeStaffKpiPeriod({ kind: 'all' }, NOW));
    expect(slice.late).toBe(3);
    expect(slice.absent).toBe(1);
    expect(slice.ptoDays).toBe(2);
  });
});
