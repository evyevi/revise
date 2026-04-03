# OCR Language Selector — Design

**Date:** 2026-04-03  
**Status:** Approved

## Problem

When extracting text from images (JPG/PNG) via Tesseract OCR, the language defaults to `'eng+swe+fra'` (all three loaded simultaneously). Users uploading materials in other languages get poor OCR results. PDF and plain-text extraction are unaffected — they do not use OCR.

## Goal

Allow the user to select the OCR language before uploading image files. One language setting applies to all files in the session.

## Approach

Language state is owned by `CreatePlan`. A `<select>` element is rendered in step 1 (the upload step) above the upload buttons. The selected language flows down to `useFileUpload` as a parameter, which threads it through to `extractTextFromFile` → `extractTextFromImage`.

`FileUpload` component remains a dumb drop-zone — no changes.

```
CreatePlan (language state, default: 'eng')
  └─ <select> language picker (step 1 only)
  └─ useFileUpload(language)
       └─ extractTextFromFile(file, onProgress, language)
            └─ extractTextFromImage(file, onProgress, language)
```

PDFs bypass `extractTextFromImage` entirely and are unaffected.

## Language List

Swedish and French appear first; remaining ~30 languages sorted alphabetically by display name.

| Display Name         | Tesseract Code |
|----------------------|----------------|
| Svenska              | swe            |
| Français             | fra            |
| Afrikaans            | afr            |
| Arabic               | ara            |
| Bulgarian            | bul            |
| Chinese (Simplified) | chi_sim        |
| Chinese (Traditional)| chi_tra        |
| Croatian             | hrv            |
| Czech                | ces            |
| Danish               | dan            |
| Dutch                | nld            |
| English              | eng            |
| Estonian             | est            |
| Finnish              | fin            |
| German               | deu            |
| Greek                | ell            |
| Hebrew               | heb            |
| Hindi                | hin            |
| Hungarian            | hun            |
| Indonesian           | ind            |
| Italian              | ita            |
| Japanese             | jpn            |
| Korean               | kor            |
| Latvian              | lav            |
| Lithuanian           | lit            |
| Norwegian            | nor            |
| Polish               | pol            |
| Portuguese           | por            |
| Romanian             | ron            |
| Russian              | rus            |
| Serbian              | srp            |
| Slovak               | slk            |
| Slovenian            | slv            |
| Spanish              | spa            |
| Thai                 | tha            |
| Turkish              | tur            |
| Ukrainian            | ukr            |
| Vietnamese           | vie            |

## Changes Required

### `src/lib/textExtraction/imageExtractor.ts`
- Change default language from `'eng+swe+fra'` to `'eng'`

### `src/hooks/useFileUpload.ts`
- Accept `language?: string` parameter (default `'eng'`)
- Pass language through `processFile` → `extractTextFromFile`

### `src/pages/CreatePlan.tsx`
- Add `language` state (default `'eng'`)
- Render `<select>` in step 1 above `<FileUpload>`
- Pass `language` to `useFileUpload`

### `src/components/FileUpload.tsx`
- No changes

## Tests

- `imageExtractor.test.ts` — update default language assertion from `'eng+swe+fra'` to `'eng'`
- `useFileUpload.test.tsx` — add test that the `language` param is forwarded to `extractTextFromFile`
- `FileUpload.test.tsx` — no changes
