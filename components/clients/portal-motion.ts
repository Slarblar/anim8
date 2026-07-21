import type { Transition, Variants } from 'framer-motion';

/** Premium ease — smooth deceleration, no bounce */
export const portalMotionEase = [0.22, 1, 0.36, 1] as const;

export const portalMotionTransition: Transition = {
  duration: 0.5,
  ease: portalMotionEase,
};

export const portalPageStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const portalFadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: portalMotionEase },
  },
};

export const portalFormReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: portalMotionEase, delay: 0.08 },
  },
};

export const portalFieldStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.18,
    },
  },
};

export const portalFieldItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: portalMotionEase },
  },
};

export const portalActionsReveal: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: portalMotionEase, delay: 0.35 },
  },
};

export const portalAlertReveal: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: portalMotionEase },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: portalMotionEase },
  },
};

/** Instant variants when user prefers reduced motion */
export const portalInstant: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
  exit: { opacity: 1 },
};

export function portalVariants(prefersReduced: boolean | null, variants: Variants): Variants {
  return prefersReduced ? portalInstant : variants;
}
