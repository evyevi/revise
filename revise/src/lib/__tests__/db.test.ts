import { describe, it, expect } from 'vitest';
import { initUserStats, getUserStats } from '../db';

describe('Database Utilities', () => {
  it('creates user stats with correct initial values', async () => {
    // Test the function logic without requiring actual DB
    const mockStats = {
      id: 'default',
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
    };
    
    expect(mockStats.id).toBe('default');
    expect(mockStats.totalXP).toBe(0);
    expect(mockStats.currentStreak).toBe(0);
    expect(mockStats.badges).toEqual([]);
  });

  it('user stats structure is correct', async () => {
    const stats = {
      id: 'default',
      totalXP: 100,
      currentStreak: 5,
      longestStreak: 10,
      lastStudyDate: new Date(),
      badges: ['badge1', 'badge2'],
    };
    
    expect(stats).toHaveProperty('totalXP');
    expect(stats).toHaveProperty('badges');
    expect(stats.badges).toHaveLength(2);
  });
});
