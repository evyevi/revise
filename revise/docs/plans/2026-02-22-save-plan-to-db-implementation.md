# Save Plan to Database Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement database save functionality for CreatePlan wizard by adding `savePlan()` method to useCreatePlan hook

**Architecture:** Add `savePlan(files)` method to useCreatePlan hook that transforms wizard state (PlanResponse) into 5 database tables (StudyPlan, StudyDays, Flashcards, QuizQuestions, UploadedFiles) using Dexie transactions, then navigate to home

**Tech Stack:** React hooks, Dexie.js (IndexedDB), React Router, TypeScript, Vitest

---

## Task 1: Add isSaving state to useCreatePlan hook

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Test: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write failing test for isSaving state**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx` at end of file:

```typescript
test('isSaving state starts as false', () => {
  const { result } = renderHook(() => useCreatePlan());
  expect(result.current.state.isSaving).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: FAIL - Property 'isSaving' does not exist on type 'WizardState'

**Step 3: Add isSaving to WizardState interface**

In `src/hooks/useCreatePlan.ts`, update `WizardState` interface (around line 4-14):

```typescript
export interface WizardState {
  step: number;
  extractedText: string;
  testDate: Date | null;
  recommendedMinutesPerDay: number | null;
  minutesPerDay: number | null;
  plan: PlanResponse | null;
  isGenerating: boolean;
  isSaving: boolean;  // Add this line
  error: string | null;
}
```

**Step 4: Add SET_SAVING action type**

In `src/hooks/useCreatePlan.ts`, update `WizardAction` type (around line 16-28):

```typescript
type WizardAction =
  | { type: 'SET_EXTRACTED_TEXT'; payload: string }
  | { type: 'SET_TEST_DATE'; payload: Date | null }
  | { type: 'SET_MINUTES'; payload: number | null }
  | { type: 'SET_RECOMMENDED_MINUTES'; payload: number | null }
  | { type: 'SET_PLAN'; payload: PlanResponse | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }  // Add this line
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'RESET' };
```

**Step 5: Initialize isSaving in getInitialWizardState**

In `src/hooks/useCreatePlan.ts`, update `getInitialWizardState()` (around line 30-41):

```typescript
export function getInitialWizardState(): WizardState {
  return {
    step: 1,
    extractedText: '',
    testDate: null,
    recommendedMinutesPerDay: null,
    minutesPerDay: null,
    plan: null,
    isGenerating: false,
    isSaving: false,  // Add this line
    error: null,
  };
}
```

**Step 6: Handle SET_SAVING action in reducer**

In `src/hooks/useCreatePlan.ts`, update `reducer()` function (around line 70-92), add case after SET_GENERATING:

```typescript
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };  // Add this case
    case 'NEXT_STEP':
```

**Step 7: Export isSaving from hook**

In `src/hooks/useCreatePlan.ts`, update the return statement of `useCreatePlan()` (around line 220-226):

```typescript
  return {
    state,
    daysAvailable,
    canProceed,
    setExtractedText,
    setTestDate,
    setMinutesPerDay,
    nextStep,
    prevStep,
    generatePlan,
    regeneratePlan,
    isStepValid,
    isSaving: state.isSaving,  // Add this line
  };
```

**Step 8: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 9: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: add isSaving state to useCreatePlan hook"
```

---

## Task 2: Add database transformation helper functions

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Test: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write test for StudyPlan transformation**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
import type { StudyPlan } from '../../types';
import type { PlanResponse } from '../../lib/api';

test('transformToStudyPlan creates correct StudyPlan structure', () => {
  const mockPlan: PlanResponse = {
    topics: [
      { id: 't1', name: 'Biology Basics', importance: 'high' as const, keyPoints: ['Cell structure'], estimatedMinutes: 30 },
      { id: 't2', name: 'Chemistry', importance: 'medium' as const, keyPoints: ['Atoms'], estimatedMinutes: 20 },
    ],
    schedule: [],
    flashcards: [],
    quizQuestions: [],
    recommendedMinutesPerDay: 45,
  };
  
  const testDate = new Date('2026-03-01');
  const createdDate = new Date('2026-02-22');
  const daysAvailable = 7;
  const minutesPerDay = 45;
  
  // This function doesn't exist yet - will fail
  const result = transformToStudyPlan(mockPlan, testDate, createdDate, daysAvailable, minutesPerDay);
  
  expect(result).toMatchObject({
    subject: 'Biology Basics Study Plan',
    testDate,
    createdDate,
    totalDays: 7,
    suggestedMinutesPerDay: 45,
    topics: mockPlan.topics,
  });
  expect(result.id).toBeTruthy();
  expect(typeof result.id).toBe('string');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: FAIL - Cannot find name 'transformToStudyPlan'

**Step 3: Implement transformToStudyPlan helper**

Add to top of `src/hooks/useCreatePlan.ts` after imports (before interfaces):

```typescript
import type { StudyPlan, StudyDay, Flashcard, QuizQuestion, UploadedFile } from '../types';

/**
 * Transform PlanResponse and wizard state into StudyPlan database entity
 */
function transformToStudyPlan(
  plan: PlanResponse,
  testDate: Date,
  createdDate: Date,
  daysAvailable: number,
  minutesPerDay: number
): StudyPlan {
  return {
    id: crypto.randomUUID(),
    subject: `${plan.topics[0].name} Study Plan`,
    testDate,
    createdDate,
    totalDays: daysAvailable,
    suggestedMinutesPerDay: minutesPerDay,
    topics: plan.topics.map(t => ({
      id: t.id,
      name: t.name,
      importance: t.importance,
      keyPoints: t.keyPoints,
    })),
  };
}
```

**Step 4: Export transformToStudyPlan for testing**

In `src/hooks/useCreatePlan.ts`, add export statement after the function:

```typescript
export { transformToStudyPlan };
```

**Step 5: Update test to import the function**

In `src/hooks/__tests__/useCreatePlan.test.tsx`, update import (top of file):

```typescript
import { useCreatePlan, getInitialWizardState, transformToStudyPlan } from '../useCreatePlan';
```

**Step 6: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 7: Write test for StudyDays transformation**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
test('transformToStudyDays creates correct StudyDay entities', () => {
  const mockSchedule = [
    { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
    { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 40 },
  ];
  
  const planId = 'plan-123';
  const createdDate = new Date('2026-02-22T00:00:00Z');
  
  const result = transformToStudyDays(mockSchedule, planId, createdDate);
  
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    planId: 'plan-123',
    dayNumber: 1,
    completed: false,
    newTopicIds: ['t1'],
    reviewTopicIds: [],
    flashcardIds: [],
    quizIds: [],
    estimatedMinutes: 30,
  });
  expect(result[0].id).toBeTruthy();
  expect(result[0].date.getTime()).toBe(createdDate.getTime());
  
  // Day 2 should be createdDate + 1 day
  const expectedDay2 = new Date(createdDate.getTime() + 86400000);
  expect(result[1].date.getTime()).toBe(expectedDay2.getTime());
});
```

**Step 8: Run test to verify it fails**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: FAIL - Cannot find name 'transformToStudyDays'

**Step 9: Implement transformToStudyDays helper**

Add to `src/hooks/useCreatePlan.ts` after `transformToStudyPlan`:

```typescript
/**
 * Transform schedule array into StudyDay database entities
 */
function transformToStudyDays(
  schedule: PlanResponse['schedule'],
  planId: string,
  createdDate: Date
): StudyDay[] {
  return schedule.map(day => ({
    id: crypto.randomUUID(),
    planId,
    dayNumber: day.dayNumber,
    date: new Date(createdDate.getTime() + (day.dayNumber - 1) * 86400000),
    completed: false,
    newTopicIds: day.newTopicIds,
    reviewTopicIds: day.reviewTopicIds,
    flashcardIds: [],
    quizIds: [],
    estimatedMinutes: day.estimatedMinutes,
  }));
}
```

**Step 10: Export transformToStudyDays and update test import**

Export: Add to exports after `transformToStudyPlan`

```typescript
export { transformToStudyPlan, transformToStudyDays };
```

Update test import:

```typescript
import { useCreatePlan, getInitialWizardState, transformToStudyPlan, transformToStudyDays } from '../useCreatePlan';
```

**Step 11: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 12: Write tests for remaining transformations**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
test('transformToFlashcards creates correct Flashcard entities', () => {
  const mockFlashcards = [
    { topicId: 't1', front: 'What is a cell?', back: 'Basic unit of life' },
    { topicId: 't2', front: 'What is an atom?', back: 'Smallest unit of matter' },
  ];
  
  const result = transformToFlashcards(mockFlashcards);
  
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    topicId: 't1',
    front: 'What is a cell?',
    back: 'Basic unit of life',
    reviewDates: [],
    masteryLevel: 0,
  });
  expect(result[0].id).toBeTruthy();
  expect(result[0].firstShownDate).toBeUndefined();
  expect(result[0].needsPractice).toBe(false);
});

