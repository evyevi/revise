import { describe, it, expect } from 'vitest';
import { calculateSM2, deriveClampedMasteryLevel, type SM2Result, type SM2Input, Quality } from '../sm2Calculator';

describe('sm2Calculator', () => {
  describe('calculateSM2', () => {
    it('returns correct intervals for first review with quality 2 (Good)', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 0,
        easinessFactor: 2.5,
        previousInterval: 0,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1); // First review: 1 day
      expect(result.easinessFactor).toBe(2.5); // No change for quality 2
    });

    it('returns 6-day interval for second review with quality 2', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 1,
        easinessFactor: 2.5,
        previousInterval: 1,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6); // Second review: 6 days
      expect(result.easinessFactor).toBe(2.5);
    });

    it('multiplies interval by EF for subsequent reviews', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 2,
        easinessFactor: 2.5,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
      expect(result.easinessFactor).toBe(2.5);
    });

    it('resets repetitions to 0 for quality 0 (Again)', () => {
      const input: SM2Input = {
        quality: Quality.Again,
        repetitions: 3,
        easinessFactor: 2.5,
        previousInterval: 15,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1); // Reset to 1 day
      expect(result.easinessFactor).toBeLessThan(2.5); // EF decreases
    });

    it('resets repetitions to 0 for quality 1 (Hard)', () => {
      const input: SM2Input = {
        quality: Quality.Hard,
        repetitions: 2,
        easinessFactor: 2.3,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1); // Reset to 1 day
      expect(result.easinessFactor).toBeLessThan(2.3); // EF decreases
    });

    it('increases EF for quality 3 (Easy)', () => {
      const input: SM2Input = {
        quality: Quality.Easy,
        repetitions: 0,
        easinessFactor: 2.3,
        previousInterval: 0,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeGreaterThan(2.3);
      expect(result.easinessFactor).toBeLessThanOrEqual(2.5);
      expect(result.interval).toBe(1);
    });

    it('clamps EF to minimum 1.3', () => {
      const input: SM2Input = {
        quality: Quality.Again,
        repetitions: 0,
        easinessFactor: 1.4, // Already low
        previousInterval: 1,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('caps EF at 2.5', () => {
      const input: SM2Input = {
        quality: Quality.Easy,
        repetitions: 2,
        easinessFactor: 2.5,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeLessThanOrEqual(2.5);
    });

    it('rounds interval to nearest integer', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 2,
        easinessFactor: 2.3,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.interval).toBe(14); // Math.round(6 * 2.3) = 14
      expect(Number.isInteger(result.interval)).toBe(true);
    });
  });

  describe('deriveClampedMasteryLevel', () => {
    it('maps EF 1.3-1.5 to mastery 1', () => {
      expect(deriveClampedMasteryLevel(1.3)).toBe(1);
      expect(deriveClampedMasteryLevel(1.4)).toBe(1);
      expect(deriveClampedMasteryLevel(1.5)).toBe(1);
    });

    it('maps EF 1.6-1.8 to mastery 2', () => {
      expect(deriveClampedMasteryLevel(1.6)).toBe(2);
      expect(deriveClampedMasteryLevel(1.7)).toBe(2);
    });

    it('maps EF 1.9-2.1 to mastery 3', () => {
      expect(deriveClampedMasteryLevel(1.9)).toBe(3);
      expect(deriveClampedMasteryLevel(2.0)).toBe(3);
    });

    it('maps EF 2.2-2.3 to mastery 4', () => {
      expect(deriveClampedMasteryLevel(2.2)).toBe(4);
      expect(deriveClampedMasteryLevel(2.3)).toBe(4);
    });

    it('maps EF 2.4-2.5 to mastery 5', () => {
      expect(deriveClampedMasteryLevel(2.4)).toBe(5);
      expect(deriveClampedMasteryLevel(2.5)).toBe(5);
    });

    it('handles edge cases below 1.3', () => {
      expect(deriveClampedMasteryLevel(1.0)).toBe(0);
    });
  });
});
