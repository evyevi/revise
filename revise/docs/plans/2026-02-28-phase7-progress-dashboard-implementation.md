# Phase 7: Progress Dashboard & Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive Progress Dashboard that visualizes study analytics — per-plan progress, topic mastery heatmaps, XP history, streak calendar, quiz score trends, and badge showcase — transforming the empty Progress page into a motivating analytics hub.

**Architecture:** Service layer (`progressService.ts`) aggregates data from existing DB tables (ProgressLog, StudyDay, Flashcard, UserStats) into view models consumed by presentation components. Pure computation functions are unit-tested independently. React components use Framer Motion for animated charts and TailwindCSS for styling. Route already exists at `/progress`.

**Tech Stack:** TypeScript, Vitest (TDD), React 18, Framer Motion, TailwindCSS, Dexie.js (IndexedDB queries)

---

## Context

**Current State (Phase 6 complete):**
- Progress page is a stub: heading only (`src/pages/Progress.tsx`)
- Route `/progress` exists in `App.tsx`, BottomNav links to it
- Database has: `ProgressLog` (xpEarned, quizScore, flashcardsReviewed, completedAt per session), `UserStats` (totalXP, streak, badges), `StudyDay` (completed, date, topicIds), `Flashcard` (masteryLevel 0-5, reviewDates)
- Services exist: xpService, streakService, badgeService, masteryCalculator, planQueries
- 292/292 tests passing across 25 files

**What we're building:**
1. `progressService.ts` — pure data aggregation functions
2. `ProgressOverview` — XP total, streak, badges summary card
3. `PlanProgressList` — per-plan completion percentage bars
4. `TopicMasteryGrid` — mastery level heatmap for all topics across plans
5. `StudyCalendar` — streak/activity calendar showing study days
6. `QuizScoreChart` — animated bar chart of recent quiz scores
7. `BadgeShowcase` — earned + locked badge grid with unlock conditions
8. Wire everything into `Progress.tsx` page

---

## Task 1: Progress Service — Data Aggregation Functions

**Files:**
- Create: `src/lib/progressService.ts`
- Create: `src/lib/__tests__/progressService.test.ts`

### Step 1: Write failing tests for `getStudyActivity`

This function returns a map of date strings → activity info (sessions completed, XP earned) for calendar display.

