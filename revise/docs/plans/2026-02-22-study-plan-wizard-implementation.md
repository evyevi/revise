# Study Plan Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a wizard flow for creating a study plan, using an AI-generated recommended daily minutes value that the user can adjust and regenerate.

**Architecture:** A client-side wizard state machine drives steps and validation. AI generation returns a full plan plus `recommendedMinutesPerDay`. The Create Plan page orchestrates the wizard, and the plan is saved to IndexedDB after review.

**Tech Stack:** React 18 + Vite + TypeScript, TailwindCSS, Dexie, Vitest, Gemini API (serverless function)

---

### Task 1: Add date utilities and tests

**Files:**
- Create: `src/lib/dateUtils.ts`
- Test: `src/lib/__tests__/dateUtils.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { daysBetween, clampDateToToday } from '../dateUtils';

describe('dateUtils', () => {
  it('computes days between dates (inclusive)', () => {
    const start = new Date('2026-02-22');
    const end = new Date('2026-02-24');
    expect(daysBetween(start, end)).toBe(2);
  });

  it('clamps past dates to today', () => {
    const today = new Date('2026-02-22');
    const past = new Date('2026-02-01');
    expect(clampDateToToday(past, today).toDateString()).toBe(today.toDateString());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/__tests__/dateUtils.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.ceil((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

export function clampDateToToday(date: Date, today: Date = new Date()): Date {
  return date < today ? today : date;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/__tests__/dateUtils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/__tests__/dateUtils.test.ts
git commit -m "feat: add date utilities for wizard flow"
```

---

### Task 2: Extend AI response with recommended minutes

**Files:**
- Modify: `api/generate-plan.ts`
- Modify: `src/lib/api.ts`

**Step 1: Write the failing test (contract test stub)**

Create `src/lib/__tests__/apiTypes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { PlanResponse } from '../api';

describe('PlanResponse', () => {
  it('includes recommendedMinutesPerDay', () => {
    const response = {} as PlanResponse;
    expect('recommendedMinutesPerDay' in response).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/__tests__/apiTypes.test.ts`
Expected: FAIL (property missing)

**Step 3: Update backend prompt and validation**

Update `api/generate-plan.ts` to:
- Add `recommendedMinutesPerDay` in the JSON schema in the prompt.
- Validate that `recommendedMinutesPerDay` is a number.

**Step 4: Update frontend types**

Update `src/lib/api.ts` to add `recommendedMinutesPerDay: number` to `PlanResponse`.

**Step 5: Run test to verify it passes**

Run: `npm test -- --run src/lib/__tests__/apiTypes.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add api/generate-plan.ts src/lib/api.ts src/lib/__tests__/apiTypes.test.ts
git commit -m "feat: add recommended minutes to AI response"
```

---

### Task 3: Create wizard UI components

**Files:**
- Create: `src/components/DatePicker.tsx`
- Create: `src/components/LoadingSpinner.tsx`
- Create: `src/components/MinutesInput.tsx`

**Step 1: Write the failing test (render smoke test)**

Create `src/components/__tests__/wizardComponents.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { DatePicker } from '../DatePicker';
import { MinutesInput } from '../MinutesInput';
import { LoadingSpinner } from '../LoadingSpinner';

describe('Wizard components', () => {
  it('exports all components', () => {
    expect(DatePicker).toBeDefined();
    expect(MinutesInput).toBeDefined();
    expect(LoadingSpinner).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/__tests__/wizardComponents.test.tsx`
Expected: FAIL (modules not found)

**Step 3: Implement components**

- `DatePicker`: native date input with min date, helper text.
- `MinutesInput`: slider + numeric input with min/max.
- `LoadingSpinner`: simple spinner with optional label.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/__tests__/wizardComponents.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DatePicker.tsx src/components/MinutesInput.tsx src/components/LoadingSpinner.tsx src/components/__tests__/wizardComponents.test.tsx
git commit -m "feat: add wizard UI components"
```

---

### Task 4: Add wizard state hook

**Files:**
- Create: `src/hooks/useCreatePlan.ts`
- Test: `src/hooks/__tests__/useCreatePlan.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getInitialWizardState } from '../useCreatePlan';

describe('useCreatePlan', () => {
  it('initializes to step 1', () => {
    const state = getInitialWizardState();
    expect(state.step).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement hook**

- Maintain wizard state (step, testDate, daysAvailable, minutesPerDay, recommendedMinutes, plan).
- Provide `nextStep`, `prevStep`, `setTestDate`, `setMinutesPerDay`.
- Provide `generatePlan` that calls `generateStudyPlan` and updates `plan` + `recommendedMinutesPerDay`.
- Export `getInitialWizardState` for testability.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useCreatePlan.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useCreatePlan.ts src/hooks/__tests__/useCreatePlan.test.ts
git commit -m "feat: add wizard state hook"
```

---

### Task 5: Implement CreatePlan wizard flow

**Files:**
- Modify: `src/pages/CreatePlan.tsx`

**Step 1: Write the failing test (basic wizard flow)**

Create `src/pages/__tests__/createPlanWizard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { CreatePlan } from '../CreatePlan';

describe('CreatePlan wizard', () => {
  it('exports CreatePlan component', () => {
    expect(CreatePlan).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/__tests__/createPlanWizard.test.tsx`
Expected: PASS after implementation (smoke test)

**Step 3: Implement wizard UI**

- Step 1: upload (existing UI).
- Step 2: test date (DatePicker + derived days).
- Step 3: minutes (pre-fill from AI after generate).
- Step 4: generate (button + spinner).
- Step 5: review (summary + save button).

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/__tests__/createPlanWizard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/createPlanWizard.test.tsx
git commit -m "feat: add study plan wizard flow"
```

---

### Task 6: Save generated plan to IndexedDB

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/pages/CreatePlan.tsx`

**Step 1: Write failing test**

Add test in `src/lib/__tests__/db.test.ts`:

```typescript
it('saves generated study plan', async () => {
  const plan = { id: 'plan-1', subject: 'Math', testDate: new Date(), createdDate: new Date(), totalDays: 7, suggestedMinutesPerDay: 30, topics: [] };
  await db.studyPlans.add(plan);
  const saved = await db.studyPlans.get('plan-1');
  expect(saved?.id).toBe('plan-1');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/__tests__/db.test.ts`
Expected: FAIL until implementation wiring is added

**Step 3: Implement save in CreatePlan**

- Map `PlanResponse` to `StudyPlan` and related tables.
- Persist to Dexie tables.
- Navigate to Study Session or Progress.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/__tests__/db.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/db.ts src/pages/CreatePlan.tsx src/lib/__tests__/db.test.ts
git commit -m "feat: save generated study plan to IndexedDB"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: PASS

**Step 2: Run lint and typecheck**

Run: `npm run lint`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit (if needed)**

```bash
git add .
git commit -m "chore: verify wizard flow"
```

---

**Plan complete and saved to** `docs/plans/2026-02-22-study-plan-wizard-implementation.md`.

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?