import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initUserStats, getUserStats, updateUserStatsOnSessionComplete } from '../db';

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

describe('updateUserStatsOnSessionComplete', () => {
  beforeEach(async () => {
    await db.userStats.clear();
    await initUserStats();
    vi.clearAllMocks();
  });

  it('updates totalXP with earned XP', async () => {
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 100,
    });

    expect(result.totalXP).toBe(100);
  });

  it('adds new badges to user stats without duplicates', async () => {
    // First session with badge
    const result1 = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
      newBadges: ['first-step', 'dedicated-student'],
    });

    expect(result1.badges).toEqual(['first-step', 'dedicated-student']);

    // Second session with one duplicate and one new badge
    const result2 = await updateUserStatsOnSessionComplete({
      xpEarned: 30,
      newBadges: ['dedicated-student', 'on-fire'],
    });

    expect(result2.badges).toEqual(['first-step', 'dedicated-student', 'on-fire']);
  });

  it('increments streak on first study', async () => {
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
    });

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('increments streak when studying on consecutive days', async () => {
    // Set up: study yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    await db.userStats.update('default', {
      currentStreak: 2,
      longestStreak: 2,
      lastStudyDate: yesterday,
    });

    // Study today
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
    });

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('maintains streak when studying multiple times on same day', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.userStats.update('default', {
      currentStreak: 5,
      longestStreak: 5,
      lastStudyDate: today,
    });

    // Study again today
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
    });

    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('updates lastStudyDate to today', async () => {
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const studyDate = new Date(result.lastStudyDate!);
    studyDate.setHours(0, 0, 0, 0);

    expect(studyDate.getTime()).toBe(today.getTime());
  });

  it('updates longestStreak when current exceeds it', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.userStats.update('default', {
      currentStreak: 4,
      longestStreak: 4,
      lastStudyDate: yesterday,
    });

    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 50,
    });

    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('combines multiple context properties correctly', async () => {
    const result = await updateUserStatsOnSessionComplete({
      xpEarned: 150,
      newBadges: ['quiz-champion'],
      quizScoresInSession: [100, 85],
      flashcardsCompleted: 10,
    });

    expect(result.totalXP).toBe(150);
    expect(result.badges).toContain('quiz-champion');
    expect(result.currentStreak).toBe(1);
  });
});
