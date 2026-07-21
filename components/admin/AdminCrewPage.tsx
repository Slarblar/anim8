'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrewMember } from '@/lib/crew-directory';
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
          body: JSON.stringify({ name, email, role, startDate: startDate || undefined }),
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
        onCreated();
      } catch {
        setError('Could not add crew member. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, role, startDate, onCreated]
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
            Start date (optional)
          </label>
          <input
            id="crewStart"
            type="date"
            className={adminInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleActive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crew/${encodeURIComponent(member.email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !member.active }),
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
  }, [member.email, member.active, onChanged]);

  return (
    <li className={`${adminCard} space-y-2`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">{member.name}</p>
          <p className={adminBody}>{member.email}</p>
          {member.role ? <p className="mt-1 text-xs text-text-muted">{member.role}</p> : null}
        </div>
        <span className={member.active ? adminBadgeActive : adminBadgeInactive}>
          {member.active ? 'Active' : 'Deactivated'}
        </span>
      </div>
      {error ? <p className={adminAlertError}>{error}</p> : null}
      <button type="button" className={adminBtnGhost} onClick={toggleActive} disabled={loading}>
        {member.active ? 'Deactivate' : 'Reactivate'}
      </button>
    </li>
  );
}

export function AdminCrewPage() {
  const [members, setMembers] = useState<CrewMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      {members === null ? (
        <p className={adminBody}>Loading crew directory…</p>
      ) : members.length === 0 ? (
        <p className={adminBody}>No crew members yet.</p>
      ) : (
        <ul className="space-y-4">
          {members.map((member) => (
            <CrewRow key={member.email} member={member} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
