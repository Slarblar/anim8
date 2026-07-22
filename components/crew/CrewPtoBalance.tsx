'use client';

import { useEffect, useState } from 'react';
import { adminBody, adminCard } from '@/components/admin/admin-ui';
import { useCrewLanguage } from '@/lib/crew-language';
import { crewT } from '@/lib/crew-translations';
import { HoverTranslate } from './HoverTranslate';

type PtoBalance = {
  balanceDays: number | null;
  entitlementDays: number | null;
  updatedAt: string | null;
};

export function CrewPtoBalance() {
  const { lang } = useCrewLanguage();
  const c = crewT[lang].ptoPage;
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
        if (!cancelled) setError(c.balanceLoadError);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return null;
  if (!balance || balance.balanceDays === null) return null;

  return (
    <div className={`${adminCard} flex flex-wrap items-baseline justify-between gap-3`}>
      <div>
        <p className="text-3xl font-black text-brand-cyan">
          {balance.balanceDays}
          <span className="ml-1.5 text-sm font-bold text-text-muted">
            <HoverTranslate
              en={crewT.en.ptoPage.dayAvailable(balance.balanceDays)}
              vn={crewT.vn.ptoPage.dayAvailable(balance.balanceDays)}
            />
          </span>
        </p>
        <p className={`${adminBody} mt-1`}>
          <HoverTranslate
            en={crewT.en.ptoPage.entitledTo(balance.entitlementDays)}
            vn={crewT.vn.ptoPage.entitledTo(balance.entitlementDays)}
          />
        </p>
      </div>
    </div>
  );
}
