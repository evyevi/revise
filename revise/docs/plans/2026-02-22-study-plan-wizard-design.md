# Study Plan Wizard Design (Task 8)

Date: 2026-02-22

## Goals
- Build a wizard flow for creating a study plan.
- Use AI to return a full plan plus `recommendedMinutesPerDay` during generation.
- Allow the user to adjust minutes and regenerate.

## Wizard Flow
1. Upload
2. Test Date
3. Daily Minutes (AI recommended, adjustable)
4. Generate
5. Review

## State Model
- `step`: wizard step index
- `files`: uploaded file list and processing status
- `extractedText`: aggregated text from completed files
- `testDate`: chosen test date
- `daysAvailable`: derived from today to test date
- `recommendedMinutes`: from AI response
- `minutesPerDay`: user-adjusted minutes
- `plan`: generated plan response
- `isGenerating`: AI request in progress
- `error`: current error message

## API Contract
- Request: `{ content, daysAvailable, minutesPerDay }`
- Response: `{ topics, schedule, flashcards, quizQuestions, recommendedMinutesPerDay }`
- First generate can omit `minutesPerDay`; AI returns recommendation.
- Regenerate sends `minutesPerDay` to refine plan.

## Components
- `DatePicker`: choose test date (min today)
- `LoadingSpinner`: used during generation
- Wizard header/progress indicator
- `MinutesInput`: slider or numeric input with plus/minus

## UX and Validation
- Step-level validation; Next disabled if required data missing.
- Inline error banner per step with retry option.
- Generation step shows spinner and disables navigation.
- Review shows compact cards for topics, schedule preview, flashcards, quizzes.
- Save action writes plan to IndexedDB.

## Accessibility
- Focus moves to the step header when step changes.
- Buttons disabled and have `aria-disabled` when blocked.
- Generation progress uses `aria-live="polite"`.

## Trade-offs
- Single AI call (recommended): fewer requests, simpler state, regenerate only if minutes change.
- Two-stage AI call: faster minute prefill but higher API cost and complexity.

## Open Questions
- None. User selected wizard flow with AI-based recommended minutes returned during generate.
