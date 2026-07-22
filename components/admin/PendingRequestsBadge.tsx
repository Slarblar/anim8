'use client';

import { useEffect, useState } from 'react';

const POLL_MS = 30_000;

/** Red count badge for the "PTO requests" nav link — polls so it lights up without a manual refresh. */
export function PendingRequestsBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/pto-requests/pending-count');
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) setCount(typeof data.count === 'number' ? data.count : 0);
      } catch {
        // Silently skip — badge just won't update this cycle.
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!count) return null;

  return (
    <span
      title={`${count} pending PTO/WFH request${count === 1 ? '' : 's'}`}
      className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-pink px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_0_8px_rgba(221,11,131,0.65)]"
    >
      {count}
    </span>
  );
}
