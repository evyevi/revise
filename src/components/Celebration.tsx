/**
 * Celebration Animation Component
 * Uses Math.random() inside useMemo for generating random particle positions.
 */
import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

export type CelebrationType = 'confetti' | 'hearts' | 'sparkles';

export interface CelebrationProps {
  type: CelebrationType;
  duration: number;
  className?: string;
}

type ConfettiParticle = {
  id: string;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
};

type HeartParticle = {
  id: string;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
};

type SparkleParticle = {
  id: string;
  emoji: string;
  left: number;
  top: number;
  delay: number;
  duration: number;
};

type Particle = ConfettiParticle | HeartParticle | SparkleParticle;

export const Celebration = React.memo(function Celebration({ 
  type, 
  duration, 
  className = '' 
}: CelebrationProps) {
  // Check for reduced motion preference (WCAG compliance)
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Generate random particle positions - intentionally impure in useMemo
  // to create stable random values for the component's lifetime
  /* eslint-disable react-hooks/purity */
  const particles = useMemo(() => {
    if (type === 'confetti') {
      return Array.from({ length: 30 }, (_, i) => ({
        id: `confetti-${i}`,
        emoji: ['🎉', '🎊', '⭐', '✨', '🌟'][i % 5],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random(),
      })) as ConfettiParticle[];
    }

    if (type === 'hearts') {
      return Array.from({ length: 15 }, (_, i) => ({
        id: `heart-${i}`,
        emoji: '♥',
        left: 40 + Math.random() * 20, // Center area
        delay: i * 0.15,
        duration: 2,
      })) as HeartParticle[];
    }

    if (type === 'sparkles') {
      return Array.from({ length: 20 }, (_, i) => ({
        id: `sparkle-${i}`,
        emoji: '✨',
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: i * 0.075,
        duration: 1.5,
      })) as SparkleParticle[];
    }

    return [];
  }, [type]);
  /* eslint-enable react-hooks/purity */

  // Memoize getAnimation function to prevent recreation on every render
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAnimation = useCallback((_particle: Particle) => {
    if (type === 'confetti') {
      return {
        y: ['-10%', '110vh'],
        x: [0, (Math.random() - 0.5) * 100],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        opacity: [1, 1, 0],
      };
    }

    if (type === 'hearts') {
      return {
        y: [0, -100],
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
      };
    }

    if (type === 'sparkles') {
      return {
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1.2, 0],
      };
    }

    return {};
  }, [type]);

  // Memoize style object to prevent recreation on every render
  const containerStyle = useMemo(
    () => ({ '--celebration-duration': `${duration}ms` } as React.CSSProperties),
    [duration]
  );

  // If user prefers reduced motion, render nothing
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div
      data-testid="celebration-container"
      className={`celebration-${type} fixed inset-0 pointer-events-none ${className}`}
      style={containerStyle}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute text-2xl"
          style={{
            left: `${particle.left}%`,
            top: type === 'sparkles' ? `${(particle as SparkleParticle).top}%` : type === 'hearts' ? 'auto' : '0',
            bottom: type === 'hearts' ? '10%' : 'auto',
            willChange: 'transform, opacity',
          }}
          initial={false}
          animate={getAnimation(particle)}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeIn',
          }}
        >
          {particle.emoji}
        </motion.div>
      ))}
    </div>
  );
});
