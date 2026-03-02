# Save Plan to Database - Design Document

**Date:** February 22, 2026  
**Status:** Approved  
**Context:** Task 8.6 - Replace placeholder save logic with actual database persistence

## Overview

Implement database save functionality for the CreatePlan wizard by adding a `savePlan()` method to the `useCreatePlan` hook. This method transforms the wizard's state (PlanResponse from AI) into structured database entities across 5 IndexedDB tables, then navigates the user to the home dashboard.

## Architecture Decision

**Approach:** Add `savePlan` method to useCreatePlan hook (single source of truth for wizard state and operations)

**Rationale:**
- Hook already owns wizard state and validation logic
- Clean separation: hook = business logic, component = UI + navigation
- Testable without component dependencies
- Consistent with existing hook patterns (generatePlan already there)

**Alternatives considered:**
- Separate `useSavePlan` hook: More modular but YAGNI (no reuse needed)
- Inline save logic in component: Fast but violates separation of concerns

## Data Transformation

Transform wizard state into 5 database tables:

### 1. StudyPlan (main record)
```typescript
{
  id: crypto.randomUUID(),
  subject: `${plan.topics[0].name} Study Plan`, // Auto-generate from first topic
  testDate: state.testDate,
  createdDate: new Date(),
  totalDays: daysAvailable,
  suggestedMinutesPerDay: state.minutesPerDay || state.recommendedMinutesPerDay,
  topics: state.plan.topics // Keep structure identical
}
```

### 2. StudyDays (one per day in schedule)
Map from `state.plan.schedule[]`:
```typescript
{
  id: crypto.randomUUID(),
  planId: studyPlanId,
  dayNumber: schedule.dayNumber,
  date: new Date(createdDate.getTime() + (dayNumber - 1) * 86400000),
  completed: false,
  newTopicIds: schedule.newTopicIds,
  reviewTopicIds: schedule.reviewTopicIds,
  flashcardIds: [], // Populated later when flashcards are assigned
  quizIds: [], // Populated later when quizzes are assigned
  estimatedMinutes: schedule.estimatedMinutes
}
```

### 3. Flashcards
Map from `state.plan.flashcards[]`:
```typescript
{
  id: crypto.randomUUID(),
  topicId: flashcard.topicId,
  front: flashcard.front,
  back: flashcard.back,
  firstShownDate: undefined,
  reviewDates: [],
  masteryLevel: 0,
  needsPractice: false
}
```

### 4. QuizQuestions
Map from `state.plan.quizQuestions[]`:
```typescript
{
  id: crypto.randomUUID(),
  topicId: quizQuestion.topicId,
  question: quizQuestion.question,
  options: quizQuestion.options,
  correctAnswerIndex: quizQuestion.correctIndex, // Field name mapping
  explanation: quizQuestion.explanation
}
```

### 5. UploadedFiles
Get from `useFileUpload` hook (files array):
```typescript
{
  id: crypto.randomUUID(),
  planId: studyPlanId,
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
  uploadedAt: new Date(),
  extractedText: state.extractedText, // Full combined text
  fileBlob: file // Store original file
}
```

## Hook API

### New State
Add to `WizardState`:
```typescript
isSaving: boolean; // Loading state during save operation
```

### New Action
Add to `WizardAction`:
```typescript
| { type: 'SET_SAVING'; payload: boolean }
```

### New Method
```typescript
const savePlan = async (files: File[]): Promise<string>
```

**Parameters:**
- `files`: File array from useFileUpload hook (needed for UploadedFiles table)

**Returns:**
- Promise resolving to saved plan ID (string)

**Throws:**
- Validation errors if required state missing (testDate, plan, extractedText)
- Database errors with user-friendly messages

**Side Effects:**
- Sets `isSaving: true` during operation
- Clears `error` state on start
- Sets `error` state on failure
- Uses Dexie transaction for atomicity (all-or-nothing save)

## Error Handling

### Validation
Throw immediately if:
- `state.testDate` is null
- `state.plan` is null
- `state.extractedText` is empty

### Database Errors
- Wrap all db operations in try-catch
- Use Dexie transaction to ensure atomicity
- On error: Attempt rollback (delete partially saved data), set error state
- Error messages: User-friendly (e.g., "Failed to save study plan. Please try again.")

### Rollback Strategy
If any table save fails:
1. Delete StudyPlan record (cascades will handle related records if configured)
2. Re-throw error with user-friendly message
3. Keep `isSaving: false` so user can retry

## UI Integration (CreatePlan.tsx)

### Step 5 Changes

**Replace placeholder logic:**
```typescript
// OLD (placeholder):
console.log('Saving plan:', state.plan);
alert('Saved! (TODO: Save to DB in Task 8.6)');

// NEW (actual save):
const handleSave = async () => {
  try {
    await savePlan(files);
    navigate('/'); // Navigate to home/dashboard
  } catch {
    // Error already in hook state, will display
  }
};
```

**Button states:**
- Default: "Save Plan" (enabled)
- Saving: "Saving..." with LoadingSpinner (disabled)
- Error: "Save Plan" (re-enabled for retry), error message displayed above

**Error display:**
Use same pattern as steps 3 & 4:
```typescript
{error && (
  <div className="text-red-600 mb-4">
    {error}
  </div>
)}
```

**Navigation:**
- Import `useNavigate` from react-router-dom
- Call `navigate('/')` after successful save
- User lands on home/dashboard (where plans list will be in future)

## Testing Strategy

### Hook Tests (useCreatePlan.test.tsx)
1. Mock `db` module (all tables)
2. Test `savePlan()` validation (throws when testDate/plan/extractedText missing)
3. Test successful transformation (PlanResponse → DB entities have correct structure)
4. Test error handling (db.add fails → error state set, isSaving reset)
5. Test `isSaving` state updates (true during save, false after)
6. Test transaction rollback (if StudyDays fails, StudyPlan deleted)

### Component Tests
No new tests needed:
- Save button rendering already tested
- Hook tests cover savePlan() logic
- Integration tests would require real DB (out of scope)

## Success Criteria

1. ✅ `savePlan()` method added to useCreatePlan hook
2. ✅ All 5 database tables populated correctly from wizard state
3. ✅ Subject auto-generated from first topic name
4. ✅ Files saved to uploadedFiles table with blobs
5. ✅ Error handling with user-friendly messages
6. ✅ Transaction atomicity (all-or-nothing saves)
7. ✅ UI shows loading state during save
8. ✅ Navigation to home after successful save
9. ✅ All tests passing (76+ tests)
10. ✅ TypeScript clean

## Implementation Notes

- Use `crypto.randomUUID()` for all ID generation (browser-native, no dependencies)
- Date calculations: `new Date(createdDate.getTime() + (dayNumber - 1) * 86400000)` for StudyDay dates
- Transaction: Use `db.transaction('rw', [db.studyPlans, db.studyDays, ...], async () => { ... })`
- Keep transformation logic in separate helper functions for testability
