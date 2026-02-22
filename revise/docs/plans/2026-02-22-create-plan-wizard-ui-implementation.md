# CreatePlan Wizard UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform CreatePlan.tsx into a 5-step wizard using the useCreatePlan hook to manage state, validation, and AI plan generation.

**Architecture:** Replace current CreatePlan with conditional step rendering. Use useCreatePlan hook for state management. Integrate existing components (FileUpload, DatePicker, MinutesInput, LoadingSpinner). No visual step indicator, just content transitions with Back/Next buttons.

**Tech Stack:** React 18 + TypeScript, existing reusable components, useCreatePlan hook (Task 8.4), Vitest + React Testing Library

---

## Task 1: Scaffold wizard structure with steps 1-2

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Create: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Create `src/pages/__tests__/CreatePlan.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreatePlan } from '../CreatePlan';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    files: [],
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    getAllExtractedText: vi.fn(() => ''),
  }),
}));

vi.mock('../../hooks/useCreatePlan', () => ({
  useCreatePlan: () => ({
    step: 1,
    extractedText: '',
    testDate: null,
    daysAvailable: 0,
    recommendedMinutesPerDay: null,
    minutesPerDay: null,
    plan: null,
    isGenerating: false,
    error: null,
    canProceed: false,
    isStepValid: vi.fn(),
    setExtractedText: vi.fn(),
    setTestDate: vi.fn(),
    setMinutesPerDay: vi.fn(),
    setRecommendedMinutesPerDay: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    goToStep: vi.fn(),
    generatePlan: vi.fn(),
    reset: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe('CreatePlan wizard', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders step 1 (upload) initially', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/upload.*study materials/i)).toBeInTheDocument();
  });

  it('does not show Back button on step 1', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.queryByText(/back/i)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL (CreatePlan.tsx doesn't render step-based content yet)

**Step 3: Write minimal implementation**

Replace `src/pages/CreatePlan.tsx` with wizard structure:

```typescript
import { useCallback } from 'react';
import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { DatePicker } from '../components/DatePicker';
import { useFileUpload } from '../hooks/useFileUpload';
import { useCreatePlan } from '../hooks/useCreatePlan';