Create `src/lib/__tests__/progressService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getStudyActivity,
  getPlanProgress,
  getTopicMasteryData,
  getRecentQuizScores,
} from '../progressService';
import type { ProgressLog, StudyDay, Flashcard, StudyPlan, Topic } from '../../types';

function makeProgressLog(overrides: Partial<ProgressLog> = {}): ProgressLog {
  return {
    id: crypto.randomUUID(),
    planId: 'plan-1',
    dayId: 'day-1',
    completedAt: new Date('2026-02-20'),
    xpEarned: 75,
    quizScore: 80,
    flashcardsReviewed: 5,
    ...overrides,
  };
}

function makeStudyDay(overrides: Partial<StudyDay> = {}): StudyDay {
  return {
    id: crypto.randomUUID(),
    planId: 'plan-1',
    dayNumber: 1,
    date: new Date('2026-02-20'),
    completed: false,
    newTopicIds: [],
    reviewTopicIds: [],
    flashcardIds: [],
    quizIds: [],
    estimatedMinutes: 30,
    ...overrides,
  };
}

function makeFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: crypto.randomUUID(),
    topicId: 'topic-1',
    front: 'Q',
    back: 'A',
    reviewDates: [],
    masteryLevel: 0,
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    name: 'Algebra',
    importance: 'high',
    keyPoints: ['equations'],
    ...overrides,
  };
}

function makeStudyPlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    id: 'plan-1',
    subject: 'Math',
    testDate: new Date('2026-03-15'),
    createdDate: new Date('2026-02-01'),
    totalDays: 14,
    suggestedMinutesPerDay: 30,
    topics: [makeTopic()],
    ...overrides,
  };
}

describe('progressService', () => {
  describe('getStudyActivity', () => {
    it('returns empty map for no logs', () => {
      const result = getStudyActivity([]);
      expect(result.size).toBe(0);
    });

    it('groups logs by date and sums XP', () => {
      const logs = [
        makeProgressLog({ completedAt: new Date('2026-02-20T10:00:00'), xpEarned: 50 }),
        makeProgressLog({ completedAt: new Date('2026-02-20T14:00:00'), xpEarned: 30 }),
        makeProgressLog({ completedAt: new Date('2026-02-21T09:00:00'), xpEarned: 75 }),
      ];
      const result = getStudyActivity(logs);

      expect(result.size).toBe(2);
      expect(result.get('2026-02-20')).toEqual({ sessions: 2, xpEarned: 80 });
      expect(result.get('2026-02-21')).toEqual({ sessions: 1, xpEarned: 75 });
    });
  });

  describe('getPlanProgress', () => {
    it('returns 0 progress for plan with no days', () => {
      const result = getPlanProgress([]);
      expect(result).toEqual({ completed: 0, total: 0, percentage: 0 });
    });

    it('calculates percentage of completed days', () => {
      const days = [
        makeStudyDay({ completed: true }),
        makeStudyDay({ completed: true }),
        makeStudyDay({ completed: false }),
        makeStudyDay({ completed: false }),
      ];
      const result = getPlanProgress(days);
      expect(result).toEqual({ completed: 2, total: 4, percentage: 50 });
    });

    it('returns 100% when all days completed', () => {
      const days = [
        makeStudyDay({ completed: true }),
        makeStudyDay({ completed: true }),
      ];
      const result = getPlanProgress(days);
      expect(result).toEqual({ completed: 2, total: 2, percentage: 100 });
    });
  });

  describe('getTopicMasteryData', () => {
    it('returns empty array for no topics', () => {
      const result = getTopicMasteryData([], []);
      expect(result).toEqual([]);
    });

    it('calculates average mastery for each topic', () => {
      const topics = [
        makeTopic({ id: 't1', name: 'Algebra' }),
        makeTopic({ id: 't2', name: 'Geometry' }),
      ];
      const flashcards = [
        makeFlashcard({ topicId: 't1', masteryLevel: 4 }),
        makeFlashcard({ topicId: 't1', masteryLevel: 2 }),
        makeFlashcard({ topicId: 't2', masteryLevel: 5 }),
      ];
      const result = getTopicMasteryData(topics, flashcards);

      expect(result).toEqual([
        { topicId: 't1', topicName: 'Algebra', averageMastery: 3, cardCount: 2 },
        { topicId: 't2', topicName: 'Geometry', averageMastery: 5, cardCount: 1 },
      ]);
    });

    it('returns 0 mastery when topic has no flashcards', () => {
      const topics = [makeTopic({ id: 't1', name: 'Algebra' })];
      const result = getTopicMasteryData(topics, []);
      expect(result).toEqual([
        { topicId: 't1', topicName: 'Algebra', averageMastery: 0, cardCount: 0 },
      ]);
    });
  });

  describe('getRecentQuizScores', () => {
    it('returns empty array for no logs', () => {
      const result = getRecentQuizScores([], 5);
      expect(result).toEqual([]);
    });

    it('returns most recent N scores sorted by date', () => {
      const logs = [
        makeProgressLog({ completedAt: new Date('2026-02-18'), quizScore: 60 }),
        makeProgressLog({ completedAt: new Date('2026-02-20'), quizScore: 90 }),
        makeProgressLog({ completedAt: new Date('2026-02-19'), quizScore: 75 }),
      ];
      const result = getRecentQuizScores(logs, 2);

      expect(result).toEqual([
        { date: '2026-02-19', score: 75 },
        { date: '2026-02-20', score: 90 },
      ]);
    });

    it('returns all scores if fewer than limit', () => {
      const logs = [
        makeProgressLog({ completedAt: new Date('2026-02-20'), quizScore: 85 }),
      ];
      const result = getRecentQuizScores(logs, 10);
      expect(result).toEqual([{ date: '2026-02-20', score: 85 }]);
    });
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/lib/__tests__/progressService.test.ts
```

Expected: FAIL — `progressService` module not found

### Step 3: Implement `progressService.ts`

Create `src/lib/progressService.ts`:

```typescript
import type { ProgressLog, StudyDay, Topic, Flashcard } from '../types';

export interface StudyActivityEntry {
  sessions: number;
  xpEarned: number;
}

export interface PlanProgressResult {
  completed: number;
  total: number;
  percentage: number;
}

export interface TopicMasteryEntry {
  topicId: string;
  topicName: string;
  averageMastery: number;
  cardCount: number;
}

export interface QuizScoreEntry {
  date: string;
  score: number;
}

/**
 * Group progress logs by date, summing sessions and XP per day.
 * Returns a Map keyed by ISO date string (YYYY-MM-DD).
 */
export function getStudyActivity(
  logs: ProgressLog[]
): Map<string, StudyActivityEntry> {
  const map = new Map<string, StudyActivityEntry>();

  for (const log of logs) {
    const dateKey = log.completedAt.toISOString().split('T')[0];
    const existing = map.get(dateKey);

    if (existing) {
      existing.sessions += 1;
      existing.xpEarned += log.xpEarned;
    } else {
      map.set(dateKey, { sessions: 1, xpEarned: log.xpEarned });
    }
  }

  return map;
}

/**
 * Calculate plan completion progress from study days.
 */
export function getPlanProgress(days: StudyDay[]): PlanProgressResult {
  if (days.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = days.filter((d) => d.completed).length;
  const percentage = Math.round((completed / days.length) * 100);

  return { completed, total: days.length, percentage };
}

/**
 * Calculate average mastery level per topic from flashcards.
 * Returns one entry per topic, sorted by topic name.
 */
export function getTopicMasteryData(
  topics: Topic[],
  flashcards: Flashcard[]
): TopicMasteryEntry[] {
  return topics.map((topic) => {
    const topicCards = flashcards.filter((c) => c.topicId === topic.id);
    const avgMastery =
      topicCards.length > 0
        ? Math.round(
            topicCards.reduce((sum, c) => sum + c.masteryLevel, 0) /
              topicCards.length
          )
        : 0;

    return {
      topicId: topic.id,
      topicName: topic.name,
      averageMastery: avgMastery,
      cardCount: topicCards.length,
    };
  });
}

/**
 * Get the most recent N quiz scores from progress logs, sorted oldest → newest.
 */
export function getRecentQuizScores(
  logs: ProgressLog[],
  limit: number
): QuizScoreEntry[] {
  const sorted = [...logs].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  return sorted.slice(-limit).map((log) => ({
    date: log.completedAt.toISOString().split('T')[0],
    score: log.quizScore,
  }));
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/lib/__tests__/progressService.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/lib/progressService.ts src/lib/__tests__/progressService.test.ts
git commit -m "feat(progress): add progressService with data aggregation functions"
```

