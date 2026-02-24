import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordFlashcardReview } from '../reviewService';
import { db } from '../db';
import type { Flashcard } from '../../types';

// Mock the db module
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

  it('updates mastery level on correct answer', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 2,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        masteryLevel: 3,
      })
    );
  });

  it('updates mastery level on incorrect answer', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 3,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', false);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        masteryLevel: 2,
      })
    );
  });

  it('appends review date to reviewDates array', async () => {
    const existingDate = new Date('2026-02-20');
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 1,
      reviewDates: [existingDate],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    
    expect(updateData.reviewDates).toHaveLength(2);
    expect(updateData.reviewDates![0]).toEqual(existingDate);
    expect(updateData.reviewDates![1]).toBeInstanceOf(Date);
  });

  it('sets firstShownDate on first review', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      firstShownDate: undefined,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        firstShownDate: expect.any(Date),
      })
    );
  });

  it('handles missing flashcard gracefully', async () => {
    vi.mocked(db.flashcards.get).mockResolvedValue(undefined);

    // Should not throw
    await expect(recordFlashcardReview('missing-card', true)).resolves.toBeUndefined();
    
    expect(db.flashcards.update).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 2,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockRejectedValue(new Error('DB error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    await expect(recordFlashcardReview('card-1', true)).resolves.toBeUndefined();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('trims reviewDates array if exceeds 100 entries', async () => {
    const manyDates = Array.from({ length: 105 }, (_, i) => 
      new Date(2026, 0, i + 1)
    );
    
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 4,
      reviewDates: manyDates,
      firstShownDate: new Date('2026-01-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    
    // Should keep only last 100 dates (trim oldest 6)
    expect(updateData.reviewDates).toHaveLength(100);
  });
});