export function CreatePlan() {
  const { files, addFiles, removeFile, getAllExtractedText } = useFileUpload();
  const {
    step,
    testDate,
    daysAvailable,
    canProceed,
    setExtractedText,
    setTestDate,
    nextStep,
    prevStep,
  } = useCreatePlan();

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

  const completedFilesCount = files.filter((f) => f.status === 'completed').length;
  const hasError = files.some((f) => f.status === 'error');
  const isProcessing = files.some((f) => f.status === 'pending' || f.status === 'processing');

  const handleNext = useCallback(() => {
    if (step === 1) {
      // Before advancing from upload, capture extracted text
      const text = getAllExtractedText();
      setExtractedText(text);
    }
    nextStep();
  }, [step, getAllExtractedText, setExtractedText, nextStep]);

  return (
    <Layout showBottomNav={false}>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create Study Plan</h1>

        {/* Step 1: Upload */}
        {step === 1 && (
          <>
            <p className="text-gray-600 mb-6">Upload your study materials to get started</p>
            
            <FileUpload onFilesSelected={handleFilesSelected} />
            
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-gray-700">
                    Uploaded Files ({completedFilesCount}/{files.length})
                  </h2>
                  {hasError && (
                    <p className="text-xs text-red-600">Some files failed</p>
                  )}
                </div>
                {files.map((fileInfo) => (
                  <FilePreview
                    key={fileInfo.id}
                    fileName={fileInfo.file.name}
                    fileSize={fileInfo.file.size}
                    status={fileInfo.status}
                    progress={fileInfo.progress}
                    error={fileInfo.error}
                    onRemove={() => removeFile(fileInfo.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Test Date */}
        {step === 2 && (
          <>
            <p className="text-gray-600 mb-6">When is your test?</p>
            
            <DatePicker
              value={testDate}
              onChange={setTestDate}
              label="Test Date"
              minDate={new Date()}
            />
            
            {testDate && daysAvailable > 0 && (
              <p className="mt-4 text-sm text-gray-600">
                You have <span className="font-semibold">{daysAvailable} days</span> to study
              </p>
            )}
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold active:scale-95 transition-all hover:bg-gray-50"
            >
              Back
            </button>
          )}
          
          {step <= 2 && (
            <button
              type="button"
              disabled={!canProceed || (step === 1 && isProcessing)}
              onClick={handleNext}
              className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {step === 1 && isProcessing ? 'Processing...' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/CreatePlan.test.tsx
git commit -m "feat: add wizard steps 1-2 to CreatePlan"
```

---

## Task 2: Add step 3 (Generate)

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Modify: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Add to `src/pages/__tests__/CreatePlan.test.tsx`:

```typescript
it('renders step 3 (generate) with plan button', () => {
  const mockUseCreatePlan = vi.mocked(useCreatePlan);
  mockUseCreatePlan.mockReturnValue({
    ...mockUseCreatePlan(),
    step: 3,
    extractedText: 'content',
    testDate: new Date('2026-02-24'),
    daysAvailable: 2,
    canProceed: true,
  });

  renderWithRouter(<CreatePlan />);
  expect(screen.getByText(/ready to generate/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL (step 3 content not rendered)

**Step 3: Write minimal implementation**

Add step 3 content to `src/pages/CreatePlan.tsx` after step 2:

```typescript
        {/* Step 3: Generate */}
        {step === 3 && (
          <>
            <p className="text-gray-600 mb-6">Ready to generate your study plan</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Test Date:</span>
                <span className="font-semibold">
                  {testDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Available:</span>
                <span className="font-semibold">{daysAvailable} days</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={async () => {
                await generatePlan();
                // On success, hook will auto-advance if we add that logic
              }}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </button>

            {isGenerating && (
              <div className="mt-4 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            )}
          </>
        )}
```

Add needed imports and hook destructuring at top of component:

```typescript
import { LoadingSpinner } from '../components/LoadingSpinner';

// In useCreatePlan destructuring:
const {
  step,
  testDate,
  daysAvailable,
  error,
  isGenerating,
  canProceed,
  setExtractedText,
  setTestDate,
  nextStep,
  prevStep,
  generatePlan,
} = useCreatePlan();
```

Update navigation buttons section to hide Next on step 3:

```typescript
          {step <= 2 && (
```

**Step 4: Run test to verify it passes**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/CreatePlan.test.tsx
git commit -m "feat: add step 3 (generate) to CreatePlan wizard"
```

---

## Task 3: Add step 4 (Review & Adjust)

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Modify: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Add to `src/pages/__tests__/CreatePlan.test.tsx`:

```typescript
it('renders step 4 (review) with plan details and minutes input', () => {
  const mockPlan = {
    topics: [{ id: '1', name: 'Math', importance: 'high' as const, keyPoints: [], estimatedMinutes: 60 }],
    schedule: [],
    flashcards: [],
    quizQuestions: [],
    recommendedMinutesPerDay: 30,
  };

  const mockUseCreatePlan = vi.mocked(useCreatePlan);
  mockUseCreatePlan.mockReturnValue({
    ...mockUseCreatePlan(),
    step: 4,
    plan: mockPlan,
    recommendedMinutesPerDay: 30,
    canProceed: true,
  });

  renderWithRouter(<CreatePlan />);
  expect(screen.getByText(/your study plan/i)).toBeInTheDocument();
  expect(screen.getByText(/1 topics/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL (step 4 content not rendered)

**Step 3: Write minimal implementation**

Add step 4 content to `src/pages/CreatePlan.tsx` after step 3:

```typescript
        {/* Step 4: Review & Adjust */}
        {step === 4 && plan && (
          <>
            <p className="text-gray-600 mb-6">Your Study Plan</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Topics:</span>
                <span className="font-semibold">{plan.topics.length} topics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Study Days:</span>
                <span className="font-semibold">{plan.schedule.length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Flashcards:</span>
                <span className="font-semibold">{plan.flashcards.length} cards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quiz Questions:</span>
                <span className="font-semibold">{plan.quizQuestions.length} questions</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Study Time
              </label>
              <MinutesInput
                value={minutesPerDay ?? recommendedMinutesPerDay ?? 30}
                onChange={setMinutesPerDay}
                label=""
              />
              <p className="mt-1 text-xs text-gray-500">
                AI recommended: {recommendedMinutesPerDay} minutes/day
              </p>
            </div>

            {minutesPerDay !== null && minutesPerDay !== recommendedMinutesPerDay && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={generatePlan}
                className="w-full mb-3 border-2 border-primary-500 text-primary-600 py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate Plan'}
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600"
            >
              Continue
            </button>
          </>
        )}
```

Add needed imports and hook destructuring:

```typescript
import { MinutesInput } from '../components/MinutesInput';

// In useCreatePlan destructuring:
const {
  step,
  testDate,
  daysAvailable,
  recommendedMinutesPerDay,
  minutesPerDay,
  plan,
  error,
  isGenerating,
  canProceed,
  setExtractedText,
  setTestDate,
  setMinutesPerDay,
  nextStep,
  prevStep,
  generatePlan,
} = useCreatePlan();
```

**Step 4: Run test to verify it passes**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/CreatePlan.test.tsx
git commit -m "feat: add step 4 (review & adjust) to CreatePlan wizard"
```

---

## Task 4: Add step 5 (Save placeholder)

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Modify: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Add to `src/pages/__tests__/CreatePlan.test.tsx`:

```typescript
it('renders step 5 (save) with confirmation', () => {
  const mockPlan = {
    topics: [{ id: '1', name: 'Math', importance: 'high' as const, keyPoints: [], estimatedMinutes: 60 }],
    schedule: [{ dayNumber: 1, newTopicIds: ['1'], reviewTopicIds: [], estimatedMinutes: 30 }],
    flashcards: [],
    quizQuestions: [],
    recommendedMinutesPerDay: 30,
  };

  const mockUseCreatePlan = vi.mocked(useCreatePlan);
  mockUseCreatePlan.mockReturnValue({
    ...mockUseCreatePlan(),
    step: 5,
    plan: mockPlan,
    testDate: new Date('2026-02-24'),
    daysAvailable: 2,
    minutesPerDay: 30,
    canProceed: true,
  });

  renderWithRouter(<CreatePlan />);
  expect(screen.getByText(/review your plan/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /save plan/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL (step 5 content not rendered)

**Step 3: Write minimal implementation**

Add step 5 content to `src/pages/CreatePlan.tsx` after step 4:

```typescript
        {/* Step 5: Save */}
        {step === 5 && plan && (
          <>
            <p className="text-gray-600 mb-6">Review your plan details</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Topics:</span>
                <span className="font-semibold">{plan.topics.length} topics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Test Date:</span>
                <span className="font-semibold">
                  {testDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Study Time:</span>
                <span className="font-semibold">{minutesPerDay ?? recommendedMinutesPerDay} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Days:</span>
                <span className="font-semibold">{plan.schedule.length} days</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // TODO: Save to DB in Task 8.6
                console.log('Plan ready to save:', plan);
                alert('Save to DB will be implemented in Task 8.6');
              }}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600"
            >
              Save Plan
            </button>
          </>
        )}
```

**Step 4: Run test to verify it passes**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS

**Step 5: Run full test suite**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/CreatePlan.test.tsx
git commit -m "feat: add step 5 (save placeholder) to CreatePlan wizard"
```

---

## Task 5: Add auto-advance after generate

**Files:**
- Modify: `src/pages/CreatePlan.tsx`

**Step 1: Implement auto-advance logic**

In step 3's Generate Plan button onClick handler, add logic to advance to step 4 on success:

```typescript
            <button
              type="button"
              disabled={isGenerating}
              onClick={async () => {
                await generatePlan();
                // Auto-advance to step 4 if plan was generated successfully
                if (!error && plan) {
                  nextStep();
                }
              }}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
            >
```

Note: This requires checking plan state AFTER generatePlan completes. Since generatePlan is async and updates state, we need to use useEffect or check in the next render. Simpler approach: remove auto-advance for now, require manual Continue button click.

**Alternative simpler approach:** Keep step 3 as-is. After generate completes, show a "Continue" button that appears when plan exists.

Modify step 3 to add Continue button when plan exists:

```typescript
        {/* Step 3: Generate */}
        {step === 3 && (
          <>
            <p className="text-gray-600 mb-6">Ready to generate your study plan</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Test Date:</span>
                <span className="font-semibold">
                  {testDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Available:</span>
                <span className="font-semibold">{daysAvailable} days</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {!plan && (
              <>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={generatePlan}
                  className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isGenerating ? 'Generating...' : 'Generate Plan'}
                </button>

                {isGenerating && (
                  <div className="mt-4 flex justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                )}
              </>
            )}

            {plan && !isGenerating && (
              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600"
              >
                Continue to Review
              </button>
            )}
          </>
        )}
```

**Step 2: Run test suite**

Run: `/opt/homebrew/Cellar/node/25.6.0/bin/node node_modules/.bin/vitest --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/pages/CreatePlan.tsx
git commit -m "feat: show continue button after plan generation"
```

---

## Execution Complete

All wizard steps implemented:
- ✅ Step 1: Upload with file management
- ✅ Step 2: Test date selection with days calculation
- ✅ Step 3: Generate plan with loading state and error handling
- ✅ Step 4: Review with adjustable minutes and regenerate
- ✅ Step 5: Save placeholder (DB implementation in Task 8.6)

**Next:** Task 8.6 will implement the actual DB save logic and navigation after save.
