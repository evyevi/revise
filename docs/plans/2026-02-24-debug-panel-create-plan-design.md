# Debug Panel for Create Plan Wizard

## Goal
Add a lightweight debug panel for troubleshooting file extraction and wizard gating. The panel is visible only when a debug flag is present in the URL.

## Scope
- UI-only: render a read-only debug card.
- Visible on all wizard steps when enabled.
- No behavior changes to file upload or wizard flow.

## Visibility
- Enabled when the URL includes `?debug=1` or any `debug` query key.
- Example: `/create-plan?debug=1`.

## UI Placement
- Render at the bottom of the Create Plan wizard layout.
- Compact card with mono text blocks for readability.

## Data Displayed
- Wizard state: `step`, `canProceed`, `isProcessing`, `completedFilesCount`.
- Extraction: `extractedTextLength`.
- Files summary list: `name`, `status`, `progress`, `error`.

## Error Handling
- Panel only reads existing state; no additional error handling needed.

## Testing
- No new tests required; panel is gated and read-only.
- Verify manually by running `npm run preview` and visiting `/create-plan?debug=1`.
