'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { initialFromRequest, NewPtoRequestForm } from '@/components/crew/NewPtoRequestForm';
import { HoverTranslate } from '@/components/crew/HoverTranslate';
import { adminAlertError, adminBody } from '@/components/admin/admin-ui';
import { crewT } from '@/lib/crew-translations';
import type { PtoRequest } from '@/lib/pto-requests';

export default function EditPtoRequestPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [request, setRequest] = useState<PtoRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/crew/pto-requests/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = (await res.json()) as { request?: PtoRequest; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.request) {
          setError(data.error ?? 'Could not load this request.');
          return;
        }
        setRequest(data.request);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this request.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="mb-2 text-xs">
          <Link href="/crew/pto" className="font-bold text-brand-cyan transition hover:brightness-125">
            ← PTO / WFH
          </Link>
        </p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          <HoverTranslate en={crewT.en.ptoPage.editRequestTitle} vn={crewT.vn.ptoPage.editRequestTitle} />
        </h1>
        <p className="mt-1 text-sm text-[#8b95a8]">
          <HoverTranslate
            en={crewT.en.ptoPage.editRequestSubtitle}
            vn={crewT.vn.ptoPage.editRequestSubtitle}
          />
        </p>
      </div>

      {loading ? <p className={adminBody}>Loading…</p> : null}
      {error ? <p className={adminAlertError}>{error}</p> : null}
      {request ? (
        <NewPtoRequestForm
          mode="edit"
          requestId={request.id}
          initial={initialFromRequest(request)}
        />
      ) : null}
    </div>
  );
}
