import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface XPGainProps {
  amount: number;
  x?: number;      // x position in px
  y?: number;      // y position in px
  duration?: number; // animation duration in seconds
}

export const XPGain = React.memo(function XPGain({ amount, x, y, duration = 2 }: XPGainProps) {
  // Check for prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Memoize animation variants
  const animationVariants = useMemo(() => ({
    initial: { opacity: 1, y: 0 },
    animate: { 
      opacity: 0, 
      y: prefersReducedMotion ? -20 : -100 
    },
  }), [prefersReducedMotion]);

  // Memoize transition
  const transition = useMemo(() => ({
    duration: prefersReducedMotion ? 0.5 : duration,
  }), [prefersReducedMotion, duration]);

  // Determine positioning
  const hasCustomPosition = x !== undefined && y !== undefined;
  const positionClasses = hasCustomPosition ? '' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
  const positionStyles = hasCustomPosition ? { left: `${x}px`, top: `${y}px` } : {};

  return (
    <motion.div
      data-testid="xp-gain"
      aria-hidden="true"
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      transition={transition}
      className={`fixed pointer-events-none z-50 ${positionClasses}`}
      style={positionStyles}
    >
      <div className="flex items-center gap-1 text-lg font-bold">
        <span className="text-primary-500">♥</span>
        <span className="text-primary-600">+{amount}</span>
      </div>
    </motion.div>
  );
});
