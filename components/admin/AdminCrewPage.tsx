'use client';

import { useCallback, useEffect, useState } from 'react';
import { annualLeaveEntitlementDays, type CrewMember } from '@/lib/crew-directory';
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
} from './admin-ui';

function AddCrewForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
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
            startDate: startDate || undefined,
            initialPtoBalanceDays: initialBalance ? Number(initialBalance) : undefined,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Could not add crew member.');
          return;
        }
        setName('');
        setEmail('');
        setRole('');
        setStartDate('');
        setInitialBalance('');
        onCreated();
      } catch {
        setError('Could not add crew member. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, role, startDate, initialBalance, onCreated]
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
          <label className={adminLabel} htmlFor="crewRole">
            Role (optional)
          </label>
          <input
            id="crewRole"
            className={adminInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="3D Artist"
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="crewStart">
            Start date (optional — used for PTO tenure bonus)
          </label>
          <input
            id="crewStart"
            type="date"
            className={adminInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
      </div>

      {error ? <p className={adminAlertError}>{error}</p> : null}

      <button type="submit" className={adminBtnPrimary} disabled={submitting}>
        {submitting ? 'Adding…' : 'Add crew member'}
      </button>
    </form>
  );
}

function CrewRow({ member, onChanged }: { member: CrewMember; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [editingStart, setEditingStart] = useState(false);
  const [startDateInput, setStartDateInput] = useState(member.startDate ?? '');

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
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Action failed.');
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

  const saveStartDate = useCallback(() => {
    patch({ startDate: startDateInput || null });
    setEditingStart(false);
  }, [startDateInput, patch]);

  const balance = member.ptoBalanceDays ?? 0;

  return (
    <li
      className={`${adminCard} admin-collapse-card ${expanded ? 'admin-collapse-card--expanded' : ''}`}
    >
      <button
        type="button"
        className="admin-collapse-toggle flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-bold text-white">{member.name}</p>
            <span className={member.active ? adminBadgeActive : adminBadgeInactive}>
              {member.active ? 'Active' : 'Deactivated'}
            </span>
          </div>
          <p className={`${adminBody} truncate`}>{member.email}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            {member.role ? <span className="text-text-muted">{member.role}</span> : null}
            <span className="font-mono text-brand-cyan">
              {balance} day{balance === 1 ? '' : 's'} PTO
            </span>
            {!member.startDate ? <span className="text-brand-pink">No start date</span> : null}
          </p>
        </div>
        <span
          className={`admin-collapse-chevron mt-0.5 shrink-0 text-brand-cyan ${expanded ? 'admin-collapse-chevron--open' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={adminBtnGhost}
              onClick={() => patch({ active: !member.active })}
              disabled={loading}
            >
              {member.active ? 'Deactivate' : 'Reactivate'}
            </button>
            <button type="button" className={adminBtnGhost} onClick={() => setShowAdjust((v) => !v)}>
              Adjust balance
            </button>
            <button type="button" className={adminBtnGhost} onClick={() => setEditingStart((v) => !v)}>
              {member.startDate ? 'Edit start date' : 'Set start date'}
            </button>
          </div>

          {editingStart ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                className={`${adminInput} max-w-[12rem]`}
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
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
      const data = (await res.json()) as { members?: CrewMember[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not load crew directory.');
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
      member.role.toLowerCase().includes(q)
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
          placeholder="Search by name, email, or role…"
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
