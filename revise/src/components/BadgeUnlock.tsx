import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getBadgeMetadata, BadgeType } from '../lib/badgeService';

export interface BadgeUnlockProps {
  badgeId: BadgeType;
  duration?: number; // display duration in seconds (default: 3)
}

export const BadgeUnlock = React.memo(function BadgeUnlock({ 
  badgeId, 
  duration = 3 
}: BadgeUnlockProps) {
  // Get badge metadata
  const badge = getBadgeMetadata(badgeId);

  // Check for prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Return null if badge not found
  if (!badge) {
    return null;
  }

  // Memoize container animation
  const containerVariants = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  }), []);

  // Memoize card animation (scale pop)
  const cardVariants = useMemo(() => ({
    initial: { scale: 0 },
    animate: { scale: 1 },
  }), []);

  // Memoize card transition (spring bounce)
  const cardTransition = useMemo(() => ({
    type: prefersReducedMotion ? 'tween' : 'spring',
    duration: prefersReducedMotion ? 0.3 : undefined,
    bounce: prefersReducedMotion ? 0 : 0.5,
  }), [prefersReducedMotion]);

  // Memoize icon rotation animation
  const iconVariants = useMemo(() => ({
    initial: { rotate: 0 },
    animate: prefersReducedMotion 
      ? { rotate: 0 }
      : { rotate: [0, 5, -5, 0] },
  }), [prefersReducedMotion]);

  const iconTransition = useMemo(() => ({
    duration: 0.6,
    repeat: prefersReducedMotion ? 0 : Infinity,
    repeatDelay: 0.5,
  }), [prefersReducedMotion]);

  // Memoize condition pulse animation
  const conditionVariants = useMemo(() => ({
    initial: { y: 0 },
    animate: prefersReducedMotion 
      ? { y: 0 }
      : { y: [0, -2, 0] },
  }), [prefersReducedMotion]);

  const conditionTransition = useMemo(() => ({
    duration: 0.8,
    repeat: prefersReducedMotion ? 0 : Infinity,
  }), [prefersReducedMotion]);

  // Calculate sparkle positions (8 sparkles in a circle)
  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 150;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      return { id: i, x, y, delay: i * 0.1 };
    });
  }, []);

  // Memoize sparkle animation
  const sparkleVariants = useMemo(() => ({
    initial: { scale: 0, opacity: 1, x: 0, y: 0 },
    animate: (custom: { x: number; y: number }) => ({
      scale: prefersReducedMotion ? 0.5 : 1,
      opacity: 0,
      x: custom.x,
      y: custom.y,
    }),
  }), [prefersReducedMotion]);

  return (
    <motion.div
      data-testid="badge-unlock"
      aria-hidden="true"
      initial={containerVariants.initial}
      animate={containerVariants.animate}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Sparkle effects container */}
      <div 
        data-testid="badge-sparkles" 
        className="absolute inset-0 flex items-center justify-center"
      >
        {sparkles.map(sparkle => (
          <motion.div
            key={sparkle.id}
            custom={{ x: sparkle.x, y: sparkle.y }}
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: prefersReducedMotion ? 0.3 : 1,
              delay: sparkle.delay,
            }}
            className="absolute text-2xl"
          >
            ✨
          </motion.div>
        ))}
      </div>

      {/* Badge card */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        transition={cardTransition}
        className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm text-center"
      >
        {/* Badge icon with rotation */}
        <motion.div
          variants={iconVariants}
          initial="initial"
          animate="animate"
          transition={iconTransition}
          className="text-6xl mb-4"
        >
          {badge.icon}
        </motion.div>

        {/* "Badge Unlocked!" heading */}
        <h2 className="text-2xl font-bold text-primary-600 mb-2">
          Badge Unlocked!
        </h2>

        {/* Badge name */}
        <p className="text-xl font-semibold text-gray-800 mb-2">
          {badge.name}
        </p>

        {/* Badge description */}
        <p className="text-base text-gray-600 mb-4">
          {badge.description}
        </p>

        {/* Condition badge with pulse */}
        <motion.div
          variants={conditionVariants}
          initial="initial"
          animate="animate"
          transition={conditionTransition}
          className="inline-block bg-primary-100 text-primary-700 text-sm px-3 py-1 rounded-full"
        >
          {badge.condition}
        </motion.div>
      </motion.div>
    </motion.div>
  );
});