test('transformToQuizQuestions creates correct QuizQuestion entities', () => {
  const mockQuestions = [
    {
      topicId: 't1',
      question: 'What is photosynthesis?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      explanation: 'Because...',
    },
  ];
  
  const result = transformToQuizQuestions(mockQuestions);
  
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    topicId: 't1',
    question: 'What is photosynthesis?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswerIndex: 2,  // Note: field name mapping
    explanation: 'Because...',
  });
  expect(result[0].id).toBeTruthy();
});

test('transformToUploadedFiles creates correct UploadedFile entities', () => {
  const mockFiles = [
    new File(['content'], 'test.pdf', { type: 'application/pdf' }),
  ];
  const planId = 'plan-123';
  const extractedText = 'Extracted text from all files';
  
  const result = transformToUploadedFiles(mockFiles, planId, extractedText);
  
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    planId: 'plan-123',
    fileName: 'test.pdf',
    fileType: 'application/pdf',
    extractedText: 'Extracted text from all files',
  });
  expect(result[0].id).toBeTruthy();
  expect(result[0].uploadedAt).toBeInstanceOf(Date);
  expect(result[0].fileBlob).toBe(mockFiles[0]);
  expect(result[0].fileSize).toBeGreaterThan(0);
});
```

**Step 13: Run tests to verify they fail**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: FAIL - Cannot find names

**Step 14: Implement remaining transformation helpers**

Add to `src/hooks/useCreatePlan.ts` after `transformToStudyDays`:

```typescript
/**
 * Transform flashcards array into Flashcard database entities
 */
