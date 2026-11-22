'use client';

import { useEffect, useState } from 'react';
import { describeKpiPull, kpiPullAgoLabel } from '@/lib/kpi-shared';
import { HoverTranslate } from './HoverTranslate';

/** Age of the KPI snapshot currently on screen, under the refresh control. */
export function KpiPullTime({
  fetchedAt,
  translate = false,
}: {
  fetchedAt: string | null;
  translate?: boolean;
}) {
  // Null until the browser mounts, so the clock uses the viewer's zone rather than the server's.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!fetchedAt || now == null) return null;
  const described = describeKpiPull(fetchedAt, new Date(now));
  if (!described) return null;

  const en = `Last Asana pull ${described.clock} · ${kpiPullAgoLabel(described.minutesAgo, 'en')}`;
  const vn = `Lần kéo Asana ${described.clock} · ${kpiPullAgoLabel(described.minutesAgo, 'vn')}`;

  return (
    <p className="text-right text-[11px] font-mono leading-snug text-text-muted">
      <time dateTime={fetchedAt}>{translate ? <HoverTranslate en={en} vn={vn} /> : en}</time>
    </p>
  );
}
