import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { recordFlashcardReview } from '../reviewService';
import { db } from '../db';
import { calculateSM2, DEFAULT_EF, Quality, deriveClampedMasteryLevel } from '../sm2Calculator';
import type { Flashcard } from '../../types';

vi.mock('../db', () => ({
  db: {
    flashcards: {
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('recordFlashcardReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes SM-2 fields for legacy cards on first review', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-03-01T10:00:00Z'));
    const now = new Date();

    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    const expected = calculateSM2({
      quality: Quality.Good,
      repetitions: 0,
      easinessFactor: DEFAULT_EF,
      previousInterval: 1,
    });

    await recordFlashcardReview('card-1', Quality.Good);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    const expectedNextReview = new Date(
      now.getTime() + expected.interval * 24 * 60 * 60 * 1000
    );

    expect(updateData.easinessFactor).toBe(expected.easinessFactor);
    expect(updateData.interval).toBe(expected.interval);
    expect(updateData.repetitions).toBe(expected.repetitions);
    expect(updateData.nextReviewDate?.getTime()).toBe(expectedNextReview.getTime());
  });

  it('updates SM-2 fields using calculateSM2', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-03-01T10:00:00Z'));
    const now = new Date();

    const mockCard: Flashcard = {
      id: 'card-2',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 2,
      reviewDates: [new Date('2026-02-20')],
      firstShownDate: new Date('2026-02-01'),
      easinessFactor: 2.0,
      interval: 6,
      repetitions: 2,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    const expected = calculateSM2({
      quality: Quality.Good,
      repetitions: 2,
      easinessFactor: 2.0,
      previousInterval: 6,
    });

    await recordFlashcardReview('card-2', Quality.Good);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    const expectedNextReview = new Date(
      now.getTime() + expected.interval * 24 * 60 * 60 * 1000
    );

    expect(updateData.easinessFactor).toBe(expected.easinessFactor);
    expect(updateData.interval).toBe(expected.interval);
    expect(updateData.repetitions).toBe(expected.repetitions);
    expect(updateData.nextReviewDate?.getTime()).toBe(expectedNextReview.getTime());
  });

  it('resets interval for Quality.Again', async () => {
    const mockCard: Flashcard = {
      id: 'card-3',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 4,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
      easinessFactor: 2.1,
      interval: 10,
      repetitions: 4,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-3', Quality.Again);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;

    expect(updateData.interval).toBe(1);
    expect(updateData.repetitions).toBe(0);
  });

  it('increases easinessFactor for Quality.Easy', async () => {
    const mockCard: Flashcard = {
      id: 'card-4',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 3,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
      easinessFactor: 1.8,
      interval: 3,
      repetitions: 1,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    const expected = calculateSM2({
      quality: Quality.Easy,
      repetitions: 1,
      easinessFactor: 1.8,
      previousInterval: 3,
    });

    await recordFlashcardReview('card-4', Quality.Easy);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;

    expect(updateData.easinessFactor).toBe(expected.easinessFactor);
    expect(updateData.easinessFactor).toBeGreaterThan(1.8);
  });

  it('updates masteryLevel to match easinessFactor', async () => {
    const mockCard: Flashcard = {
      id: 'card-5',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 1,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
      easinessFactor: 1.6,
      interval: 1,
      repetitions: 0,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    const expected = calculateSM2({
      quality: Quality.Good,
      repetitions: 0,
      easinessFactor: 1.6,
      previousInterval: 1,
    });
    const expectedMastery = deriveClampedMasteryLevel(expected.easinessFactor);

    await recordFlashcardReview('card-5', Quality.Good);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;

    expect(updateData.masteryLevel).toBe(expectedMastery);
  });

  it('sets firstShownDate on first review', async () => {
    const mockCard: Flashcard = {
      id: 'card-6',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      firstShownDate: undefined,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-6', Quality.Good);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-6',
      expect.objectContaining({
        firstShownDate: expect.any(Date),
      })
    );
  });

  it('handles missing flashcard gracefully', async () => {
    vi.mocked(db.flashcards.get).mockResolvedValue(undefined);

    await expect(recordFlashcardReview('missing-card', Quality.Good)).resolves.toBeUndefined();

    expect(db.flashcards.update).not.toHaveBeenCalled();
  });
});
