# Full Code Review: AI Study Planner

**Date:** March 2, 2026
**Scope:** Design doc (`ai-study-planner-design.md`) and implementation plan (`ai-study-planner-implementation.md`) reviewed against actual codebase.

## Summary

The codebase is well-structured and substantially implements the design document's vision. Architecture, data model, and service layer patterns are clean. There are **2 build-breaking issues**, several moderate concerns, and a set of minor improvement opportunities.

---

## Critical Issues (Build-breaking)

### 1. Missing `jsdom` dependency

`package.json` lists `vitest` with `environment: 'jsdom'` in `vite.config.ts`, but `jsdom` was not in `devDependencies`. All 39 test files failed with `ERR_MODULE_NOT_FOUND`. Fixed during review by running `npm install -D jsdom` — the fix should be committed.

### 2. Two TypeScript compilation errors

**a)** `src/components/progress/StudyCalendar.tsx:28` — `JSX.Element[]` namespace not found. The `erasableSyntaxOnly` + `react-jsx` mode in the tsconfig means the global `JSX` namespace isn't available. Fix: change `JSX.Element[]` to `React.JSX.Element[]` or just `React.ReactElement[]`.

**b)** `src/lib/sm2Calculator.ts:23` — `enum Quality` is not allowed with `erasableSyntaxOnly: true` (enums emit runtime code). Fix: convert to `const` object + type union:
```ts
export const Quality = { Again: 0, Hard: 1, Good: 2, Easy: 3 } as const;
export type Quality = (typeof Quality)[keyof typeof Quality];
```

---

## Moderate Issues

### 3. `answerQuiz` closure captures stale `state.quizzes`

In `src/hooks/useStudySession.ts:224-237`, `answerQuiz` has `[state.quizzes]` in its dependency array. Since `state.quizzes` is the same array reference after initialization, this works today, but `state` in the closure body is stale for `quizAttempts`. The quiz attempt recording reads from the current render's `state.quizzes` but dispatches independently — currently safe, but fragile. Consider moving the attempt-building logic into the reducer itself.

### 4. XP calculation mismatch vs. design spec

The **design document** specifies:
- Complete daily session: +50 XP
- Each correct quiz answer: +10 XP
- Finish flashcard deck: +15 XP
- Perfect quiz (100%): +30 bonus XP
- Streak bonuses: +20 XP per 3-day milestone

The `xpService.ts` implements these correctly, **but** `useStudySession.completeSession()` at `src/hooks/useStudySession.ts:259` uses a different formula:
```ts
const xpEarned = Math.floor(quizScore / 10) + (state.flashcardsReviewed * 2);
```
This doesn't use `calculateTotalSessionXP()` from `xpService.ts` at all. The service exists but isn't wired in — XP earnings are currently much lower than designed.

### 5. Streak not updated on session completion

`completeSession()` in `src/hooks/useStudySession.ts:271-280` updates `totalXP` and `lastStudyDate` but **never calls `updateStreak()`**. The streak counter won't increment. Meanwhile, `updateUserStatsOnSessionComplete()` in `src/lib/db.ts:68-93` does call `updateStreak()` — but is never used by the session hook.

### 6. Design spec calls for `planId` in flashcards, but flashcards have no `planId`

The `Flashcard` type only has `topicId`. Retrieving flashcards for a specific plan requires joining through `StudyDay.flashcardIds` → but those IDs are always empty arrays (`useCreatePlan.ts` line 53: `flashcardIds: []`). The query path works via `getCardsByTopicIds` instead, but the empty `flashcardIds` / `quizIds` fields on `StudyDay` are dead data.

### 7. PPTX support mentioned in design but not implemented

The design doc lists PowerPoint (PPTX) as a supported format, and `FileUpload` accepts `.pptx`, but `src/lib/textExtraction/index.ts` has no PPTX handler — it will throw "Unsupported file type." Either add a handler or remove `.pptx` from accepted types.

