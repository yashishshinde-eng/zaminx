import { MotionConfig, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared framer-motion variants + timing. framer-motion is installed but was
 * previously unused — this is the single source of truth for the panel's motion
 * language. `MotionProvider` wraps the app in `reducedMotion="user"` so the OS
 * preference is respected automatically (the CSS guard in index.css covers the
 * pure-CSS animations; this covers JS-driven ones).
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const DURATION = 0.4;

/** Enter from below — used by staggered dashboard cards. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE_OUT } },
};

/** Simple opacity enter. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Pop-in with a slight scale — used by dropdowns, toasts, modals. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } },
};

/** Container that staggers its children's `visible` transition. */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** A child of `staggerContainer` — pair with `fadeUp` (or any enter variant). */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE_OUT } },
};

/** Page-level transition keyed by route pathname in AppShell. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: EASE_OUT } },
};

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}