# Development Guide

Quick reference for common development tasks.

## Prerequisites

- Node.js v18+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Quick Start

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Create .env.local with API key
echo "GEMINI_API_KEY=your_api_key_here" > .env.local
```

### 2. Choose Your Development Mode

#### Option A: Vite Dev Server (Frontend only)
```bash
npm run dev
```
- ✅ Fast refresh and HMR
- ❌ No API functions/plan generation
- URL: http://localhost:5173

#### Option B: Vercel Dev Server (Full stack)
```bash
# Make API key available to serverless functions
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
vercel dev
```
- ✅ API functions work, study plan generation works
- ✅ Mimics production environment
- ⚠️ Slightly slower startup
- URL: http://localhost:3000

#### Option C: Production Preview
```bash
npm run build
npm run preview
```
- ❌ No API functions
- ✅ Tests production bundle
- URL: http://localhost:4173

## Running Tests

```bash
# Watch mode
npm test

# Single run (CI)
npm test -- --run

# UI dashboard
npm test -- --ui

# Specific test
npm test -- src/pages/__tests__/CreatePlan.test.tsx
```

## Testing Study Plan Generation

### Test API directly
```bash
curl -X POST http://localhost:3000/api/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Introduction to machine learning: supervised learning, neural networks",
    "daysAvailable": 5,
    "minutesPerDay": 30
  }'
```

### Test via UI
1. Start `vercel dev` (with environment variable)
2. Navigate to http://localhost:3000
3. Upload a study material file (PDF/TXT)
4. Fill in test date and available days
5. Click "Generate Plan"

## Common Issues

### "API key not configured" Error
**When running `vercel dev`:**
```bash
# Solution: Export the key before starting
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
vercel dev

# Or sync from Vercel project
vercel env pull
vercel dev
```

### "Model not found" Error (404)
**Symptom**: `models/gemini-X is not found for API version v1beta`

**Solution**: The model name needs to match what's available for your API key.

Current setting: `gemini-2.5-flash` (fast, current)

If it still fails, try editing `api/generate-plan.ts` line 5:
```typescript
// Try these in order:
const MODEL_NAME = 'gemini-2.5-flash';     // ✅ Fast, current
const MODEL_NAME = 'gemini-2.0-flash';     // Stable fallback
const MODEL_NAME = 'gemini-pro';           // Widest compatibility
```

**Debug which models are available**:
```bash
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | grep '"name"'
```

### Plan generation not working with `npm run preview`
- `npm run preview` is a static file server only
- API functions don't run with preview
- Use `vercel dev` instead

### Port conflicts
```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 5174
```

## Code Quality

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Format
npx eslint . --fix
```

## Committing Changes

```bash
# Stage files
git add .

# Commit with conventional commits
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue X"
git commit -m "docs: update README"

# Push to main (auto-deploys to Vercel)
git push origin main
```

## SM-2 Architecture

Revise implements the SuperMemo 2 (SM-2) spaced repetition algorithm for flashcard scheduling.

### Core Components

**1. SM-2 Calculator** (`src/lib/sm2Calculator.ts`)
- Implements the SM-2 algorithm formula
- Calculates next review interval, easiness factor, and repetitions
- Quality enum: Again (0), Hard (1), Good (2), Easy (3)
- Formula: `EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))`
- EF clamped to [1.3, 2.5]

**2. Review Service** (`src/lib/reviewService.ts`)
- Records flashcard reviews in database
- Updates card metadata: EF, interval, repetitions, nextReviewDate
- Derives mastery level from EF
- Maintains review history (up to 100 dates per card)

**3. Plan Queries** (`src/lib/planQueries.ts`)
- `getFlashcardsDueForReview()`: Filters cards where nextReviewDate ≤ today
- Used by Study Session to show only cards ready for review
- Dashboard shows count of due cards per plan/topic

**4. Mastery Calculator** (`src/lib/masteryCalculator.ts`)
- Converts EF to MasteryLevel enum (Not Started, Learning, Familiar, Mastered)
- EF < 1.8 = Learning, 1.8-2.1 = Familiar, > 2.1 = Mastered
- Used for color-coding in UI and progress analytics

### Data Model

**Flashcard Schema** (extends base flashcard):
```typescript
{
  easinessFactor: number;        // 1.3 - 2.5, default 2.5
  interval: number;              // Days until next review
  repetitions: number;           // Consecutive correct reviews
  nextReviewDate: Date;          // When card is due
  firstShownDate: Date;          // First review timestamp
  reviewDates: Date[];           // Review history (max 100)
}
```

### Review Flow

1. User opens Study Session
2. `getFlashcardsDueForReview()` fetches cards where nextReviewDate ≤ today
3. User views flashcard and rates quality (0-3)
4. `recordFlashcardReview()` calls `calculateSM2()` with current state
5. SM-2 returns new EF, interval, repetitions
6. Card updated in DB with new values + nextReviewDate = now + interval
7. Dashboard reflects updated mastery level and due count

### Interval Progression Example

Rating "Good" (quality = 2) every time:
- Review 1: 1 day
- Review 2: 6 days
- Review 3: 15 days (6 × 2.5)
- Review 4: 37 days (15 × 2.5)
- Review 5: 92 days (37 × 2.5)

Rating "Again" resets repetitions to 0 and interval to 1 day.

### Key Files

- `src/lib/sm2Calculator.ts` - Algorithm implementation
- `src/lib/reviewService.ts` - Database integration
- `src/lib/planQueries.ts` - Due card filtering
- `src/components/study-session/FlashcardDeck.tsx` - 4-button grading UI
- `src/components/progress/TopicMasteryGrid.tsx` - Visual mastery display

### Testing

SM-2 is fully tested with 415+ tests:
- `src/lib/__tests__/sm2Calculator.test.ts` - Algorithm correctness
- `src/lib/__tests__/reviewService.test.ts` - Database updates
- `src/components/study-session/__tests__/FlashcardDeck.test.tsx` - UI grading

## Deployment

All commits to `main` branch auto-deploy to Vercel. To manually deploy:

```bash
vercel --prod
```

Environment variables must be set in Vercel project dashboard for production.
