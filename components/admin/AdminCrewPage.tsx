'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  annualLeaveEntitlementDays,
  defaultWeeklyHours,
  type CrewLocation,
  type CrewMember,
  type EmploymentType,
  type WeekdayCode,
} from '@/lib/crew-directory';
import type { CrewStatusEntry } from '@/lib/crew-status-cache';
import {
  performanceBandLabel,
  type AdminKpiPerson,
  type PerformanceBand,
  type PersonKPISummary,
} from '@/lib/kpi-shared';
import { getScoreBand } from '@/components/crew/kpi-ui';
import {
  adminAlertError,
  adminBadgeActive,
  adminBadgeInactive,
  adminBody,
  adminBtnGhost,
  adminBtnPrimary,
  adminCard,
  adminInput,
  adminLabel,
  adminSectionTitle,
  adminSelect,
  adminSelectChevronStyle,
} from './admin-ui';
import { AdminDatePicker } from './AdminDatePicker';

type ApiErrorBody = { error?: string; reason?: string; email?: string | null };

const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contractor', label: 'Contractor' },
];

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
};

// Sourced from the "Role" and "Level" custom fields on the studio's Asana staff
// roster (🐸 Anim8 Staff MGMT project) so titles stay consistent with what's used
// there. "Custom…" on Role covers anything not on this list (e.g. Content
// Manager, Contributor) without blocking on us keeping two lists in sync.
const LEVEL_OPTIONS = [
  'Director / Supervisor',
  'Senior',
  'Mid',
  'Junior',
  'Intern',
] as const;

const ROLE_OPTIONS = [
  'Animator',
  'Concept / Storyboard',
  'Modeler',
  'Designer',
  'Technical Artist',
  'Director',
  'Project Manager',
  'Lighting Artist',
  'Environment Artist',
  'Editor',
  'Audio',
];
const CUSTOM_ROLE_VALUE = '__custom__';

function formatLevelRole(level?: string, role?: string): string {
  return [level?.trim(), role?.trim()].filter(Boolean).join(' · ');
}

function AdminPresencePill({ status }: { status: CrewStatusEntry['status'] }) {
  if (status === 'PTO') {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-pink font-mono">
        🌴 Out
      </span>
    );
  }
  if (status === 'WFH') {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono">
        🏠 WFH
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-lime font-mono">
      In studio
    </span>
  );
}

function CrewKpiBandBadge({ score, band }: { score: number; band?: PerformanceBand }) {
  if (score <= 0 || !band) {
    return <span className={adminBadgeInactive}>No KPI</span>;
  }
  const styleBand = getScoreBand(score);
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{
        color: styleBand.color,
        borderColor: `${styleBand.color}55`,
        backgroundColor: `${styleBand.color}18`,
      }}
    >
      {performanceBandLabel(band)}
    </span>
  );
}

function CrewKpiIndicator({ summary }: { summary?: PersonKPISummary | null }) {
  const score = summary?.currentMonthScore ?? 0;
  const band = summary?.currentMonthBand;
  if (score <= 0 || !band) {
    return <span className="text-[10px] font-mono text-text-muted">No KPI yet</span>;
  }
  const styleBand = getScoreBand(score);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <span
        className="font-mono text-sm font-bold tabular-nums leading-none"
        style={{ color: styleBand.color }}
      >
        {score.toFixed(1)}
      </span>
      <CrewKpiBandBadge score={score} band={band} />
    </div>
  );
}

/** Dropdown of Asana Level enum options (optional). */
function LevelField({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <select
      id={id}
      className={adminSelect}
      style={adminSelectChevronStyle}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {LEVEL_OPTIONS.map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      ))}
    </select>
  );
}

