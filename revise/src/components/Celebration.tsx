import { useMemo } from 'react';
import { motion } from 'framer-motion';

export type CelebrationType = 'confetti' | 'hearts' | 'sparkles';

export interface CelebrationProps {
  type: CelebrationType;
  duration: number;
  className?: string;
}

export function Celebration({ type, duration, className = '' }: CelebrationProps) {
  const particles = useMemo(() => {
    if (type === 'confetti') {
      return Array.from({ length: 30 }, (_, i) => ({
        id: `confetti-${i}`,
        emoji: ['🎉', '🎊', '⭐', '✨', '🌟'][i % 5],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random(),
      }));
    }

    if (type === 'hearts') {
      return Array.from({ length: 15 }, (_, i) => ({
        id: `heart-${i}`,
        emoji: '♥',
        left: 40 + Math.random() * 20, // Center area
        delay: i * 0.15,
        duration: 2,
      }));
    }

    if (type === 'sparkles') {
      return Array.from({ length: 20 }, (_, i) => ({
        id: `sparkle-${i}`,
        emoji: '✨',
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: i * 0.075,
        duration: 1.5,
      }));
    }

    return [];
  }, [type]);

  const getAnimation = (particle: typeof particles[0]) => {
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
  };

  return (
    <div
      data-testid="celebration-container"
      className={`celebration-${type} fixed inset-0 pointer-events-none ${className}`}
      style={{ '--celebration-duration': `${duration}ms` } as React.CSSProperties}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute text-2xl"
          style={{
            left: `${particle.left}%`,
            top: type === 'sparkles' ? `${particle.top}%` : type === 'hearts' ? 'auto' : '0',
            bottom: type === 'hearts' ? '10%' : 'auto',
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
}
