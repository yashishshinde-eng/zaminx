import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Animates a number from 0 → `target` over `duration` ms using requestAnimationFrame
 * with an ease-out curve. Returns `target` instantly when the user prefers reduced
 * motion (no animation, accessible) or when `target` is 0/undefined.
 *
 * @example const display = useCountUp(wallets.total, 800);
 */
export function useCountUp(target: number, duration = 800): number {
  const prefersReduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const goal = Number.isFinite(target) ? target : 0;

    // Skip the animation entirely for reduced motion or a zero target.
    if (prefersReduced || goal === 0) {
      setValue(goal);
      return;
    }

    start.current = null;
    const animate = (now: number) => {
      if (start.current === null) start.current = now;
      const elapsed = now - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(goal * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate);
      } else {
        setValue(goal); // snap to exact final value
      }
    };

    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, prefersReduced]);

  return value;
}