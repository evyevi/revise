import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Progress } from '../Progress';
import { db } from '../../lib/db';
import type { Flashcard, StudyPlan, Topic } from '../../types';

function renderProgress() {
  return render(
    <MemoryRouter>
      <Progress />
    </MemoryRouter>
  );
}

// Helper to create a topic
function createTopic(id: string, name: string): Topic {
  return {
    id,
    name,
    importance: 'high' as const,
    keyPoints: [],
  };
}

// Helper to create SM-2 flashcard
function createSM2Flashcard(
  id: string,
  topicId: string,
  easinessFactor: number,
  interval: number,
  nextReviewDate: Date,
): Flashcard {
  return {
    id,
    topicId,
    front: `Front ${id}`,
    back: `Back ${id}`,
    reviewDates: [],
    masteryLevel: 0, // Will be overridden by SM-2
    easinessFactor,
    interval,
    repetitions: interval === 1 ? 1 : interval === 6 ? 2 : 3,
    nextReviewDate,
  };
}

// Helper to create legacy flashcard (no SM-2 fields)
function createLegacyFlashcard(id: string, topicId: string, masteryLevel: number): Flashcard {
  return {
    id,
    topicId,
    front: `Front ${id}`,
    back: `Back ${id}`,
    reviewDates: [],
    masteryLevel: masteryLevel as 0 | 1 | 2 | 3 | 4 | 5,
  };
}

describe('Progress page', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('shows loading spinner initially', () => {
    renderProgress();
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });

  it('renders empty state sections', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText(/no study plans yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no quiz scores yet/i)).toBeInTheDocument();
    });
  });

  it('renders overview stats with data', async () => {
    await db.userStats.add({
      id: 'default',
      totalXP: 150,
      currentStreak: 2,
      longestStreak: 4,
      badges: ['first-step'],
    });

    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('renders badge showcase', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('First Step')).toBeInTheDocument();
      expect(screen.getByText('On Fire!')).toBeInTheDocument();
    });
  });

  // SM-2 Tests
  describe('SM-2 Dashboard Features', () => {
    beforeEach(async () => {
      // Create a study plan with topics
      const topic1 = createTopic('topic1', 'Algebra');
      const topic2 = createTopic('topic2', 'Geometry');
      
      const plan: StudyPlan = {
        id: 'plan1',
        subject: 'Math',
        testDate: new Date('2026-04-01'),
        createdDate: new Date('2026-03-01'),
        totalDays: 30,
        suggestedMinutesPerDay: 60,
        topics: [topic1, topic2],
      };

      await db.studyPlans.add(plan);
    });

    it('Test 1: displays easiness factor correctly', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.flashcards.add(
        createSM2Flashcard('card1', 'topic1', 2.15, 1, tomorrow)
      );

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('SM-2 Statistics')).toBeInTheDocument();
        expect(screen.getByText('2.15')).toBeInTheDocument();
      });
    });

    it('Test 2: shows interval in days', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      await db.flashcards.add(
        createSM2Flashcard('card1', 'topic1', 2.3, 7, nextWeek)
      );

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('1-2 weeks')).toBeInTheDocument();
      });
    });

    it('Test 3: displays "due for review" status', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.flashcards.add(
        createSM2Flashcard('card1', 'topic1', 2.1, 1, yesterday)
      );

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('Cards Due for Review')).toBeInTheDocument();
        // Should show 1 card due
        const dueCards = screen.getByText('1');
        expect(dueCards).toBeInTheDocument();
      });
    });

    it('Test 4: shows cards due count', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.flashcards.bulkAdd([
        createSM2Flashcard('card1', 'topic1', 2.1, 1, yesterday),
        createSM2Flashcard('card2', 'topic1', 2.2, 1, twoDaysAgo),
        createSM2Flashcard('card3', 'topic2', 2.3, 1, tomorrow),
      ]);

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('Cards Due for Review')).toBeInTheDocument();
        // Should show 2 cards due (yesterday and twoDaysAgo)
        expect(screen.getByText(/2/)).toBeInTheDocument();
        expect(screen.getByText(/of 3/)).toBeInTheDocument();
      });
    });

    it('Test 5: handles cards without SM-2 fields (backward compat)', async () => {
      // Mix of legacy and SM-2 cards
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.flashcards.bulkAdd([
        createLegacyFlashcard('legacy1', 'topic1', 3),
        createLegacyFlashcard('legacy2', 'topic1', 4),
        createSM2Flashcard('sm2-1', 'topic2', 2.2, 6, tomorrow),
      ]);

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('SM-2 Statistics')).toBeInTheDocument();
        expect(screen.getByText('Total Cards')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // Total cards
        
        // Should show 2 legacy cards and 1 SM-2 card
        const sm2CardsLabel = screen.getByText('SM-2 Cards');
        expect(sm2CardsLabel).toBeInTheDocument();
        expect(screen.getByText('Legacy Cards')).toBeInTheDocument();
      });
    });

    it('Test 6: shows SM-2 statistics', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);

      await db.flashcards.bulkAdd([
        createSM2Flashcard('card1', 'topic1', 2.3, 7, nextWeek),
        createSM2Flashcard('card2', 'topic2', 2.4, 14, twoWeeks),
      ]);

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('SM-2 Statistics')).toBeInTheDocument();
        expect(screen.getByText('Average Easiness Factor')).toBeInTheDocument();
        expect(screen.getByText('Review Intervals')).toBeInTheDocument();
        // Average EF should be 2.35
        expect(screen.getByText('2.35')).toBeInTheDocument();
      });
    });

    it('Test 7: displays mastery distribution', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.flashcards.bulkAdd([
        createSM2Flashcard('card1', 'topic1', 1.4, 1, tomorrow), // Mastery 1
        createSM2Flashcard('card2', 'topic1', 1.7, 6, tomorrow), // Mastery 2
        createSM2Flashcard('card3', 'topic2', 2.0, 6, tomorrow), // Mastery 3
        createSM2Flashcard('card4', 'topic2', 2.3, 6, tomorrow), // Mastery 4
        createSM2Flashcard('card5', 'topic2', 2.5, 6, tomorrow), // Mastery 5
      ]);

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('Mastery Distribution')).toBeInTheDocument();
        expect(screen.getByText('Struggling')).toBeInTheDocument();
        expect(screen.getByText('Learning')).toBeInTheDocument();
        expect(screen.getByText('Familiar')).toBeInTheDocument();
        expect(screen.getByText('Strong')).toBeInTheDocument();
        expect(screen.getByText('Mastered')).toBeInTheDocument();
      });
    });

    it('Test 8: topic mastery uses SM-2 derived mastery', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create cards with high EF values (should show as high mastery)
      await db.flashcards.bulkAdd([
        createSM2Flashcard('card1', 'topic1', 2.4, 14, tomorrow), // EF 2.4 = Mastery 5
        createSM2Flashcard('card2', 'topic1', 2.5, 14, tomorrow), // EF 2.5 = Mastery 5
      ]);

      renderProgress();

      await waitFor(() => {
        expect(screen.getByText('Topic Mastery')).toBeInTheDocument();
        expect(screen.getByText('Algebra')).toBeInTheDocument();
        // Should show "Mastered" status
        expect(screen.getByText('Mastered')).toBeInTheDocument();
      });
    });
  });
});