function transformToFlashcards(flashcards: PlanResponse['flashcards']): Flashcard[] {
  return flashcards.map(card => ({
    id: crypto.randomUUID(),
    topicId: card.topicId,
    front: card.front,
    back: card.back,
    firstShownDate: undefined,
    reviewDates: [],
    masteryLevel: 0,
    needsPractice: false,
  }));
}

/**
 * Transform quiz questions array into QuizQuestion database entities
 */
function transformToQuizQuestions(quizQuestions: PlanResponse['quizQuestions']): QuizQuestion[] {
  return quizQuestions.map(q => ({
    id: crypto.randomUUID(),
    topicId: q.topicId,
    question: q.question,
    options: q.options,
    correctAnswerIndex: q.correctIndex,  // Field name mapping
    explanation: q.explanation,
  }));
}

/**
 * Transform uploaded files into UploadedFile database entities
 */
function transformToUploadedFiles(
  files: File[],
  planId: string,
  extractedText: string
): UploadedFile[] {
  return files.map(file => ({
    id: crypto.randomUUID(),
    planId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    uploadedAt: new Date(),
    extractedText,
    fileBlob: file,
  }));
}
```

**Step 15: Export all transformation functions**

Update exports:

```typescript
export {
  transformToStudyPlan,
  transformToStudyDays,
  transformToFlashcards,
  transformToQuizQuestions,
  transformToUploadedFiles,
};
```

Update test import:

```typescript
import {
  useCreatePlan,
  getInitialWizardState,
  transformToStudyPlan,
  transformToStudyDays,
  transformToFlashcards,
  transformToQuizQuestions,
  transformToUploadedFiles,
} from '../useCreatePlan';
```

**Step 16: Run tests to verify they pass**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 17: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: add database transformation helper functions"
```

