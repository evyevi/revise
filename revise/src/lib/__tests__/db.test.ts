import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, initUserStats, getUserStats } from '../db';

describe('Database - User Stats', () => {
  beforeEach(async () => {
    // Clear all data before each test
    await db.userStats.clear();
  });

  it('initializes user stats and saves to database', async () => {
    // Call the actual function
    const stats = await initUserStats();
    
    // Verify returned values
    expect(stats.id).toBe('default');
    expect(stats.totalXP).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.badges).toEqual([]);
    
    // Verify it was actually saved to the database
    const savedStats = await db.userStats.get('default');
    expect(savedStats).toBeDefined();
    expect(savedStats?.totalXP).toBe(0);
  });

  it('retrieves existing user stats without creating duplicates', async () => {
    // Initialize once
    const stats1 = await initUserStats();
    expect(stats1.id).toBe('default');
    
    // Initialize again - should return existing, not create duplicate
    const stats2 = await initUserStats();
    expect(stats2.id).toBe('default');
    
    // Verify only one record exists in database
    const allStats = await db.userStats.toArray();
    expect(allStats).toHaveLength(1);
  });

  it('getUserStats retrieves existing stats if they exist', async () => {
    // Initialize first
    await initUserStats();
    
    // Get stats
    const stats = await getUserStats();
    
    // Verify retrieval works
    expect(stats).toBeDefined();
    expect(stats.id).toBe('default');
    expect(stats.totalXP).toBe(0);
  });

  it('getUserStats initializes stats if they do not exist', async () => {
    // Database is empty (cleared in beforeEach)
    const stats = await getUserStats();
    
    // Should create and return new stats
    expect(stats).toBeDefined();
    expect(stats.id).toBe('default');
    expect(stats.totalXP).toBe(0);
    
    // Verify it's in database now
    const count = await db.userStats.count();
    expect(count).toBe(1);
  });

  it('persists and retrieves modified stats', async () => {
    // Initialize
    await initUserStats();
    
    // Modify stats directly in database
    await db.userStats.update('default', {
      totalXP: 500,
      currentStreak: 7,
      badges: ['badge1', 'badge2'],
    });
    
    // Retrieve and verify modifications persisted
    const stats = await getUserStats();
    expect(stats.totalXP).toBe(500);
    expect(stats.currentStreak).toBe(7);
    expect(stats.badges).toEqual(['badge1', 'badge2']);
  });
});
