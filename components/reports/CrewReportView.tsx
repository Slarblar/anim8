'use client';

import type { CrewReportData } from '@/lib/crew-report';
import { performanceBandLabel } from '@/lib/kpi-shared';

const EMPLOYMENT_TYPE_LABELS: Record<CrewReportData['member']['employmentType'], string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 print:border-black/20 print:bg-transparent">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted print:text-black/50">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white print:text-black">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-muted print:text-black/60">{sub}</p> : null}
    </div>
  );
}

export function CrewReportView({ data }: { data: CrewReportData }) {
  const { member, pto, attendance, kpi, generatedAt } = data;

  return (
    <div className="crew-report mx-auto max-w-3xl space-y-8 print:max-w-none">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div />
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-cyan/50 bg-brand-cyan px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,194,214,0.25)] transition hover:brightness-110"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>

      <header className="border-b border-white/10 pb-6 print:border-black/20">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-cyan print:text-black">
          Anim-8 <span className="text-white print:text-black">— Progress report</span>
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white print:text-black">
          {member.name}
        </h1>
        <p className="mt-1 text-sm text-text-muted print:text-black/70">
          {member.email}
          {member.role ? ` · ${member.role}` : ''}
          {member.level ? ` · ${member.level}` : ''}
        </p>
        <p className="mt-1 text-xs text-text-muted print:text-black/60">
          {EMPLOYMENT_TYPE_LABELS[member.employmentType]} · {member.location === 'US' ? 'US-based' : 'VN-based'}
          {member.startDate ? ` · Start date ${formatDate(member.startDate)}` : ''}
        </p>
        <p className="mt-3 text-[11px] text-text-muted/70 print:text-black/50">
          Generated {formatGeneratedAt(generatedAt)}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
          PTO overview
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Available balance" value={`${pto.balanceDays} d`} />
          <StatCard label="Annual entitlement" value={`${pto.entitlementDays} d/yr`} />
          <StatCard label="Taken this year" value={`${pto.daysTakenYtd} d`} />
        </div>

        {pto.requests.length === 0 ? (
          <p className="text-sm text-text-muted print:text-black/60">No PTO/WFH requests on record.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-muted print:border-black/20 print:text-black/50">
                <th className="py-2 pr-3">Dates</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {pto.requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 text-text-muted print:border-black/10 print:text-black/80"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-white print:text-black">
                    {r.startDate === r.endDate ? formatDate(r.startDate) : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`}
                  </td>
                  <td className="py-2 pr-3">{r.type === 'PTO' ? 'Time off' : 'Work from home'}</td>
                  <td className="py-2 pr-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td className="py-2 pr-3 max-w-[16rem] truncate">{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
          Meeting attendance
        </h2>
        <p className="text-xs text-text-muted print:text-black/60">
          Month {attendance.monthKey} · resets on the 1st (studio month)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Late" value={String(attendance.late)} />
          <StatCard label="Absent" value={String(attendance.absent)} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
          KPI overview
        </h2>

        {!kpi ? (
          <p className="text-sm text-text-muted print:text-black/60">
            No scored KPI tasks yet for this person.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="YTD score" value={kpi.ytdScore.toFixed(1)} sub={`${kpi.ytdTasks} scored tasks`} />
              <StatCard
                label="Current month"
                value={kpi.currentMonthScore.toFixed(1)}
                sub={performanceBandLabel(kpi.currentMonthBand)}
              />
              <StatCard label="FTE ratio" value={kpi.fteRatio.toFixed(2)} sub={`${kpi.weeklyContractedHours}h/wk`} />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted print:text-black/50">
                Last 3 months
              </p>
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-muted print:border-black/20 print:text-black/50">
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.lastThreeMonthly.map((m) => (
                    <tr
                      key={m.month}
                      className="border-b border-white/5 text-text-muted print:border-black/10 print:text-black/80"
                    >
                      <td className="py-2 pr-3 text-white print:text-black">{m.label}</td>
                      <td className="py-2 pr-3 font-mono">{m.score.toFixed(1)}</td>
                      <td className="py-2 pr-3">{performanceBandLabel(m.band)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted print:text-black/50">
                  Quality ratings (last 3 mo.)
                </p>
                <ul className="space-y-1 text-sm text-text-muted print:text-black/80">
                  {kpi.qualityRatingsLast3Months.map((r) => (
                    <li key={r.rating} className="flex justify-between gap-3">
                      <span>{r.rating}</span>
                      <span className="font-mono text-white print:text-black">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted print:text-black/50">
                  Collaboration ratings (last 3 mo.)
                </p>
                <ul className="space-y-1 text-sm text-text-muted print:text-black/80">
                  {kpi.collaborationRatingsLast3Months.map((r) => (
                    <li key={r.rating} className="flex justify-between gap-3">
                      <span>{r.rating}</span>
                      <span className="font-mono text-white print:text-black">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
