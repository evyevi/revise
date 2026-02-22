# useCreatePlan Hook Implementation Plan (Task 8.4)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a `useCreatePlan` hook that owns wizard state, step validation, and AI plan generation for the study plan flow.

**Architecture:** A reducer-driven hook manages wizard state and exposes derived selectors. The hook calls `generateStudyPlan` to create/regenerate plans and stores `recommendedMinutesPerDay` in state.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library, TailwindCSS, Gemini API client in `src/lib/api.ts`

---

### Task 1: Add hook test scaffold and initial state checks

**Files:**
- Create: `src/hooks/useCreatePlan.ts`
- Create: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreatePlan, getInitialWizardState } from '../useCreatePlan';

vi.mock('../../lib/api', () => ({
  generateStudyPlan: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useCreatePlan', () => {
  it('initializes to step 1 with empty values', () => {
    const state = getInitialWizardState();
    expect(state.step).toBe(1);
    expect(state.testDate).toBeNull();
    expect(state.minutesPerDay).toBeNull();
    expect(state.recommendedMinutesPerDay).toBeNull();
    expect(state.plan).toBeNull();
  });

  it('exposes derived daysAvailable when testDate is set', () => {
    const { result } = renderHook(() => useCreatePlan());
    const testDate = new Date('2026-02-24T00:00:00Z');

    act(() => {
      result.current.setTestDate(testDate);
    });

    expect(result.current.daysAvailable).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
import { useMemo, useReducer } from 'react';
import { daysBetween, clampDateToToday } from '../lib/dateUtils';
import { generateStudyPlan, type PlanResponse } from '../lib/api';

export interface WizardState {
  step: number;
  extractedText: string;
  testDate: Date | null;
  recommendedMinutesPerDay: number | null;
  minutesPerDay: number | null;
  plan: PlanResponse | null;
  isGenerating: boolean;
  error: string | null;
}

export function getInitialWizardState(): WizardState {
  return {
    step: 1,
    extractedText: '',
    testDate: null,
    recommendedMinutesPerDay: null,
    minutesPerDay: null,
    plan: null,
    isGenerating: false,
    error: null,
  };
}

// Reducer and hook will be completed in Task 2.
export function useCreatePlan() {
  const [state] = useReducer(() => getInitialWizardState(), getInitialWizardState());
  const daysAvailable = useMemo(() => {
    if (!state.testDate) return 0;
    const today = new Date();
    const clamped = clampDateToToday(state.testDate, today);
    return daysBetween(today, clamped);
  }, [state.testDate]);

  return {
    ...state,
    daysAvailable,
    setTestDate: () => undefined,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: scaffold useCreatePlan hook"
```

---

### Task 2: Implement reducer, selectors, and step transitions

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Modify: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write the failing test**

```typescript
it('advances steps only when current step is valid', () => {
  const { result } = renderHook(() => useCreatePlan());

  act(() => {
    result.current.nextStep();
  });

  // No files/extracted text yet, should not advance
  expect(result.current.step).toBe(1);

  act(() => {
    result.current.setExtractedText('Some content');
    result.current.nextStep();
  });

  expect(result.current.step).toBe(2);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: FAIL (missing actions)

**Step 3: Implement reducer actions + selectors**

```typescript
type WizardAction =
  | { type: 'SET_EXTRACTED_TEXT'; payload: string }
  | { type: 'SET_TEST_DATE'; payload: Date | null }
  | { type: 'SET_MINUTES'; payload: number | null }
  | { type: 'SET_RECOMMENDED_MINUTES'; payload: number | null }
  | { type: 'SET_PLAN'; payload: PlanResponse | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'RESET' };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_EXTRACTED_TEXT':
      return { ...state, extractedText: action.payload };
    case 'SET_TEST_DATE':
      return { ...state, testDate: action.payload };
    case 'SET_MINUTES':
      return { ...state, minutesPerDay: action.payload };
    case 'SET_RECOMMENDED_MINUTES':
      return { ...state, recommendedMinutesPerDay: action.payload };
    case 'SET_PLAN':
      return { ...state, plan: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 };
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1) };
    case 'GO_TO_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return getInitialWizardState();
    default:
      return state;
  }
}
```

Add selectors inside the hook:
- `isStepValid(step)`
- `canProceed`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: add wizard state transitions"
```

---

### Task 3: Add generatePlan API flow and tests

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Modify: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write the failing test**

```typescript
import { generateStudyPlan } from '../../lib/api';

it('calls generateStudyPlan without minutes on first generate', async () => {
  const { result } = renderHook(() => useCreatePlan());

  act(() => {
    result.current.setExtractedText('content');
    result.current.setTestDate(new Date('2026-02-24T00:00:00Z'));
  });

  vi.mocked(generateStudyPlan).mockResolvedValueOnce({
    topics: [],
    schedule: [],
    flashcards: [],
    quizQuestions: [],
    recommendedMinutesPerDay: 30,
  });

  await act(async () => {
    await result.current.generatePlan();
  });

  expect(generateStudyPlan).toHaveBeenCalledWith(
    { content: 'content', daysAvailable: 2 },
    expect.any(Function)
  );
  expect(result.current.recommendedMinutesPerDay).toBe(30);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: FAIL (generatePlan missing)

**Step 3: Implement generatePlan in hook**

```typescript
const generatePlan = async (): Promise<void> => {
  if (state.isGenerating) return;
  if (!state.extractedText || daysAvailable <= 0) {
    dispatch({ type: 'SET_ERROR', payload: 'Missing required data to generate plan.' });
    return;
  }

  dispatch({ type: 'SET_GENERATING', payload: true });
  dispatch({ type: 'SET_ERROR', payload: null });

  try {
    const request = {
      content: state.extractedText,
      daysAvailable,
      ...(state.minutesPerDay ? { minutesPerDay: state.minutesPerDay } : {}),
    };

    const plan = await generateStudyPlan(request);

    dispatch({ type: 'SET_PLAN', payload: plan });
    dispatch({ type: 'SET_RECOMMENDED_MINUTES', payload: plan.recommendedMinutesPerDay });
  } catch (error) {
    dispatch({
      type: 'SET_ERROR',
      payload: error instanceof Error ? error.message : 'Failed to generate plan',
    });
  } finally {
    dispatch({ type: 'SET_GENERATING', payload: false });
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: add generatePlan to useCreatePlan"
```

---

### Task 4: Validation helpers and minutes override test

**Files:**
- Modify: `src/hooks/useCreatePlan.ts`
- Modify: `src/hooks/__tests__/useCreatePlan.test.tsx`

**Step 1: Write the failing test**

```typescript
it('sends minutesPerDay when user sets it', async () => {
  const { result } = renderHook(() => useCreatePlan());

  act(() => {
    result.current.setExtractedText('content');
    result.current.setTestDate(new Date('2026-02-24T00:00:00Z'));
    result.current.setMinutesPerDay(45);
  });

  vi.mocked(generateStudyPlan).mockResolvedValueOnce({
    topics: [],
    schedule: [],
    flashcards: [],
    quizQuestions: [],
    recommendedMinutesPerDay: 30,
  });

  await act(async () => {
    await result.current.generatePlan();
  });

  expect(generateStudyPlan).toHaveBeenCalledWith(
    { content: 'content', daysAvailable: 2, minutesPerDay: 45 },
    expect.any(Function)
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: FAIL (minutesPerDay not included)

**Step 3: Implement validation helpers**

Add helpers in hook:
- `isStepValid(step)`
- `canProceed`

Ensure `minutesPerDay` range validation (5-480) and allow fallback to `recommendedMinutesPerDay` when null.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.tsx
git commit -m "feat: add validation helpers to useCreatePlan"
```

---

### Task 5: Full test run

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: PASS

**Step 2: Run lint and type checks**

Run: `npm run lint`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit (if needed)**

```bash
git add -A
git commit -m "chore: verify useCreatePlan hook"
```

---

Plan complete and saved to `docs/plans/2026-02-22-useCreatePlan-hook-implementation.md`.

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
