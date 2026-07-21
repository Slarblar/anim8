'use client';

import { useEffect, useState } from 'react';
import { adminBody, adminCard } from '@/components/admin/admin-ui';

type PtoBalance = {
  balanceDays: number | null;
  entitlementDays: number | null;
  updatedAt: string | null;
};

export function CrewPtoBalance() {
  const [balance, setBalance] = useState<PtoBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/crew/pto-balance')
      .then((res) => res.json())
      .then((data: PtoBalance & { error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setBalance(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your PTO balance.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;
  if (!balance || balance.balanceDays === null) return null;

  return (
    <div className={`${adminCard} flex flex-wrap items-baseline justify-between gap-3`}>
      <div>
        <p className="text-3xl font-black text-brand-cyan">
          {balance.balanceDays}
          <span className="ml-1.5 text-sm font-bold text-text-muted">
            day{balance.balanceDays === 1 ? '' : 's'} available
          </span>
        </p>
        <p className={`${adminBody} mt-1`}>
          Entitled to {balance.entitlementDays}/year · accrues monthly (Handbook 3.7)
        </p>
      </div>
    </div>
  );
}
