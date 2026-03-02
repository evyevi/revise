# CreatePlan Wizard UI Design

**Date:** 2026-02-22  
**Goal:** Implement a 5-step wizard flow in CreatePlan.tsx that guides users through creating an AI-generated study plan with adjustable parameters.

## Architecture

**State Management:** Use `useCreatePlan` hook (already implemented) to manage wizard state, step transitions, validation, and API calls.

**Pattern:** Single-page component that conditionally renders step content based on `state.step` value. No separate step components.

**Navigation:** Back/Next buttons for step control. Next button disabled when current step is invalid (via `canProceed` from hook).

## Wizard Flow (5 Steps)

### Step 1: Upload
- **Display:** File upload area using existing `FileUpload` + `FilePreview` components
- **Validation:** At least one file successfully extracted (checked via `extractedText.length > 0`)
- **Action:** When user clicks "Next", call `setExtractedText(getAllExtractedText())` and advance to step 2

### Step 2: Test Date
- **Display:** 
  - Heading "When is your test?"
  - `DatePicker` component (already built)
  - Display derived "You have X days to study" using `daysAvailable` from hook
- **Validation:** `testDate !== null && daysAvailable > 0`
- **Action:** `setTestDate()` updates hook state, user clicks "Next" to advance

### Step 3: Generate
- **Display:**
  - Heading "Ready to generate your study plan"
  - Show summary: test date, days available
  - "Generate Plan" button
  - `LoadingSpinner` while `isGenerating === true`
- **Validation:** N/A (just needs previous steps valid)
- **Action:** Click "Generate Plan" → `generatePlan()` → on success, auto-advance to step 4
- **Error handling:** Display `error` message inline if generation fails, allow retry

### Step 4: Review & Adjust
- **Display:**
  - Heading "Your Study Plan"
  - Plan summary (e.g., number of topics, schedule overview)
  - "Recommended daily study time" section with `MinutesInput` pre-filled with `recommendedMinutesPerDay`
  - If user changes minutes: show "Regenerate Plan" button
  - "Looks good, continue" button to advance
- **Validation:** `plan !== null`
- **Actions:**
  - `setMinutesPerDay()` when user adjusts minutes
  - "Regenerate Plan" → `generatePlan()` again with new minutes
  - "Continue" → advance to step 5

### Step 5: Save
- **Display:**
  - Confirmation screen "Review your plan details"
  - Summary of plan (subject/topic count, date range, minutes per day)
  - "Save Plan" button
- **Validation:** `plan !== null`
- **Action:** Save to IndexedDB (Task 8.6), then navigate to home/dashboard

## Navigation Controls

**Next Button:**
- Label: "Next" (steps 1-2), "Continue" (step 4), hidden (steps 3, 5)
- Disabled when: `!canProceed` from hook
- Action: Calls `nextStep()` from hook

**Back Button:**
- Label: "Back"
- Visible: Steps 2-5
- Action: Calls `prevStep()` from hook

**Special Buttons:**
- Step 3: "Generate Plan" (triggers `generatePlan()`)
- Step 4: "Regenerate Plan" (if minutes changed, triggers `generatePlan()`)
- Step 5: "Save Plan" (saves to DB - implemented in Task 8.6)

## Visual Design

**Layout:** Continue using `Layout` component with `showBottomNav={false}` during wizard flow.

**Spacing:** Consistent padding (`p-6`), max-width container (`max-w-lg mx-auto`).

**Visual Progress:** No step indicator or progress bar. User sees content change.

**Buttons:** Primary button styling (already established in codebase), disabled state for validation.

## Error Handling

**Generation Errors:**
- Display `error` from hook state in red text below "Generate Plan" button
- Provide "Try Again" action that clears error and allows retry
- Keep existing form data (testDate, extractedText) intact

**Validation:**
- Next button automatically disabled when step invalid (via hook's `canProceed`)
- No need for explicit validation messages - disabled state is sufficient

## Data Flow

1. User uploads files → `getAllExtractedText()` → `setExtractedText()`
2. User selects date → `setTestDate()` → hook computes `daysAvailable`
3. User generates → `generatePlan()` → API response sets `plan` + `recommendedMinutesPerDay`
4. User adjusts minutes → `setMinutesPerDay()` → optionally regenerates
5. User saves → (Task 8.6) maps `PlanResponse` to DB schema → navigate away

## Testing Strategy

**Unit Tests:**
- Render each step and verify content displayed
- Verify Next/Back button state based on validation
- Verify button click handlers call correct hook methods
- Mock `useCreatePlan` hook to control state

**Integration:**
- Smoke test that component renders without crashing
- Full test suite will be covered in Task 8.7

## Implementation Notes

**Existing Components to Reuse:**
- `FileUpload` / `FilePreview` (step 1)
- `DatePicker` (step 2)
- `MinutesInput` (step 4)
- `LoadingSpinner` (step 3, 4 during regenerate)
- `Layout` (wrapper)

**New Code:**
- Replace hardcoded test date/minutes in current CreatePlan.tsx
- Add conditional rendering for 5 steps
- Wire hook actions to button clicks
- Handle error display

**No New Files:** All changes in `src/pages/CreatePlan.tsx`