---

## Task 2: Progress Overview Component

**Files:**
- Create: `src/components/progress/ProgressOverview.tsx`
- Create: `src/components/__tests__/ProgressOverview.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/ProgressOverview.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressOverview } from '../progress/ProgressOverview';

describe('ProgressOverview', () => {
  const defaultProps = {
    totalXP: 450,
    currentStreak: 5,
    longestStreak: 7,
    totalSessions: 12,
    badgeCount: 3,
    totalBadges: 7,
  };

  it('renders XP total', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('renders current streak', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders longest streak', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders session count', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders badge count as fraction', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('3/7')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/ProgressOverview.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement ProgressOverview

Create `src/components/progress/ProgressOverview.tsx`:

```tsx
import { motion } from 'framer-motion';

interface ProgressOverviewProps {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  badgeCount: number;
  totalBadges: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ProgressOverview({
  totalXP,
  currentStreak,
  longestStreak,
  totalSessions,
  badgeCount,
  totalBadges,
}: ProgressOverviewProps) {
  return (
    <motion.div
      className="grid grid-cols-3 gap-3 mb-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4 text-center"
        variants={item}
      >
        <p className="text-xs text-gray-600 mb-1">Total XP</p>
        <p className="text-2xl font-bold text-primary-600">{totalXP}</p>
        <p className="text-xs text-gray-500">♥ earned</p>
      </motion.div>

      <motion.div
        className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-4 text-center"
        variants={item}
      >
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
        <p className="text-xs text-gray-500">🔥 days</p>
      </motion.div>

      <motion.div
        className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-4 text-center"
        variants={item}
      >
        <p className="text-xs text-gray-600 mb-1">Badges</p>
        <p className="text-2xl font-bold text-purple-600">{badgeCount}/{totalBadges}</p>
        <p className="text-xs text-gray-500">🏆 unlocked</p>
      </motion.div>

      <motion.div
        className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-4 text-center"
        variants={item}
      >
        <p className="text-xs text-gray-600 mb-1">Sessions</p>
        <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
        <p className="text-xs text-gray-500">📖 completed</p>
      </motion.div>

      <motion.div
        className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-4 text-center"
        variants={item}
      >
        <p className="text-xs text-gray-600 mb-1">Best Streak</p>
        <p className="text-2xl font-bold text-green-600">{longestStreak}</p>
        <p className="text-xs text-gray-500">⚡ days</p>
      </motion.div>
    </motion.div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/ProgressOverview.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/ProgressOverview.tsx src/components/__tests__/ProgressOverview.test.tsx
git commit -m "feat(progress): add ProgressOverview stats card component"
```

---

## Task 3: Plan Progress List Component

**Files:**
- Create: `src/components/progress/PlanProgressList.tsx`
- Create: `src/components/__tests__/PlanProgressList.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/PlanProgressList.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanProgressList } from '../progress/PlanProgressList';

describe('PlanProgressList', () => {
  it('renders empty state when no plans', () => {
    render(<PlanProgressList plans={[]} />);
    expect(screen.getByText(/no study plans yet/i)).toBeInTheDocument();
  });

  it('renders plan name and percentage', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 3, total: 10, percentage: 30, testDate: new Date('2026-03-15') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('3/10 days')).toBeInTheDocument();
  });

  it('renders multiple plans', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 3, total: 10, percentage: 30, testDate: new Date('2026-03-15') },
      { planId: '2', subject: 'Physics', completed: 7, total: 7, percentage: 100, testDate: new Date('2026-03-10') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('shows completed badge for 100% plans', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 10, total: 10, percentage: 100, testDate: new Date('2026-03-15') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/PlanProgressList.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement PlanProgressList

Create `src/components/progress/PlanProgressList.tsx`:

```tsx
import { motion } from 'framer-motion';

export interface PlanProgressEntry {
  planId: string;
  subject: string;
  completed: number;
  total: number;
  percentage: number;
  testDate: Date;
}

interface PlanProgressListProps {
  plans: PlanProgressEntry[];
}

export function PlanProgressList({ plans }: PlanProgressListProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-4xl mb-2">📚</p>
        <p>No study plans yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const daysUntilTest = Math.max(
          0,
          Math.ceil(
            (plan.testDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        );

        return (
          <motion.div
            key={plan.planId}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">{plan.subject}</h3>
                {plan.percentage === 100 && <span>✅</span>}
              </div>
              <span className="text-sm font-bold text-primary-600">
                {plan.percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
              <motion.div
                className="bg-gradient-to-r from-primary-400 to-primary-500 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${plan.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{plan.completed}/{plan.total} days</span>
              {daysUntilTest > 0 && (
                <span>{daysUntilTest} days until test</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/PlanProgressList.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/PlanProgressList.tsx src/components/__tests__/PlanProgressList.test.tsx
git commit -m "feat(progress): add PlanProgressList with animated progress bars"
```

---

## Task 4: Topic Mastery Grid Component

**Files:**
- Create: `src/components/progress/TopicMasteryGrid.tsx`
- Create: `src/components/__tests__/TopicMasteryGrid.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/TopicMasteryGrid.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicMasteryGrid } from '../progress/TopicMasteryGrid';

describe('TopicMasteryGrid', () => {
  it('renders empty state when no topics', () => {
    render(<TopicMasteryGrid topics={[]} />);
    expect(screen.getByText(/no topics to show/i)).toBeInTheDocument();
  });

  it('renders topic name and mastery level', () => {
    const topics = [
      { topicId: 't1', topicName: 'Algebra', averageMastery: 4, cardCount: 5 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('5 cards')).toBeInTheDocument();
  });

  it('renders mastery label for level 0', () => {
    const topics = [
      { topicId: 't1', topicName: 'New Topic', averageMastery: 0, cardCount: 3 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders mastery label for level 5', () => {
    const topics = [
      { topicId: 't1', topicName: 'Mastered Topic', averageMastery: 5, cardCount: 10 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Mastered')).toBeInTheDocument();
  });

  it('renders multiple topics', () => {
    const topics = [
      { topicId: 't1', topicName: 'Algebra', averageMastery: 3, cardCount: 5 },
      { topicId: 't2', topicName: 'Geometry', averageMastery: 1, cardCount: 3 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('Geometry')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/TopicMasteryGrid.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement TopicMasteryGrid

Create `src/components/progress/TopicMasteryGrid.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { TopicMasteryEntry } from '../../lib/progressService';

const MASTERY_LABELS: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Learning',
  3: 'Familiar',
  4: 'Familiar',
  5: 'Mastered',
};

const MASTERY_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-500',
  1: 'bg-red-100 text-red-600',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-yellow-100 text-yellow-600',
  4: 'bg-green-100 text-green-600',
  5: 'bg-primary-100 text-primary-600',
};

interface TopicMasteryGridProps {
  topics: TopicMasteryEntry[];
}

export function TopicMasteryGrid({ topics }: TopicMasteryGridProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-4xl mb-2">🧠</p>
        <p>No topics to show</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {topics.map((topic, index) => (
        <motion.div
          key={topic.topicId}
          className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <h4 className="font-medium text-sm text-gray-800 truncate mb-2">
            {topic.topicName}
          </h4>

          {/* Mastery bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
            <motion.div
              className="bg-gradient-to-r from-primary-300 to-primary-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(topic.averageMastery / 5) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${MASTERY_COLORS[topic.averageMastery] ?? MASTERY_COLORS[0]}`}
            >
              {MASTERY_LABELS[topic.averageMastery] ?? 'New'}
            </span>
            <span className="text-xs text-gray-400">{topic.cardCount} cards</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/TopicMasteryGrid.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/TopicMasteryGrid.tsx src/components/__tests__/TopicMasteryGrid.test.tsx
git commit -m "feat(progress): add TopicMasteryGrid with mastery level heatmap"
```

---

## Task 5: Study Calendar Component

**Files:**
- Create: `src/components/progress/StudyCalendar.tsx`
- Create: `src/components/__tests__/StudyCalendar.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/StudyCalendar.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudyCalendar } from '../progress/StudyCalendar';

describe('StudyCalendar', () => {
  it('renders the current month name', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    expect(screen.getByText(/February 2026/i)).toBeInTheDocument();
  });

  it('renders day-of-week headers', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('highlights days with study activity', () => {
    const activity = new Map([
      ['2026-02-10', { sessions: 1, xpEarned: 50 }],
      ['2026-02-15', { sessions: 2, xpEarned: 100 }],
    ]);
    render(<StudyCalendar activityDates={activity} currentDate={new Date('2026-02-15')} />);
    
    // Day 10 and 15 should have activity indicators
    const day10 = screen.getByTestId('calendar-day-10');
    const day15 = screen.getByTestId('calendar-day-15');
    expect(day10.className).toContain('bg-primary');
    expect(day15.className).toContain('bg-primary');
  });

  it('does not highlight inactive days', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    const day5 = screen.getByTestId('calendar-day-5');
    expect(day5.className).not.toContain('bg-primary');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/StudyCalendar.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement StudyCalendar

Create `src/components/progress/StudyCalendar.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { StudyActivityEntry } from '../../lib/progressService';

interface StudyCalendarProps {
  activityDates: Map<string, StudyActivityEntry>;
  currentDate?: Date;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthData(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // getDay() returns 0=Sun, convert to 0=Mon
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const monthName = date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return { year, month, daysInMonth, startDayOfWeek, monthName };
}

export function StudyCalendar({
  activityDates,
  currentDate = new Date(),
}: StudyCalendarProps) {
  const { year, month, daysInMonth, startDayOfWeek, monthName } =
    getMonthData(currentDate);

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const cells: (number | null)[] = [];
  // Padding for days before the 1st
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  function hasActivity(day: number): boolean {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activityDates.has(dateStr);
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-800 text-center mb-3">
        {monthName}
      </h3>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-gray-400 font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const active = hasActivity(day);
          const isToday = day === todayDate;

          return (
            <motion.div
              key={day}
              data-testid={`calendar-day-${day}`}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                ${active ? 'bg-primary-200 text-primary-700' : 'text-gray-600'}
                ${isToday ? 'ring-2 ring-primary-400' : ''}
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.01 }}
            >
              {day}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/StudyCalendar.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/StudyCalendar.tsx src/components/__tests__/StudyCalendar.test.tsx
git commit -m "feat(progress): add StudyCalendar with activity highlights"
```

---

## Task 6: Quiz Score Chart Component

**Files:**
- Create: `src/components/progress/QuizScoreChart.tsx`
- Create: `src/components/__tests__/QuizScoreChart.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/QuizScoreChart.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuizScoreChart } from '../progress/QuizScoreChart';

describe('QuizScoreChart', () => {
  it('renders empty state when no scores', () => {
    render(<QuizScoreChart scores={[]} />);
    expect(screen.getByText(/no quiz scores yet/i)).toBeInTheDocument();
  });

  it('renders score values', () => {
    const scores = [
      { date: '2026-02-18', score: 75 },
      { date: '2026-02-19', score: 90 },
    ];
    render(<QuizScoreChart scores={scores} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders date labels', () => {
    const scores = [
      { date: '2026-02-18', score: 75 },
    ];
    render(<QuizScoreChart scores={scores} />);
    expect(screen.getByText('Feb 18')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/QuizScoreChart.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement QuizScoreChart

Create `src/components/progress/QuizScoreChart.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { QuizScoreEntry } from '../../lib/progressService';

interface QuizScoreChartProps {
  scores: QuizScoreEntry[];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'from-green-400 to-green-500';
  if (score >= 70) return 'from-yellow-400 to-yellow-500';
  if (score >= 50) return 'from-orange-400 to-orange-500';
  return 'from-red-400 to-red-500';
}

export function QuizScoreChart({ scores }: QuizScoreChartProps) {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-4xl mb-2">📝</p>
        <p>No quiz scores yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-end gap-2 h-40">
        {scores.map((entry, index) => (
          <div key={entry.date} className="flex-1 flex flex-col items-center justify-end h-full">
            {/* Score label */}
            <span className="text-xs font-bold text-gray-700 mb-1">
              {entry.score}%
            </span>

            {/* Bar */}
            <motion.div
              className={`w-full rounded-t-lg bg-gradient-to-t ${getScoreColor(entry.score)}`}
              initial={{ height: 0 }}
              animate={{ height: `${entry.score}%` }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
            />

            {/* Date label */}
            <span className="text-xs text-gray-400 mt-1 whitespace-nowrap">
              {formatDateLabel(entry.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/QuizScoreChart.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/QuizScoreChart.tsx src/components/__tests__/QuizScoreChart.test.tsx
git commit -m "feat(progress): add QuizScoreChart with animated bar chart"
```

---

## Task 7: Badge Showcase Component

**Files:**
- Create: `src/components/progress/BadgeShowcase.tsx`
- Create: `src/components/__tests__/BadgeShowcase.test.tsx`

### Step 1: Write failing test

Create `src/components/__tests__/BadgeShowcase.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeShowcase } from '../progress/BadgeShowcase';

describe('BadgeShowcase', () => {
  it('renders all badge definitions', () => {
    render(<BadgeShowcase earnedBadges={[]} />);
    // Should show all 7 badges (earned or locked)
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText('Dedicated Student')).toBeInTheDocument();
    expect(screen.getByText('On Fire!')).toBeInTheDocument();
    expect(screen.getByText('Unstoppable!')).toBeInTheDocument();
    expect(screen.getByText('Quiz Champion')).toBeInTheDocument();
    expect(screen.getByText('Flashcard Master')).toBeInTheDocument();
    expect(screen.getByText('Test Ready')).toBeInTheDocument();
  });

  it('marks earned badges as unlocked', () => {
    render(<BadgeShowcase earnedBadges={['first-step', 'on-fire']} />);
    const firstStep = screen.getByTestId('badge-first-step');
    const onFire = screen.getByTestId('badge-on-fire');
    expect(firstStep.className).not.toContain('opacity-40');
    expect(onFire.className).not.toContain('opacity-40');
  });

  it('dims unearned badges', () => {
    render(<BadgeShowcase earnedBadges={['first-step']} />);
    const quizChamp = screen.getByTestId('badge-quiz-champion');
    expect(quizChamp.className).toContain('opacity-40');
  });

  it('shows badge conditions for locked badges', () => {
    render(<BadgeShowcase earnedBadges={[]} />);
    expect(screen.getByText('Complete 1 study session')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/__tests__/BadgeShowcase.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement BadgeShowcase

Create `src/components/progress/BadgeShowcase.tsx`:

```tsx
import { motion } from 'framer-motion';
import { getAllBadges } from '../../lib/badgeService';

interface BadgeShowcaseProps {
  earnedBadges: string[];
}

export function BadgeShowcase({ earnedBadges }: BadgeShowcaseProps) {
  const allBadges = getAllBadges();

  return (
    <div className="grid grid-cols-2 gap-3">
      {allBadges.map((badge, index) => {
        const isEarned = earnedBadges.includes(badge.id);

        return (
          <motion.div
            key={badge.id}
            data-testid={`badge-${badge.id}`}
            className={`
              bg-white rounded-xl p-4 shadow-sm border text-center
              ${isEarned ? 'border-primary-200' : 'border-gray-100 opacity-40 grayscale'}
            `}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isEarned ? 1 : 0.4, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="text-3xl block mb-2">{badge.icon}</span>
            <h4 className="font-semibold text-sm text-gray-800">{badge.name}</h4>
            <p className="text-xs text-gray-500 mt-1">
              {isEarned ? badge.description : badge.condition}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
```

**Note:** This component depends on `getAllBadges()` from `src/lib/badgeService.ts`. Check if this function exists. If not, it needs to be added:

```typescript
// Add to src/lib/badgeService.ts if not present
export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/__tests__/BadgeShowcase.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/components/progress/BadgeShowcase.tsx src/components/__tests__/BadgeShowcase.test.tsx
git commit -m "feat(progress): add BadgeShowcase with earned/locked badge grid"
```

---

## Task 8: useProgressData Hook

**Files:**
- Create: `src/hooks/useProgressData.ts`
- Create: `src/hooks/__tests__/useProgressData.test.tsx`

### Step 1: Write failing test

Create `src/hooks/__tests__/useProgressData.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProgressData } from '../useProgressData';
import { db } from '../../lib/db';
import type { StudyPlan, UserStats, ProgressLog, StudyDay } from '../../types';

describe('useProgressData', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useProgressData());
    expect(result.current.isLoading).toBe(true);
  });

  it('loads user stats', async () => {
    const stats: UserStats = {
      id: 'default',
      totalXP: 200,
      currentStreak: 3,
      longestStreak: 5,
      badges: ['first-step'],
    };
    await db.userStats.add(stats);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.totalXP).toBe(200);
    expect(result.current.stats?.currentStreak).toBe(3);
  });

  it('loads plan progress data', async () => {
    const plan: StudyPlan = {
      id: 'plan-1',
      subject: 'Math',
      testDate: new Date('2026-03-15'),
      createdDate: new Date('2026-02-01'),
      totalDays: 2,
      suggestedMinutesPerDay: 30,
      topics: [{ id: 't1', name: 'Algebra', importance: 'high', keyPoints: ['x'] }],
    };
    await db.studyPlans.add(plan);

    const day1: StudyDay = {
      id: 'd1', planId: 'plan-1', dayNumber: 1, date: new Date('2026-02-10'),
      completed: true, newTopicIds: [], reviewTopicIds: [],
      flashcardIds: [], quizIds: [], estimatedMinutes: 30,
    };
    const day2: StudyDay = {
      id: 'd2', planId: 'plan-1', dayNumber: 2, date: new Date('2026-02-11'),
      completed: false, newTopicIds: [], reviewTopicIds: [],
      flashcardIds: [], quizIds: [], estimatedMinutes: 30,
    };
    await db.studyDays.bulkAdd([day1, day2]);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.planProgress).toHaveLength(1);
    expect(result.current.planProgress[0].subject).toBe('Math');
    expect(result.current.planProgress[0].percentage).toBe(50);
  });

  it('loads progress logs for activity calendar', async () => {
    const log: ProgressLog = {
      id: 'log-1', planId: 'plan-1', dayId: 'd1',
      completedAt: new Date('2026-02-20'), xpEarned: 75,
      quizScore: 80, flashcardsReviewed: 5,
    };
    await db.progressLogs.add(log);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.studyActivity.size).toBeGreaterThan(0);
  });

  it('handles empty database gracefully', async () => {
    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.planProgress).toHaveLength(0);
    expect(result.current.studyActivity.size).toBe(0);
    expect(result.current.quizScores).toHaveLength(0);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/hooks/__tests__/useProgressData.test.tsx
```

Expected: FAIL — module not found

### Step 3: Implement useProgressData hook

Create `src/hooks/useProgressData.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { db, getUserStats } from '../lib/db';
import {
  getStudyActivity,
  getPlanProgress,
  getTopicMasteryData,
  getRecentQuizScores,
} from '../lib/progressService';
import type { PlanProgressEntry } from '../components/progress/PlanProgressList';
import type {
  StudyActivityEntry,
  TopicMasteryEntry,
  QuizScoreEntry,
} from '../lib/progressService';
import type { UserStats, Topic } from '../types';

interface ProgressData {
  isLoading: boolean;
  error: string | null;
  stats: UserStats | null;
  planProgress: PlanProgressEntry[];
  studyActivity: Map<string, StudyActivityEntry>;
  topicMastery: TopicMasteryEntry[];
  quizScores: QuizScoreEntry[];
  totalSessions: number;
}

export function useProgressData(): ProgressData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [planProgress, setPlanProgress] = useState<PlanProgressEntry[]>([]);
  const [studyActivity, setStudyActivity] = useState<Map<string, StudyActivityEntry>>(new Map());
  const [topicMastery, setTopicMastery] = useState<TopicMasteryEntry[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScoreEntry[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all data in parallel
      const [userStats, plans, allDays, allLogs, allFlashcards] = await Promise.all([
        getUserStats(),
        db.studyPlans.toArray(),
        db.studyDays.toArray(),
        db.progressLogs.toArray(),
        db.flashcards.toArray(),
      ]);

      setStats(userStats);
      setTotalSessions(allLogs.length);

      // Activity calendar
      setStudyActivity(getStudyActivity(allLogs));

      // Quiz scores (last 10)
      setQuizScores(getRecentQuizScores(allLogs, 10));

      // Plan progress
      const daysByPlan = new Map<string, typeof allDays>();
      for (const day of allDays) {
        const arr = daysByPlan.get(day.planId) ?? [];
        arr.push(day);
        daysByPlan.set(day.planId, arr);
      }

      const progressEntries: PlanProgressEntry[] = plans.map((plan) => {
        const days = daysByPlan.get(plan.id) ?? [];
        const progress = getPlanProgress(days);
        return {
          planId: plan.id,
          subject: plan.subject,
          completed: progress.completed,
          total: progress.total,
          percentage: progress.percentage,
          testDate: plan.testDate,
        };
      });
      setPlanProgress(progressEntries);

      // Topic mastery - collect all topics from all plans
      const allTopics: Topic[] = plans.flatMap((p) => p.topics);
      setTopicMastery(getTopicMasteryData(allTopics, allFlashcards));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    stats,
    planProgress,
    studyActivity,
    topicMastery,
    quizScores,
    totalSessions,
  };
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/hooks/__tests__/useProgressData.test.tsx
```

Expected: All PASS

### Step 5: Commit

```bash
git add src/hooks/useProgressData.ts src/hooks/__tests__/useProgressData.test.tsx
git commit -m "feat(progress): add useProgressData hook for data aggregation"
```

---

## Task 9: Wire Progress Page

**Files:**
- Modify: `src/pages/Progress.tsx`
- Create: `src/pages/__tests__/Progress.test.tsx`

### Step 1: Write failing test

Create `src/pages/__tests__/Progress.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Progress } from '../Progress';
import { db } from '../../lib/db';

function renderProgress() {
  return render(
    <MemoryRouter>
      <Progress />
    </MemoryRouter>
  );
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
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/pages/__tests__/Progress.test.tsx
```

Expected: FAIL — tests fail because Progress page is still a stub

### Step 3: Implement full Progress page

Replace `src/pages/Progress.tsx` with:

```tsx
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProgressOverview } from '../components/progress/ProgressOverview';
import { PlanProgressList } from '../components/progress/PlanProgressList';
import { TopicMasteryGrid } from '../components/progress/TopicMasteryGrid';
import { StudyCalendar } from '../components/progress/StudyCalendar';
import { QuizScoreChart } from '../components/progress/QuizScoreChart';
import { BadgeShowcase } from '../components/progress/BadgeShowcase';
import { useProgressData } from '../hooks/useProgressData';
import { getAllBadges } from '../lib/badgeService';

export function Progress() {
  const {
    isLoading,
    error,
    stats,
    planProgress,
    studyActivity,
    topicMastery,
    quizScores,
    totalSessions,
  } = useProgressData();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-600">
          <p>Failed to load progress: {error}</p>
        </div>
      </Layout>
    );
  }

  const totalBadges = getAllBadges().length;

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Progress</h1>

        {/* Overview Stats */}
        <section className="mb-6">
          <ProgressOverview
            totalXP={stats?.totalXP ?? 0}
            currentStreak={stats?.currentStreak ?? 0}
            longestStreak={stats?.longestStreak ?? 0}
            totalSessions={totalSessions}
            badgeCount={stats?.badges.length ?? 0}
            totalBadges={totalBadges}
          />
        </section>

        {/* Study Calendar */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Study Activity
          </h2>
          <StudyCalendar activityDates={studyActivity} />
        </section>

        {/* Plan Progress */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Plan Progress
          </h2>
          <PlanProgressList plans={planProgress} />
        </section>

        {/* Topic Mastery */}
        {topicMastery.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Topic Mastery
            </h2>
            <TopicMasteryGrid topics={topicMastery} />
          </section>
        )}

        {/* Quiz Scores */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Recent Quiz Scores
          </h2>
          <QuizScoreChart scores={quizScores} />
        </section>

        {/* Badge Showcase */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Badges</h2>
          <BadgeShowcase earnedBadges={stats?.badges ?? []} />
        </section>
      </div>
    </Layout>
  );
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/pages/__tests__/Progress.test.tsx
```

Expected: All PASS

### Step 5: Run full test suite

```bash
npx vitest run
```

Expected: All tests pass (existing 292 + new tests)

### Step 6: Commit

```bash
git add src/pages/Progress.tsx src/pages/__tests__/Progress.test.tsx
git commit -m "feat(progress): wire up Progress page with all dashboard sections"
```

---

## Task 10: Verify `getAllBadges` Export Exists

**Files:**
- Modify (if needed): `src/lib/badgeService.ts`

### Step 1: Check if `getAllBadges` is already exported

```bash
grep -n 'getAllBadges' src/lib/badgeService.ts
```

If not found, add it.

### Step 2: Add `getAllBadges` if missing

Add to `src/lib/badgeService.ts`:

```typescript
/**
 * Get all badge definitions (for display in badge showcase).
 */
export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}
```

### Step 3: Run full test suite

```bash
npx vitest run
```

Expected: All tests pass

### Step 4: Commit (if changes were made)

```bash
git add src/lib/badgeService.ts
git commit -m "feat(badges): export getAllBadges for progress dashboard"
```

---

## Task 11: Final Verification & Cleanup

### Step 1: Run full test suite

```bash
npx vitest run
```

Expected: All tests pass

### Step 2: Run TypeScript type check

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Run lint

```bash
npx eslint src/
```

Expected: No lint errors

### Step 4: Manual smoke test

```bash
npm run dev
```

Navigate to `/progress` in browser. Verify:
- Loading spinner appears briefly
- Overview stats cards render with correct data
- Study calendar shows current month with activity highlights
- Plan progress shows animated progress bars
- Topic mastery grid shows mastery levels with color coding
- Quiz score chart shows animated bars
- Badge showcase shows earned/locked badges
- All animations are smooth
- Page is responsive on mobile viewport

### Step 5: Final commit

```bash
git add -A
git commit -m "feat: complete Phase 7 - Progress Dashboard & Analytics

- progressService: data aggregation functions (activity, plan progress, mastery, scores)
- ProgressOverview: animated stats cards (XP, streak, badges, sessions)
- PlanProgressList: per-plan completion bars with test date countdown
- TopicMasteryGrid: mastery heatmap with level labels and colors
- StudyCalendar: monthly activity calendar with day highlights
- QuizScoreChart: animated bar chart of recent quiz scores
- BadgeShowcase: earned/locked badge grid from badgeService
- useProgressData: hook aggregating all progress data from IndexedDB
- Full TDD with tests for service, components, hook, and page"
```

---

## Summary

| Task | Description | New Files | Tests |
|------|------------|-----------|-------|
| 1 | Progress Service | `progressService.ts` | ~12 tests |
| 2 | ProgressOverview component | `progress/ProgressOverview.tsx` | ~5 tests |
| 3 | PlanProgressList component | `progress/PlanProgressList.tsx` | ~4 tests |
| 4 | TopicMasteryGrid component | `progress/TopicMasteryGrid.tsx` | ~5 tests |
| 5 | StudyCalendar component | `progress/StudyCalendar.tsx` | ~4 tests |
| 6 | QuizScoreChart component | `progress/QuizScoreChart.tsx` | ~3 tests |
| 7 | BadgeShowcase component | `progress/BadgeShowcase.tsx` | ~4 tests |
| 8 | useProgressData hook | `useProgressData.ts` | ~5 tests |
| 9 | Wire Progress page | Modify `Progress.tsx` | ~5 tests |
| 10 | Verify getAllBadges export | Possibly modify `badgeService.ts` | — |
| 11 | Final verification | — | Full suite |
