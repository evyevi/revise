# Debug Panel for Create Plan Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a debug panel to the Create Plan wizard that is visible only when a `debug` query flag is present.

**Architecture:** Gate rendering of a small, read-only debug card using `URLSearchParams` and existing wizard state. No behavior changes to upload or step flow.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS

---

### Task 1: Add debug flag detection

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Test: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Add a UI test that renders the page with `?debug=1` and asserts the debug panel exists.

```tsx
it('shows debug panel when debug flag is set', async () => {
  window.history.pushState({}, '', '/create-plan?debug=1');
  render(
    <BrowserRouter>
      <CreatePlan />
    </BrowserRouter>
  );
  expect(screen.getByText('Debug')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL with "Unable to find an element".

**Step 3: Write minimal implementation**

In `CreatePlan`, compute:

```tsx
const debugEnabled = new URLSearchParams(window.location.search).has('debug');
```

Conditionally render a debug card at the bottom of the wizard when `debugEnabled` is true.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/__tests__/CreatePlan.test.tsx src/pages/CreatePlan.tsx
git commit -m "test: add debug panel coverage"
```

### Task 2: Render debug panel details

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Test: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

Add assertions that the debug panel shows key state values.

```tsx
expect(screen.getByText(/Step:/)).toBeInTheDocument();
expect(screen.getByText(/Extracted Text Length:/)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: FAIL with missing text.

**Step 3: Write minimal implementation**

Render a panel that shows:
- `step`
- `canProceed`
- `isProcessing`
- `completedFilesCount`
- `extractedText.length`
- A file list with name, status, progress, error

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/__tests__/CreatePlan.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/__tests__/CreatePlan.test.tsx src/pages/CreatePlan.tsx
git commit -m "feat: add create plan debug panel"
```

### Task 3: Verify and finish

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: PASS

**Step 2: Run lint and typecheck**

Run: `npm run lint`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit (if needed)**

Only if any fixes were required after verification.

```
git add -A
git commit -m "chore: verify debug panel"
```