---

## Minor Issues / Suggestions

### 8. `CompletionScreen` doesn't use `onHome`/`onContinue` prop consistently

The design shows `onHome` prop, but `src/pages/StudySession.tsx:103` passes `onContinue`. The component seems to have been refactored — verify the prop name matches.

### 9. `Home.tsx` uses `<a href>` instead of `<Link>` for navigation

`src/pages/Home.tsx:146-155` — the empty state uses `<a href="/create-plan">` which causes a full page reload instead of client-side navigation. Should use `<Link to="/create-plan">` (already imported).

### 10. Redundant `isStepValidInState` function

`src/hooks/useCreatePlan.ts:143-163` has both `isStepValidInState` (used in reducer for `NEXT_STEP`) and the `isStepValid` callback (used by consumers). They duplicate logic — consider consolidating.

### 11. Date comparison fragility in `getTodayStudyDay`

`src/lib/planQueries.ts:4-13` uses `d.date.toDateString() === today.toDateString()`. Dexie stores `Date` objects, but if they're deserialized differently (e.g., as strings or timestamps), this comparison may fail silently. Consider normalizing to date strings on write.

### 12. Graceful degradation in `reviewService` swallows errors

`src/lib/reviewService.ts:97-102` catches all errors and only logs them. While the design spec says "don't crash," an error boundary or error state propagation would help users know if their review wasn't saved.

### 13. `useFileUpload.processFile` has a stale closure bug

In `src/hooks/useFileUpload.ts` the `processFile` function uses `files` from the state to find the file, but by the time it runs, `files` may have already been updated by `setFiles`. Since `addFiles` immediately calls `processFile` after `setFiles`, the old `files` state won't include the new file. The actual implementation should work via the `setFiles` batch, but check this carefully.

### 14. API model upgraded beyond design

The API uses `gemini-2.5-flash` (`api/generate-plan.ts:5`) while the design specifies `gemini-1.5-flash`. This is fine (newer model), but worth noting as intentional.

### 15. No `prefers-reduced-motion` handling

The design spec explicitly calls for `prefers-reduced-motion` media query support for animations. Not visible in Framer Motion usage — should add `useReducedMotion()` from Framer Motion.

---

## What's Well Done

- **Service layer separation** — `sm2Calculator`, `xpService`, `streakService`, `badgeService`, `reviewService`, `quizGrader`, `progressService` are all pure/testable. Excellent.
- **415 passing tests** with good coverage of algorithm correctness, edge cases, and component behavior.
- **SM-2 implementation** is thorough with proper JSDoc, migration support, and due-card filtering.
- **useCreatePlan hook** is well-designed with reducer pattern, step validation, and database transaction for saves.
- **Error handling in API layer** — timeout, retry, CORS, input validation, JSON parsing fallback — all solid.
- **Design doc adherence** — gamification (XP, streaks, badges), study session flow (concepts → flashcards → quiz → completion), and progress dashboard all implemented.

---

## Priority Actions

| Priority | Issue | Effort |
|----------|-------|--------|
| **P0** | Fix TS enum error (`erasableSyntaxOnly` + `Quality`) | 30 min |
| **P0** | Fix JSX namespace error in `StudyCalendar` | 5 min |
| **P1** | Wire `xpService.calculateTotalSessionXP()` into session completion | 15 min |
| **P1** | Wire `updateStreak()` into session completion (or use `updateUserStatsOnSessionComplete`) | 15 min |
| **P1** | Commit `jsdom` dependency fix | 1 min |
| **P2** | Remove PPTX from accepted types or add handler | 5 min |
| **P2** | Fix `<a href>` → `<Link>` in Home.tsx | 2 min |
| **P3** | Add `prefers-reduced-motion` support | 30 min |
| **P3** | Remove dead `flashcardIds`/`quizIds` from StudyDay | 15 min |
