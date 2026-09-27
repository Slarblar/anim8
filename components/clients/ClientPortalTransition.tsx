'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Fades client portal routes in. CSS, not AnimatePresence: a waiting exit in the
 * App Router can finish at opacity 0 and never show the next page.
 */
export function ClientPortalTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="portal-route-in">
      {children}
    </div>
  );
}
