'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { portalRoute, portalVariants } from './portal-motion';

/** Crossfades client portal routes. Lives in the layout so it survives navigation. */
export function ClientPortalTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const variants = portalVariants(!!reduce, portalRoute);

  return (
    <AnimatePresence mode="wait" initial>
      <motion.div key={pathname} variants={variants} initial="hidden" animate="show" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
