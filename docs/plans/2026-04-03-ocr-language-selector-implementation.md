# OCR Language Selector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a language selector to the Create Plan upload step so users can choose which language Tesseract OCR uses when extracting text from images.

**Architecture:** Language state is owned by `CreatePlan`, passed to `useFileUpload` as a parameter, threaded through `processFile` → `extractTextFromFile` → `extractTextFromImage`. `FileUpload` component is unchanged. PDFs and plain text files are unaffected.

**Tech Stack:** React, TypeScript, Tesseract.js, Vitest + Testing Library

---

### Task 1: Fix imageExtractor default language

**Files:**
- Modify: `src/lib/textExtraction/imageExtractor.ts`
- Test: `src/lib/textExtraction/__tests__/imageExtractor.test.ts`

**Step 1: Update the failing test first**

In `imageExtractor.test.ts`, find the existing test `'passes eng+swe+fra as default language to Tesseract'` and update it:

```ts
it('passes eng as default language to Tesseract', async () => {
  const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });

  await extractTextFromImage(file);

  expect(mockRecognize).toHaveBeenCalledWith(
    file,
    'eng',
    expect.objectContaining({ logger: expect.any(Function) })
  );
});
```

**Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/lib/textExtraction/__tests__/imageExtractor.test.ts
```

Expected: FAIL — `expected 'eng+swe+fra' to equal 'eng'`

**Step 3: Change the default in imageExtractor.ts**

In `src/lib/textExtraction/imageExtractor.ts`, change the function signature:

```ts
// Before
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
  language: string = 'eng+swe+fra'
): Promise<string> {
```

```ts
// After
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
  language: string = 'eng'
): Promise<string> {
```

Also update the JSDoc comment on that parameter:
```ts
 * @param language - Tesseract language code (default: 'eng')
```

**Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/lib/textExtraction/__tests__/imageExtractor.test.ts
```

Expected: all PASS

**Step 5: Commit**

```bash
git add src/lib/textExtraction/imageExtractor.ts src/lib/textExtraction/__tests__/imageExtractor.test.ts
git commit -m "fix: change imageExtractor default language from eng+swe+fra to eng"
```

---

### Task 2: Thread language through useFileUpload

**Files:**
- Modify: `src/hooks/useFileUpload.ts`
- Test: `src/hooks/__tests__/useFileUpload.test.tsx`

**Step 1: Write the failing test**

Add this test to `useFileUpload.test.tsx`, inside the `describe('useFileUpload')` block, after the existing tests:

```ts
it('passes the language param to extractTextFromFile', async () => {
  vi.mocked(textExtraction.extractTextFromFile).mockResolvedValue('texte extrait');

  const { result } = renderHook(() => useFileUpload('fra'));
  const mockFile = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });

  await act(async () => {
    await result.current.addFiles([mockFile]);
  });

  await waitFor(() => {
    expect(textExtraction.extractTextFromFile).toHaveBeenCalledWith(
      mockFile,
      expect.any(Function),
      'fra'
    );
  });
});
```

**Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/hooks/__tests__/useFileUpload.test.tsx
```

Expected: FAIL — hook doesn't accept a language param yet

**Step 3: Update useFileUpload to accept and use language**

In `src/hooks/useFileUpload.ts`:

1. Change the function signature (line ~28):
```ts
// Before
export function useFileUpload(): UseFileUploadReturn {
```
```ts
// After
export function useFileUpload(language: string = 'eng'): UseFileUploadReturn {
```

2. In `processFile`, pass `language` to `extractTextFromFile` (line ~103):
```ts
// Before
const text = await extractTextFromFile(file, (progress) => {
  updateFileProgress(id, progress);
});
```
```ts
// After
const text = await extractTextFromFile(file, (progress) => {
  updateFileProgress(id, progress);
}, language);
```

**Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/hooks/__tests__/useFileUpload.test.tsx
```

Expected: all PASS

**Step 5: Commit**

```bash
git add src/hooks/useFileUpload.ts src/hooks/__tests__/useFileUpload.test.tsx
git commit -m "feat: thread language param through useFileUpload to OCR extractor"
```

---

### Task 3: Add language selector to CreatePlan

**Files:**
- Modify: `src/pages/CreatePlan.tsx`
- Test: `src/pages/__tests__/CreatePlan.test.tsx`

**Step 1: Write the failing test**

In `src/pages/__tests__/CreatePlan.test.tsx`, add a test (place it near the other step 1 tests):

```ts
it('renders a language selector in step 1', () => {
  render(<CreatePlan />, { wrapper: createWrapper() });

  expect(screen.getByRole('combobox', { name: /ocr language/i })).toBeInTheDocument();
});
```

**Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/pages/__tests__/CreatePlan.test.tsx
```

Expected: FAIL — no combobox found

**Step 3: Add language state and selector to CreatePlan**

In `src/pages/CreatePlan.tsx`:

1. Add `useState` import if not already destructured (it's already imported via `useCallback`/`useEffect` — add `useState`):
```ts
import { useState, useCallback, useEffect } from 'react';
```

2. Define the language list constant at the top of the file, above the component:
```ts
const OCR_LANGUAGES = [
  { label: 'Svenska', code: 'swe' },
  { label: 'Français', code: 'fra' },
  { label: 'Afrikaans', code: 'afr' },
  { label: 'Arabic', code: 'ara' },
  { label: 'Bulgarian', code: 'bul' },
  { label: 'Chinese (Simplified)', code: 'chi_sim' },
  { label: 'Chinese (Traditional)', code: 'chi_tra' },
  { label: 'Croatian', code: 'hrv' },
  { label: 'Czech', code: 'ces' },
  { label: 'Danish', code: 'dan' },
  { label: 'Dutch', code: 'nld' },
  { label: 'English', code: 'eng' },
  { label: 'Estonian', code: 'est' },
  { label: 'Finnish', code: 'fin' },
  { label: 'German', code: 'deu' },
  { label: 'Greek', code: 'ell' },
  { label: 'Hebrew', code: 'heb' },
  { label: 'Hindi', code: 'hin' },
  { label: 'Hungarian', code: 'hun' },
  { label: 'Indonesian', code: 'ind' },
  { label: 'Italian', code: 'ita' },
  { label: 'Japanese', code: 'jpn' },
  { label: 'Korean', code: 'kor' },
  { label: 'Latvian', code: 'lav' },
  { label: 'Lithuanian', code: 'lit' },
  { label: 'Norwegian', code: 'nor' },
  { label: 'Polish', code: 'pol' },
  { label: 'Portuguese', code: 'por' },
  { label: 'Romanian', code: 'ron' },
  { label: 'Russian', code: 'rus' },
  { label: 'Serbian', code: 'srp' },
  { label: 'Slovak', code: 'slk' },
  { label: 'Slovenian', code: 'slv' },
  { label: 'Spanish', code: 'spa' },
  { label: 'Thai', code: 'tha' },
  { label: 'Turkish', code: 'tur' },
  { label: 'Ukrainian', code: 'ukr' },
  { label: 'Vietnamese', code: 'vie' },
] as const;
```

3. Inside the `CreatePlan` component, add language state (right after the hook calls):
```ts
const [ocrLanguage, setOcrLanguage] = useState('eng');
```

4. Pass `ocrLanguage` to `useFileUpload`:
```ts
// Before
const { files, addFiles, removeFile, getAllExtractedText } = useFileUpload();
```
```ts
// After
const { files, addFiles, removeFile, getAllExtractedText } = useFileUpload(ocrLanguage);
```

5. In the step 1 JSX, add the language selector **above** `<FileUpload>`:
```tsx
{/* OCR Language selector — only affects image files */}
<div className="mb-4">
  <label
    htmlFor="ocr-language"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Image text language
  </label>
  <select
    id="ocr-language"
    aria-label="OCR language"
    value={ocrLanguage}
    onChange={(e) => setOcrLanguage(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
  >
    {OCR_LANGUAGES.map(({ label, code }) => (
      <option key={code} value={code}>
        {label}
      </option>
    ))}
  </select>
  <p className="mt-1 text-xs text-gray-500">Only used when extracting text from photos</p>
</div>

<FileUpload onFilesSelected={handleFilesSelected} />
```

**Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/pages/__tests__/CreatePlan.test.tsx
```

Expected: all PASS

**Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all PASS

**Step 6: Commit**

```bash
git add src/pages/CreatePlan.tsx src/pages/__tests__/CreatePlan.test.tsx
git commit -m "feat: add OCR language selector to CreatePlan upload step"
```