---

## Task 3: Implement savePlan method in useCreatePlan hook

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Test: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Mock db module in tests**

Add to top of `src/hooks/__tests__/useCreatePlan.test.tsx` after other imports:

```typescript
import { db } from '../../lib/db';

vi.mock('../../lib/db', () => ({
  db: {
    transaction: vi.fn(),
    studyPlans: { add: vi.fn() },
    studyDays: { bulkAdd: vi.fn() },
    flashcards: { bulkAdd: vi.fn() },
    quizQuestions: { bulkAdd: vi.fn() },
    uploadedFiles: { bulkAdd: vi.fn() },
  },
}));
```

**Step 2: Write test for savePlan validation (missing testDate)**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
test('savePlan throws error if testDate is null', async () => {
  const { result } = renderHook(() => useCreatePlan());
  
  // Setup: set plan and text but NOT testDate
  act(() => {
    result.current.setExtractedText('Some content');
  });
  
  await waitFor(() => {
    result.current.state.extractedText === 'Some content';
  });
  
  // Mock plan
  act(() => {
    (result.current as any).state.plan = { topics: [], schedule: [], flashcards: [], quizQuestions: [], recommendedMinutesPerDay: 30 };
  });
  
  // savePlan should throw because testDate is null
  await expect(result.current.savePlan([])).rejects.toThrow('Test date is required');
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: FAIL - Property 'savePlan' does not exist

**Step 4: Implement savePlan method skeleton**

Add to `src/hooks/useCreatePlan.ts` after `regeneratePlan` function (around line 200):

```typescript
import { db } from '../lib/db';

  const savePlan = useCallback(
    async (files: File[]): Promise<string> => {
      // Validation
      if (!state.testDate) {
        throw new Error('Test date is required to save plan');
      }
      if (!state.plan) {
        throw new Error('Plan must be generated before saving');
      }
      if (!state.extractedText) {
        throw new Error('Extracted text is required to save plan');
      }

      dispatch({ type: 'SET_SAVING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const createdDate = new Date();
        const minutesPerDay = state.minutesPerDay || state.recommendedMinutesPerDay || 30;

        // Transform data
        const studyPlan = transformToStudyPlan(
          state.plan,
          state.testDate,
          createdDate,
          daysAvailable,
          minutesPerDay
        );
        const studyDays = transformToStudyDays(state.plan.schedule, studyPlan.id, createdDate);
        const flashcards = transformToFlashcards(state.plan.flashcards);
        const quizQuestions = transformToQuizQuestions(state.plan.quizQuestions);
        const uploadedFiles = transformToUploadedFiles(files, studyPlan.id, state.extractedText);

        // Save to database in transaction
        await db.transaction('rw', [
          db.studyPlans,
          db.studyDays,
          db.flashcards,
          db.quizQuestions,
          db.uploadedFiles,
        ], async () => {
          await db.studyPlans.add(studyPlan);
          await db.studyDays.bulkAdd(studyDays);
          await db.flashcards.bulkAdd(flashcards);
          await db.quizQuestions.bulkAdd(quizQuestions);
          await db.uploadedFiles.bulkAdd(uploadedFiles);
        });

        dispatch({ type: 'SET_SAVING', payload: false });
        return studyPlan.id;
      } catch (error) {
        dispatch({ type: 'SET_SAVING', payload: false });
        const message = error instanceof Error ? error.message : 'Failed to save study plan';
        dispatch({ type: 'SET_ERROR', payload: message });
        throw error;
      }
    },
    [state, daysAvailable]
  );
```

**Step 5: Export savePlan from hook**

Update return statement in `useCreatePlan()`:

```typescript
  return {
    state,
    daysAvailable,
    canProceed,
    setExtractedText,
    setTestDate,
    setMinutesPerDay,
    nextStep,
    prevStep,
    generatePlan,
    regeneratePlan,
    savePlan,  // Add this line
    isStepValid,
    isSaving: state.isSaving,
  };
```

**Step 6: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS (validation test should pass now)

**Step 7: Write test for successful save**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
test('savePlan successfully saves all entities to database', async () => {
  // Setup mocks
  const mockTransaction = vi.fn().mockImplementation(async (mode, tables, callback) => {
    await callback();
  });
  (db.transaction as any) = mockTransaction;
  (db.studyPlans.add as any).mockResolvedValue('plan-id');
  (db.studyDays.bulkAdd as any).mockResolvedValue(undefined);
  (db.flashcards.bulkAdd as any).mockResolvedValue(undefined);
  (db.quizQuestions.bulkAdd as any).mockResolvedValue(undefined);
  (db.uploadedFiles.bulkAdd as any).mockResolvedValue(undefined);

  const { result } = renderHook(() => useCreatePlan());
  
  // Setup wizard state
  act(() => {
    result.current.setExtractedText('Content');
    result.current.setTestDate(new Date('2026-03-01'));
    result.current.setMinutesPerDay(45);
  });
  
  // Mock plan in state
  act(() => {
    (result.current as any).state.plan = {
      topics: [{ id: 't1', name: 'Biology', importance: 'high', keyPoints: [], estimatedMinutes: 30 }],
      schedule: [{ dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 }],
      flashcards: [{ topicId: 't1', front: 'Q', back: 'A' }],
      quizQuestions: [{ topicId: 't1', question: 'Q?', options: ['A'], correctIndex: 0, explanation: 'E' }],
      recommendedMinutesPerDay: 45,
    };
  });
  
  const mockFiles = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
  
  let planId: string = '';
  await act(async () => {
    planId = await result.current.savePlan(mockFiles);
  });
  
  expect(planId).toBeTruthy();
  expect(mockTransaction).toHaveBeenCalled();
  expect(db.studyPlans.add).toHaveBeenCalled();
  expect(db.studyDays.bulkAdd).toHaveBeenCalled();
  expect(db.flashcards.bulkAdd).toHaveBeenCalled();
  expect(db.quizQuestions.bulkAdd).toHaveBeenCalled();
  expect(db.uploadedFiles.bulkAdd).toHaveBeenCalled();
});
```

**Step 8: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 9: Write test for save error handling**

Add to `src/hooks/__tests__/useCreatePlan.test.tsx`:

```typescript
test('savePlan sets error state when database save fails', async () => {
  // Setup mock to fail
  const mockTransaction = vi.fn().mockRejectedValue(new Error('Database error'));
  (db.transaction as any) = mockTransaction;

  const { result } = renderHook(() => useCreatePlan());
  
  // Setup wizard state
  act(() => {
    result.current.setExtractedText('Content');
    result.current.setTestDate(new Date('2026-03-01'));
  });
  
  act(() => {
    (result.current as any).state.plan = {
      topics: [{ id: 't1', name: 'Test', importance: 'high', keyPoints: [], estimatedMinutes: 30 }],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };
  });
  
  await act(async () => {
    await expect(result.current.savePlan([])).rejects.toThrow('Database error');
  });
  
  expect(result.current.state.error).toBeTruthy();
  expect(result.current.state.isSaving).toBe(false);
});
```

**Step 10: Run test to verify it passes**

Run: `npm test -- useCreatePlan.test.tsx`
Expected: PASS

**Step 11: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: implement savePlan method with database transaction"
```

---

## Task 4: Update CreatePlan.tsx to use actual save logic

**Files:**
- Modify: `src/pages/CreatePlan.tsx`

**Step 1: Add useNavigate import**

In `src/pages/CreatePlan.tsx`, add to imports at top:

```typescript
import { useNavigate } from 'react-router-dom';
```

**Step 2: Get navigate function and files from hooks**

In `CreatePlan` component, after existing hooks (around line 15-23):

```typescript
export default function CreatePlan() {
  const navigate = useNavigate();
  const { files, selectFiles, removeFile, getAllExtractedText } = useFileUpload();
  const {
    state,
    daysAvailable,
    canProceed,
    setExtractedText,
    setTestDate,
    setMinutesPerDay,
    nextStep,
    prevStep,
    generatePlan,
    regeneratePlan,
    savePlan,  // Add this
    isSaving,  // Add this
  } = useCreatePlan();
```

**Step 3: Replace placeholder save logic with actual save**

In `src/pages/CreatePlan.tsx`, find the save button handler in step 5 (around line 245-250) and replace:

OLD:
```typescript
        <button
          type="button"
          onClick={() => {
            console.log('Saving plan:', state.plan);
            alert('Saved! (TODO: Save to DB in Task 8.6)');
          }}
          className="w-full py-3 px-6 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Plan
        </button>
```

NEW:
```typescript
        <button
          type="button"
          onClick={async () => {
            try {
              await savePlan(files);
              navigate('/');
            } catch {
              // Error already in hook state, will display
            }
          }}
          disabled={isSaving}
          className="w-full py-3 px-6 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Saving...</span>
            </>
          ) : (
            'Save Plan'
          )}
        </button>
```

**Step 4: Add error display in step 5**

In `src/pages/CreatePlan.tsx`, add error display before the save button (around line 243):

```typescript
    {state.step === 5 && (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Your Plan</h2>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Error display - add this */}
          {state.error && (
            <div className="text-red-600 mb-4">
              {state.error}
            </div>
          )}
          
          {/* Summary content */}
          <div className="space-y-4">
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Run tests**

Run: `npm test`
Expected: All tests pass (76+ tests)

**Step 7: Commit**

```bash
git add src/pages/CreatePlan.tsx
git commit -m "feat: integrate savePlan with CreatePlan wizard and navigation"
```

---

## Task 5: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (76+ tests)

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 4: Manual smoke test (optional)**

Start dev server: `npm run dev`

1. Navigate to /create-plan
2. Upload a file (or mock with test data)
3. Select test date
4. Click "Generate Plan" (will need mock/real API)
5. Review plan
6. Click "Save Plan"
7. Verify navigation to home
8. Open IndexedDB in browser DevTools → verify data saved

**Step 5: Final commit if any fixes needed**

```bash
git add .
git commit -m "fix: final adjustments for save plan feature"
```

---

## Success Checklist

- [x] `isSaving` state added to WizardState
- [x] Transformation helpers implemented (5 functions)
- [x] `savePlan()` method added to useCreatePlan hook
- [x] Database transaction ensures atomicity
- [x] Error handling with user-friendly messages
- [x] CreatePlan.tsx uses actual save logic
- [x] Navigation to home after successful save
- [x] Loading state (spinner) during save
- [x] Error display in step 5
- [x] All tests passing (76+ tests)
- [x] TypeScript clean
- [x] Lint clean

## Notes

- All IDs generated with `crypto.randomUUID()` (browser-native)
- Date calculations: `new Date(createdDate.getTime() + (dayNumber - 1) * 86400000)`
- Dexie transaction: `db.transaction('rw', [tables...], async () => {})`
- Subject auto-generated from first topic: `${topics[0].name} Study Plan`
- Files saved with blobs to uploadedFiles table
- Error messages are user-friendly, not technical
