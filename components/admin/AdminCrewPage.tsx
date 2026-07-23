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
import {
  adminAlertError,
  adminBadgeActive,
  adminBadgeInactive,
  adminBody,
  adminBtnGhost,
  adminBtnFieldMatch,
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

/** Buffers edits locally and only PATCHes on "Save level" — matches the Role field pattern. */
function LevelEditor({
  level,
  onSave,
  disabled,
}: {
  level: string;
  onSave: (next: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(level);
  return (
    <div className="flex max-w-md items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <LevelField
          id="crewLevelEdit"
          value={value}
          onChange={setValue}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        className={adminBtnFieldMatch}
        disabled={disabled || value.trim() === level}
        onClick={() => onSave(value.trim())}
      >
        Save level
      </button>
    </div>
  );
}

/** Buffers edits locally and only PATCHes on "Save role" — matches the Weekly hours field's pattern. */
function RoleEditor({
  role,
  onSave,
  disabled,
}: {
  role: string;
  onSave: (next: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(role);
  return (
    <div className="flex max-w-md items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <RoleField idPrefix="crewRoleEdit" value={value} onChange={setValue} disabled={disabled} />
      </div>
      <button
        type="button"
        className={adminBtnFieldMatch}
        disabled={disabled || value.trim() === role}
        onClick={() => onSave(value.trim())}
      >
        Save role
      </button>
    </div>
  );
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

/** Click-to-toggle day grid for a standing WFH schedule — each click flips that one day and re-syncs the calendar. */
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

function CrewRow({ member, onChanged }: { member: CrewMember; onChanged: () => void }) {
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
  // Staged locally — each Calendar sync is a real round trip, so day clicks only
  // update this in-memory selection until "Apply schedule" is pressed.
  const [pendingWfhDays, setPendingWfhDays] = useState<WeekdayCode[]>(member.fixedWfhDays ?? []);

  useEffect(() => {
    setPendingWfhDays(member.fixedWfhDays ?? []);
  }, [member.fixedWfhDays]);

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

  const toggleLocation = useCallback(() => {
    patch({ location: (member.location ?? 'VN') === 'US' ? 'VN' : 'US' });
  }, [member.location, patch]);

  const toggleWfhDay = useCallback((day: WeekdayCode) => {
    setPendingWfhDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    );
  }, []);

  const savedWfhDays = member.fixedWfhDays ?? [];
  const wfhDaysChanged =
    pendingWfhDays.length !== savedWfhDays.length ||
    pendingWfhDays.some((d) => !savedWfhDays.includes(d));

  const applyWfhSchedule = useCallback(() => {
    patch({ fixedWfhDays: pendingWfhDays });
  }, [pendingWfhDays, patch]);

  const resetWfhSchedule = useCallback(() => {
    setPendingWfhDays(savedWfhDays);
  }, [savedWfhDays]);

  const balance = member.ptoBalanceDays ?? 0;
  const weeklyHours = member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time');
  const employmentLabel = EMPLOYMENT_TYPE_LABELS[member.employmentType ?? 'full_time'];
  const location = member.location ?? 'VN';
  const wfhLabel =
    savedWfhDays.length > 0
      ? `WFH ${savedWfhDays.map((d) => WEEKDAYS.find((w) => w.code === d)?.label).join('/')}`
      : null;

  return (
    <li
      className={`${adminCard} admin-collapse-card ${expanded ? 'admin-collapse-card--expanded' : ''}`}
    >
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="admin-collapse-toggle min-w-0 flex-1 text-left"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <p className="truncate font-bold text-white">{member.name}</p>
            <p className={`${adminBody} truncate`}>{member.email}</p>
          </button>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <span className={member.active ? adminBadgeActive : adminBadgeInactive}>
              {member.active ? 'Active' : 'Deactivated'}
            </span>
            <button
              type="button"
              className={`admin-collapse-chevron shrink-0 text-brand-cyan transition hover:text-white ${
                expanded ? 'admin-collapse-chevron--open' : ''
              }`}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              onClick={() => setExpanded((v) => !v)}
            >
              ▾
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-text-muted">
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
            {wfhLabel ? (
              <>
                <span className="px-1.5 text-white/20" aria-hidden>·</span>
                <span className="text-brand-cyan">{wfhLabel}</span>
              </>
            ) : null}
            {!member.startDate ? (
              <>
                <span className="px-1.5 text-white/20" aria-hidden>·</span>
                <span className="text-brand-pink">No start date</span>
              </>
            ) : null}
          </p>
          <Link
            href={`/admin/kpi/${encodeURIComponent(member.email)}`}
            className={`${adminBtnGhost} ml-auto shrink-0`}
          >
            View KPI
          </Link>
        </div>
      </div>

      <div
        className={`admin-collapse-expand ${expanded ? 'admin-collapse-expand--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="admin-collapse-expand-inner space-y-3 pt-3">
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
            <LevelEditor
              key={`${member.email}-${member.level ?? ''}`}
              level={member.level ?? ''}
              onSave={(next) => patch({ level: next })}
              disabled={loading}
            />
          </div>

          <div>
            <p className={adminLabel}>Role</p>
            <RoleEditor
              key={`${member.email}-${member.role}`}
              role={member.role ?? ''}
              onSave={(next) => patch({ role: next })}
              disabled={loading}
            />
          </div>

          <div>
            <p className={adminLabel}>Location</p>
            <LocationToggle location={member.location ?? 'VN'} onToggle={toggleLocation} disabled={loading} />
          </div>

          <div>
            <p className={adminLabel}>Employment type</p>
            <EmploymentTypeToggle
              value={member.employmentType ?? 'full_time'}
              onChange={(next) => patch({ employmentType: next })}
              disabled={loading}
            />
          </div>

          <div>
            <p className={adminLabel}>Weekly contracted hours (KPI FTE = hours ÷ 40)</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={80}
                step={1}
                className={`${adminInput} max-w-[8rem]`}
                defaultValue={member.weeklyContractedHours ?? defaultWeeklyHours(member.employmentType ?? 'full_time')}
                key={`${member.email}-${member.weeklyContractedHours}-${member.employmentType}`}
                id={`hours-${member.email}`}
                aria-label="Weekly contracted hours"
              />
              <button
                type="button"
                className={adminBtnGhost}
                disabled={loading}
                onClick={() => {
                  const input = document.getElementById(`hours-${member.email}`) as HTMLInputElement | null;
                  const hours = Number(input?.value);
                  if (!(hours > 0)) return;
                  patch({ weeklyContractedHours: hours });
                }}
              >
                Save hours
              </button>
            </div>
          </div>

          <div>
            <p className={adminLabel}>Fixed WFH schedule (click days, then apply — each apply syncs to the shared calendar)</p>
            <FixedWfhDayPicker days={pendingWfhDays} onToggleDay={toggleWfhDay} disabled={loading} />
            {wfhDaysChanged ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className={adminBtnGhost}
                  disabled={loading}
                  onClick={applyWfhSchedule}
                >
                  {loading ? 'Syncing…' : 'Apply schedule'}
                </button>
                <button type="button" className={adminBtnGhost} disabled={loading} onClick={resetWfhSchedule}>
                  Reset
                </button>
              </div>
            ) : null}
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
                Save
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/crew');
      const data = (await res.json()) as ApiErrorBody & { members?: CrewMember[] };
      if (!res.ok) {
        setError(describeApiError(data, 'Could not load crew directory.'));
        return;
      }
      setMembers(data.members ?? []);
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
        <ul className="space-y-4">
          {filtered.map((member) => (
            <CrewRow key={member.email} member={member} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
