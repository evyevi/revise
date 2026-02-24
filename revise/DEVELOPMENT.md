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

Current setting: `gemini-pro` (most compatible)

If it still fails, try editing `api/generate-plan.ts` line 5:
```typescript
// Try these in order:
const MODEL_NAME = 'gemini-pro';           // ✅ Most stable
const MODEL_NAME = 'gemini-1.5-pro';       // Newer, if available
const MODEL_NAME = 'gemini-1.5-flash';     // Faster, if available
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

## Deployment

All commits to `main` branch auto-deploy to Vercel. To manually deploy:

```bash
vercel --prod
```

Environment variables must be set in Vercel project dashboard for production.
