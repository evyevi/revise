# useCreatePlan Hook Design (Task 8.4)

Date: 2026-02-22

## Goals
- Provide a single hook to manage wizard state for the study plan flow.
- Own AI plan generation calls and expose derived fields.
- Keep step transitions and validation centralized.

## Recommended Approach
Use a reducer-driven hook to manage state transitions with derived selectors.

Why:
- Clear step gating and state transitions.
- Easy to test and reason about.
- Scales as wizard steps and validations grow.

## State Shape
- step: number
- files: uploaded file list and processing status
- extractedText: aggregated text
- testDate: Date | null
- daysAvailable: number (derived from testDate and today)
- recommendedMinutesPerDay: number | null
- minutesPerDay: number | null
- plan: PlanResponse | null
- isGenerating: boolean
- error: string | null

## Derived Selectors
- daysAvailable (derived)
- isStepValid(step)
- canProceed (based on current step validity)
- canGenerate (extractedText + daysAvailable valid)
- canSave (plan present)

## Step Validation
1) Upload: require at least one file and non-empty extractedText
2) Test date: require testDate >= today
3) Minutes: require minutesPerDay within 5-480; if null, use recommendedMinutesPerDay
4) Generate: require content + daysAvailable
5) Review: require plan

## API Flow
- generatePlan() assembles request { content, daysAvailable, minutesPerDay? }
- First generate omits minutesPerDay to receive recommendation
- Response sets plan and recommendedMinutesPerDay
- If user adjusts minutes, generatePlan() runs again with minutesPerDay
- Error handling updates error string and clears isGenerating

## Public Hook API
State:
- step, files, extractedText, testDate, daysAvailable
- recommendedMinutesPerDay, minutesPerDay, plan
- isGenerating, error

Actions:
- setTestDate, setMinutesPerDay, setRecommendedMinutesPerDay
- nextStep, prevStep, goToStep
- generatePlan, reset, clearError

## Testing
- Initial state values
- Step gating behavior
- daysAvailable computation from testDate
- generatePlan request assembly with and without minutesPerDay
- Error handling and isGenerating toggles

## Accessibility
- No direct DOM work in hook; UI layer remains responsible for focus and aria attributes.