/** Dropdown of standard studio role titles, falling back to a free-text field for anything else. */
function RoleField({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const [customMode, setCustomMode] = useState(value !== '' && !ROLE_OPTIONS.includes(value));

  return (
    <div className="space-y-2">
      <select
        id={`${idPrefix}-select`}
        className={adminSelect}
        style={adminSelectChevronStyle}
        disabled={disabled}
        value={customMode ? CUSTOM_ROLE_VALUE : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_ROLE_VALUE) {
            setCustomMode(true);
            onChange('');
            return;
          }
          setCustomMode(false);
          onChange(e.target.value);
        }}
      >
        <option value="">— none —</option>
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
        <option value={CUSTOM_ROLE_VALUE}>Custom…</option>
      </select>
      {customMode ? (
        <input
          id={`${idPrefix}-custom`}
          className={adminInput}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Content Manager"
          aria-label="Custom role"
        />
      ) : null}
    </div>
  );
}

function sameWeekdays(a: WeekdayCode[], b: WeekdayCode[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((day) => set.has(day));
}

/** Turns a middleware/route error body (error + reason + email) into a message that explains what to fix. */
function describeApiError(data: ApiErrorBody, fallback: string): string {
  if (!data.error) return fallback;
  const who = data.email ? data.email : 'This account';
  switch (data.reason) {
    case 'no-session':
      return "Unauthorized (401): you're not signed in — refresh and sign in again.";
    case 'not-in-admin-emails':
      return `Forbidden (403): ${who} is signed in but not listed in ADMIN_EMAILS — an existing admin needs to add this email to that env var in Vercel.`;
    case 'not-admin-and-not-in-crew-directory':
      return `Forbidden (403): ${who} is not an admin and not in the crew directory yet.`;
    default:
      return data.error;
  }
}

function AddCrewForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [location, setLocation] = useState<CrewLocation>('VN');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [weeklyHours, setWeeklyHours] = useState(String(defaultWeeklyHours('full_time')));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/admin/crew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            role,
            level,
            startDate: startDate || undefined,
            initialPtoBalanceDays: initialBalance ? Number(initialBalance) : undefined,
            location,
            employmentType,
            weeklyContractedHours: weeklyHours ? Number(weeklyHours) : undefined,
          }),
        });
        const data = (await res.json()) as ApiErrorBody;
        if (!res.ok) {
          setError(describeApiError(data, 'Could not add crew member.'));
          return;
        }
        setName('');
        setEmail('');
        setRole('');
        setLevel('');
        setStartDate('');
        setInitialBalance('');
        setLocation('VN');
        setEmploymentType('full_time');
        setWeeklyHours(String(defaultWeeklyHours('full_time')));
        onCreated();
      } catch {
        setError('Could not add crew member. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, role, level, startDate, initialBalance, location, employmentType, weeklyHours, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className={`${adminCard} space-y-4`}>
      <h2 className={adminSectionTitle}>Add crew member</h2>
      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <div>
          <label className={adminLabel} htmlFor="crewName">
            Name
          </label>
          <input
            id="crewName"
            className={adminInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
            required
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewEmail">
            Google account email
          </label>
          <input
            id="crewEmail"
            type="email"
            className={adminInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@anim-8.xyz"
            required
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewLevel">
            Level (optional)
          </label>
          <LevelField id="crewLevel" value={level} onChange={setLevel} />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewRole-select">
            Role (optional)
          </label>
          <RoleField idPrefix="crewRole" value={role} onChange={setRole} />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewStart">
            Start date (optional — used for PTO tenure bonus)
          </label>
          <AdminDatePicker
            id="crewStart"
            value={startDate}
            onChange={setStartDate}
            placeholder="Start date"
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewBalance">
            Starting PTO balance, in days (optional — from Handbook/HR records)
          </label>
          <input
            id="crewBalance"
            type="number"
            step="0.5"
            className={adminInput}
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewLocation">
            Location
          </label>
          <select
            id="crewLocation"
            className={adminSelect}
            style={adminSelectChevronStyle}
            value={location}
            onChange={(e) => setLocation(e.target.value as CrewLocation)}
          >
            <option value="VN">VN — Vietnam</option>
            <option value="US">US — United States</option>
          </select>
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewEmploymentType">
            Employment type
          </label>
          <select
            id="crewEmploymentType"
            className={adminSelect}
            style={adminSelectChevronStyle}
            value={employmentType}
            onChange={(e) => {
              const next = e.target.value as EmploymentType;
              setEmploymentType(next);
              // Keep hours in sync with the type's default unless an admin already typed a custom value.
              setWeeklyHours((current) => {
                const asNumber = Number(current);
                const stillDefault =
                  !current ||
                  asNumber === defaultWeeklyHours('full_time') ||
                  asNumber === defaultWeeklyHours('part_time');
                return stillDefault ? String(defaultWeeklyHours(next)) : current;
              });
            }}
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewWeeklyHours">
            Weekly contracted hours (KPI FTE = hours ÷ 40)
          </label>
          <input
            id="crewWeeklyHours"
            type="number"
            min={1}
            max={80}
            step={1}
            className={adminInput}
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            required
          />
        </div>
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <button type="submit" className={adminBtnPrimary} disabled={submitting}>
        {submitting ? 'Adding…' : 'Add crew member'}
      </button>
    </form>
  );
}

const WEEKDAYS: { code: WeekdayCode; label: string; full: string }[] = [
  { code: 'mon', label: 'M', full: 'Monday' },
  { code: 'tue', label: 'T', full: 'Tuesday' },
  { code: 'wed', label: 'W', full: 'Wednesday' },
  { code: 'thu', label: 'Th', full: 'Thursday' },
  { code: 'fri', label: 'F', full: 'Friday' },
];

/** Real sliding toggle switch, since the location field is intentionally binary (US/VN). */
function LocationToggle({
  location,
  onToggle,
  disabled,
}: {
  location: CrewLocation;
  onToggle: () => void;
  disabled: boolean;
}) {
  const isUs = location === 'US';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isUs}
      disabled={disabled}
      onClick={onToggle}
      title={isUs ? 'US-based — click to switch to VN' : 'VN-based — click to switch to US'}
      className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-muted disabled:opacity-50"
    >
      <span className={!isUs ? 'text-white' : undefined}>VN</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
          isUs ? 'border-brand-cyan/50 bg-brand-cyan/40' : 'border-white/20 bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            isUs ? 'translate-x-[1.15rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className={isUs ? 'text-white' : undefined}>US</span>
    </button>
  );
}

/** Three-way segmented control — employment type isn't binary like location, so no sliding switch here. */
function EmploymentTypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: EmploymentType;
  onChange: (next: EmploymentType) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
            value === opt.value
              ? 'border-brand-cyan/50 bg-brand-cyan/20 text-brand-cyan'
              : 'border-white/15 text-text-muted hover:border-white/35'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Click-to-toggle day grid for a standing WFH schedule — day clicks stage locally until Save. */
function FixedWfhDayPicker({
  days,
  onToggleDay,
  disabled,
}: {
  days: WeekdayCode[];
  onToggleDay: (day: WeekdayCode) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {WEEKDAYS.map(({ code, label, full }) => {
        const isWfh = days.includes(code);
        return (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => onToggleDay(code)}
            title={`${full} — ${isWfh ? 'work from home' : 'in office'} (click to switch)`}
            className={`h-8 w-8 rounded-md border text-xs font-bold transition disabled:opacity-50 ${
              isWfh
                ? 'border-brand-cyan/50 bg-brand-cyan/20 text-brand-cyan'
                : 'border-white/15 text-text-muted hover:border-white/35'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CrewRow({
  member,
  onChanged,
  todayStatus,
  kpiSummary,
}: {
  member: CrewMember;
  onChanged: () => void;
  todayStatus?: CrewStatusEntry['status'];
  kpiSummary?: PersonKPISummary | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [showLogPto, setShowLogPto] = useState(false);
  const [logPtoDate, setLogPtoDate] = useState('');
  const [logPtoNote, setLogPtoNote] = useState('');
  const [editingStart, setEditingStart] = useState(false);
  const [startDateInput, setStartDateInput] = useState(member.startDate ?? '');
  const [pendingLevel, setPendingLevel] = useState(member.level ?? '');
  const [pendingRole, setPendingRole] = useState(member.role ?? '');
  const [pendingLocation, setPendingLocation] = useState<CrewLocation>(member.location ?? 'VN');
  const [pendingEmploymentType, setPendingEmploymentType] = useState<EmploymentType>(
    member.employmentType ?? 'full_time'
  );
  const [pendingHours, setPendingHours] = useState(
    String(member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time'))
  );
  // Staged locally — Calendar sync only runs when Save is pressed.
  const [pendingWfhDays, setPendingWfhDays] = useState<WeekdayCode[]>(member.fixedWfhDays ?? []);

  useEffect(() => {
    setPendingLevel(member.level ?? '');
    setPendingRole(member.role ?? '');
    setPendingLocation(member.location ?? 'VN');
    setPendingEmploymentType(member.employmentType ?? 'full_time');
    setPendingHours(
      String(member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time'))
    );
    setPendingWfhDays(member.fixedWfhDays ?? []);
    setStartDateInput(member.startDate ?? '');
  }, [
    member.level,
    member.role,
    member.location,
    member.employmentType,
    member.weeklyContractedHours,
    member.fixedWfhDays,
    member.startDate,
  ]);

  useEffect(() => {
    if (!expanded) {
      setShowAdjust(false);
      setShowLogPto(false);
      setEditingStart(false);
    }
  }, [expanded]);

  const savedHours = member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time');
  const hoursNumber = Number(pendingHours);
  const hoursDirty = Number.isFinite(hoursNumber) && hoursNumber > 0 && hoursNumber !== savedHours;
  const levelDirty = pendingLevel.trim() !== (member.level ?? '');
  const roleDirty = pendingRole.trim() !== (member.role ?? '');
  const locationDirty = pendingLocation !== (member.location ?? 'VN');
  const employmentDirty = pendingEmploymentType !== (member.employmentType ?? 'full_time');
  const wfhDaysChanged = !sameWeekdays(pendingWfhDays, member.fixedWfhDays ?? []);
  const profileDirty =
    levelDirty || roleDirty || locationDirty || employmentDirty || hoursDirty || wfhDaysChanged;

  const entitlement = annualLeaveEntitlementDays(member.startDate);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/crew/${encodeURIComponent(member.email)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as ApiErrorBody;
        if (!res.ok) {
          setError(describeApiError(data, 'Action failed.'));
          return;
        }
        onChanged();
      } catch {
        setError('Action failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [member.email, onChanged]
  );

  const saveProfile = useCallback(() => {
    if (!profileDirty) return;
    if (hoursDirty && !(hoursNumber > 0)) {
      setError('Weekly hours must be a positive number.');
      return;
    }
    const body: Record<string, unknown> = {};
    if (levelDirty) body.level = pendingLevel.trim();
    if (roleDirty) body.role = pendingRole.trim();
    if (locationDirty) body.location = pendingLocation;
    if (employmentDirty) body.employmentType = pendingEmploymentType;
    if (hoursDirty) body.weeklyContractedHours = hoursNumber;
    if (wfhDaysChanged) body.fixedWfhDays = pendingWfhDays;
    patch(body);
  }, [
    profileDirty,
    hoursDirty,
    hoursNumber,
    levelDirty,
    roleDirty,
    locationDirty,
    employmentDirty,
    wfhDaysChanged,
    pendingLevel,
    pendingRole,
    pendingLocation,
    pendingEmploymentType,
    pendingWfhDays,
    patch,
  ]);

  const applyAdjustment = useCallback(() => {
    const amount = Number(adjustAmount);
    if (!amount) return;
    patch({ adjustBalanceDays: amount });
    setAdjustAmount('');
  }, [adjustAmount, patch]);

  const submitLogPto = useCallback(async () => {
    if (!logPtoDate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crew/${encodeURIComponent(member.email)}/log-pto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: logPtoDate, note: logPtoNote || undefined }),
      });
      const data = (await res.json()) as ApiErrorBody & { calendarError?: string; balanceError?: string };
      if (!res.ok) {
        setError(describeApiError(data, 'Could not log PTO.'));
        return;
      }
      if (data.calendarError) setError(`Logged, but calendar sync failed: ${data.calendarError}`);
      else if (data.balanceError) setError(`Logged, but balance update failed: ${data.balanceError}`);
      setLogPtoDate('');
      setLogPtoNote('');
      setShowLogPto(false);
      onChanged();
    } catch {
      setError('Could not log PTO. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [logPtoDate, logPtoNote, member.email, onChanged]);

  const saveStartDate = useCallback(() => {
    patch({ startDate: startDateInput || null });
    setEditingStart(false);
  }, [startDateInput, patch]);

  const togglePendingLocation = useCallback(() => {
    setPendingLocation((current) => (current === 'US' ? 'VN' : 'US'));
  }, []);

  const setEmploymentDraft = useCallback((next: EmploymentType) => {
    setPendingEmploymentType(next);
    setPendingHours((current) => {
      const asNumber = Number(current);
      const stillDefault =
        !current ||
        asNumber === defaultWeeklyHours('full_time') ||
        asNumber === defaultWeeklyHours('part_time');
      return stillDefault ? String(defaultWeeklyHours(next)) : current;
    });
  }, []);

  const toggleWfhDay = useCallback((day: WeekdayCode) => {
    setPendingWfhDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    );
  }, []);

  const balance = member.ptoBalanceDays ?? 0;
  const weeklyHours = member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time');
  const employmentLabel = EMPLOYMENT_TYPE_LABELS[member.employmentType ?? 'full_time'];
  const location = member.location ?? 'VN';
  return (
    <li
      className={`${adminCard} admin-collapse-card ${expanded ? 'admin-collapse-card--expanded' : ''}`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 space-y-2">
          <button
            type="button"
            className="admin-collapse-toggle w-full text-left"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 truncate font-bold text-white">{member.name}</p>
              <span
                className={`admin-collapse-chevron shrink-0 text-brand-cyan ${
                  expanded ? 'admin-collapse-chevron--open' : ''
                }`}
                aria-hidden
              >
                ▾
              </span>
            </div>
            <p className={`${adminBody} truncate`}>{member.email}</p>
          </button>
          <p className="text-xs leading-relaxed text-text-muted">
            {formatLevelRole(member.level, member.role) ? (
              <span>{formatLevelRole(member.level, member.role)}</span>
            ) : null}
            {formatLevelRole(member.level, member.role) ? (
              <span className="px-1.5 text-white/20" aria-hidden>
                ·
              </span>
            ) : null}
            <span>{employmentLabel}</span>
            <span className="px-1.5 text-white/20" aria-hidden>·</span>
            <span className="font-mono">{weeklyHours}h/wk</span>
            <span className="px-1.5 text-white/20" aria-hidden>·</span>
            <span className="font-mono text-brand-cyan">
              {balance} day{balance === 1 ? '' : 's'} PTO
            </span>
            <span className="px-1.5 text-white/20" aria-hidden>·</span>
            <span
              className="rounded border border-white/15 px-1 py-px font-mono text-[10px] font-bold uppercase tracking-wide"
              title={location === 'US' ? 'US-based' : 'VN-based'}
            >
              {location}
            </span>
            {!member.startDate ? (
              <>
                <span className="px-1.5 text-white/20" aria-hidden>·</span>
                <span className="text-brand-pink">No start date</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-2.5 sm:mb-1 sm:w-[8.75rem] sm:items-end sm:border-t-0 sm:pt-0 sm:pb-2">
          <span className={member.active ? adminBadgeActive : adminBadgeInactive}>
            {member.active ? 'Active' : 'Deactivated'}
          </span>
          {todayStatus ? <AdminPresencePill status={todayStatus} /> : null}
          <CrewKpiIndicator summary={kpiSummary} />
          <Link
            href={`/admin/kpi/${encodeURIComponent(member.email)}`}
            className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-brand-cyan transition hover:border-brand-cyan/35 hover:bg-brand-cyan/[0.06]"
          >
            View KPI
          </Link>
        </div>
      </div>

      <div
        className={`admin-collapse-expand ${expanded ? 'admin-collapse-expand--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="admin-collapse-expand-inner space-y-3 border-t border-white/10 pt-5">
          <p className="text-xs text-text-muted">entitled {entitlement} day(s)/yr</p>
          <p className="text-xs text-text-muted">
            {member.startDate ? (
              <>Start date: {member.startDate}</>
            ) : (
              <span className="text-brand-pink">No start date set — won&apos;t accrue PTO yet</span>
            )}
          </p>

          {error ? <p className={adminAlertError}>{error}</p> : null}

          <div>
            <p className={adminLabel}>Level</p>
            <div className="max-w-md">
              <LevelField
                id={`crew-level-${member.email}`}
                value={pendingLevel}
                onChange={setPendingLevel}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <p className={adminLabel}>Role</p>
            <div className="max-w-md">
              <RoleField
                key={`${member.email}-role-${member.role}`}
                idPrefix={`crew-role-${member.email}`}
                value={pendingRole}
                onChange={setPendingRole}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <p className={adminLabel}>Location</p>
            <LocationToggle
              location={pendingLocation}
              onToggle={togglePendingLocation}
              disabled={loading}
            />
          </div>

          <div>
            <p className={adminLabel}>Employment type</p>
            <EmploymentTypeToggle
              value={pendingEmploymentType}
              onChange={setEmploymentDraft}
              disabled={loading}
            />
          </div>

          <div>
            <p className={adminLabel}>Weekly contracted hours (KPI FTE = hours ÷ 40)</p>
            <input
              type="number"
              min={1}
              max={80}
              step={1}
              className={`${adminInput} max-w-[8rem]`}
              value={pendingHours}
              onChange={(e) => setPendingHours(e.target.value)}
              disabled={loading}
              aria-label="Weekly contracted hours"
            />
          </div>

          <div>
            <p className={adminLabel}>Fixed WFH schedule (click days to toggle — Save syncs to the shared calendar)</p>
            <FixedWfhDayPicker days={pendingWfhDays} onToggleDay={toggleWfhDay} disabled={loading} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={adminBtnGhost} onClick={() => setShowAdjust((v) => !v)}>
                Adjust PTO
              </button>
              <button type="button" className={adminBtnGhost} onClick={() => setShowLogPto((v) => !v)}>
                Log PTO date
              </button>
              <button type="button" className={adminBtnGhost} onClick={() => setEditingStart((v) => !v)}>
                {member.startDate ? 'Edit start date' : 'Set start date'}
              </button>
              {profileDirty ? (
                <button
                  type="button"
                  className={adminBtnGhost}
                  disabled={loading}
                  onClick={saveProfile}
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => patch({ active: !member.active })}
              disabled={loading}
              className="shrink-0 text-[11px] font-medium text-text-muted/60 underline-offset-2 transition hover:text-brand-pink hover:underline disabled:opacity-50"
            >
              {member.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>

          {editingStart ? (
            <div className="flex flex-wrap items-center gap-2">
              <AdminDatePicker
                className="max-w-[12rem]"
                value={startDateInput}
                onChange={setStartDateInput}
                placeholder="Start date"
              />
              <button type="button" className={adminBtnGhost} disabled={loading} onClick={saveStartDate}>
                Save start date
              </button>
            </div>
          ) : null}

          {showAdjust ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="0.5"
                className={`${adminInput} max-w-[10rem]`}
                placeholder="+/- days"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <button
                type="button"
                className={adminBtnGhost}
                disabled={loading || !adjustAmount}
                onClick={applyAdjustment}
              >
                Apply
              </button>
            </div>
          ) : null}

          {showLogPto ? (
            <div className="flex flex-wrap items-center gap-2">
              <AdminDatePicker
                className="max-w-[12rem]"
                value={logPtoDate}
                onChange={setLogPtoDate}
                placeholder="PTO date"
                aria-label="PTO date"
              />
              <input
                type="text"
                className={`${adminInput} max-w-[16rem]`}
                placeholder="Note (optional)"
                value={logPtoNote}
                onChange={(e) => setLogPtoNote(e.target.value)}
              />
              <button
                type="button"
                className={adminBtnGhost}
                disabled={loading || !logPtoDate}
                onClick={submitLogPto}
              >
                {loading ? 'Logging…' : 'Log & deduct balance'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function AdminCrewPage() {
  const [members, setMembers] = useState<CrewMember[] | null>(null);
  const [kpiByEmail, setKpiByEmail] = useState<Record<string, PersonKPISummary | null>>({});
  const [statusByEmail, setStatusByEmail] = useState<Record<string, CrewStatusEntry['status']>>({});
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [crewRes, kpiRes, statusRes] = await Promise.all([
        fetch('/api/admin/crew'),
        fetch('/api/admin/kpi'),
        fetch('/api/crew/status'),
      ]);
      const crewData = (await crewRes.json()) as ApiErrorBody & { members?: CrewMember[] };
      if (!crewRes.ok) {
        setError(describeApiError(crewData, 'Could not load crew directory.'));
        return;
      }
      setMembers(crewData.members ?? []);

      if (kpiRes.ok) {
        const kpiData = (await kpiRes.json()) as { people?: AdminKpiPerson[] };
        const nextKpi: Record<string, PersonKPISummary | null> = {};
        for (const person of kpiData.people ?? []) {
          nextKpi[person.email.toLowerCase()] = person.summary;
        }
        setKpiByEmail(nextKpi);
      } else {
        setKpiByEmail({});
      }

      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as {
          snapshot?: { entries?: CrewStatusEntry[] };
        };
        const nextStatus: Record<string, CrewStatusEntry['status']> = {};
        for (const entry of statusData.snapshot?.entries ?? []) {
          if (entry.email) {
            nextStatus[entry.email.toLowerCase()] = entry.status;
          }
        }
        setStatusByEmail(nextStatus);
      } else {
        setStatusByEmail({});
      }
    } catch {
      setError('Could not load crew directory.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (members ?? []).filter((member) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.role.toLowerCase().includes(q) ||
      (member.level ?? '').toLowerCase().includes(q) ||
      formatLevelRole(member.level, member.role).toLowerCase().includes(q) ||
      EMPLOYMENT_TYPE_LABELS[member.employmentType ?? 'full_time'].toLowerCase().includes(q) ||
      (member.location ?? 'VN').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Crew directory</h1>
        <p className={`${adminBody} mt-1`}>
          Anyone listed here (and active) can sign in to /crew with their Google account.
        </p>
      </div>

      <AddCrewForm onCreated={load} />

      {error ? <p className={adminAlertError}>{error}</p> : null}

      {members !== null && members.length > 0 ? (
        <input
          className={adminInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, level, role, location, or employment type…"
          aria-label="Search crew directory"
        />
      ) : null}

      {members === null ? (
        <p className={adminBody}>Loading crew directory…</p>
      ) : members.length === 0 ? (
        <p className={adminBody}>No crew members yet.</p>
      ) : filtered.length === 0 ? (
        <p className={adminBody}>No crew members match &quot;{search}&quot;.</p>
      ) : (
        <ul className="grid items-start gap-4 lg:grid-cols-2">
          {filtered.map((member) => (
            <CrewRow
              key={member.email}
              member={member}
              onChanged={load}
              todayStatus={statusByEmail[member.email.toLowerCase()]}
              kpiSummary={kpiByEmail[member.email.toLowerCase()]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
