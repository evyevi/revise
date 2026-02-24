# Revise - AI Study Planner

An intelligent study planning application that uses AI to generate personalized study schedules based on your test date and available study time.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with PostCSS
- **Testing**: Vitest with React Testing Library
- **Database**: Dexie (IndexedDB)
- **AI**: Google Generative AI
- **Document Processing**: PDFjs for PDFs, Tesseract.js for images
- **Deployment**: Vercel

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or yarn/pnpm)
- **Vercel CLI**: Optional, for local Vercel development server

## Setup and Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd revise
```

### 2. Install Dependencies

```bash
npm install
```

This installs all project dependencies including dev dependencies for testing and building.

## Development Mode

### Start Development Server

Run the development server with hot module replacement (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

**Features**:
- Fast refresh on file changes
- Full source maps for debugging
- Browser DevTools integration

### Environment Setup

For AI features (study plan generation) to work, you need the Gemini API key:

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

**Note**: This is used by the backend API function (`api/generate-plan.ts`), not the frontend code.

## Testing

### Run All Tests

```bash
npm test
```

This runs all test files with Vitest in watch mode.

### Run Tests with UI

```bash
npm test -- --ui
```

Launches the Vitest UI dashboard for interactive test viewing and debugging at `http://localhost:51204/__vitest__/`.

### Run Tests Once

```bash
npm test -- --run
```

Runs tests once without watching for changes (useful for CI/CD).

### Run Specific Test File

```bash
npm test -- src/components/__tests__/DatePicker.test.tsx
```

### Test Coverage

Tests are configured in `vitest.setup.ts` and use:
- `jsdom` environment for DOM testing
- `@testing-library/react` for component testing
- `@testing-library/user-event` for user interaction testing

## Building for Production

### Build the Application

```bash
npm run build
```

This performs two operations:
1. **TypeScript Compilation**: `tsc -b` - Compiles TypeScript and checks for type errors
2. **Vite Build**: `vite build` - Bundles the application for production

Output is generated in the `dist/` directory.

**Build Output**:
- Optimized and minified JavaScript bundles
- CSS bundled from Tailwind CSS
- Static assets processed and hashed for cache busting

### Preview Production Build Locally

After building, preview the production build:

```bash
npm run preview
```

The production build will be available at `http://localhost:4173`.

## Running with Vercel Localhost Server

### Install Vercel CLI (if not already installed)

```bash
npm install -g vercel@latest
```

Or if you have it installed locally:

```bash
npx vercel
```

### Start Development Server with Vercel

Run the application through Vercel's local development server:

```bash
# Option 1: Load environment from Vercel project (requires Vercel project link)
vercel env pull
vercel dev

# Option 2: Pass environment variables directly from .env.local
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
vercel dev
```

**What this does**:
- Starts a local server that mimics the Vercel production environment
- Serves your React frontend from Vite
- Runs serverless functions from the `api/` directory
- API functions have access to environment variables

**Default URL**: `http://localhost:3000`

**Important**: `vercel dev` does not automatically load `.env.local` for API functions. You must either:
1. Use `vercel env pull` to sync environment from your Vercel project
2. Manually export environment variables before running `vercel dev`
3. Or use `npm run dev` instead (dev server only, no API functions locally)

**Configuration**: Vercel settings are defined in `vercel.json`:
- API functions in `api/` directory have a 30-second timeout
- Static assets are automatically served

### API Functions

Serverless API functions are located in:
- `api/generate-plan.ts` - Generates study plans using AI

These functions are automatically deployed with your Vercel deployment.

## Code Quality

### Lint Code

```bash
npm run lint
```

Runs ESLint to check code for style and error issues.

- Configuration: `eslint.config.js`
- Checks TypeScript and JSX files

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── __tests__/      # Component tests
│   └── study-session/  # Study session specific components
├── hooks/              # Custom React hooks
│   └── __tests__/      # Hook tests
├── lib/                # Utility functions and libraries
│   ├── __tests__/      # Lib tests
│   └── textExtraction/ # PDF and image text extraction
├── pages/              # Page components (routes)
│   └── __tests__/      # Page tests
├── types/              # TypeScript type definitions
└── assets/             # Static assets

api/                    # Serverless API functions
dist/                   # Production build output (generated)
docs/plans/             # Implementation and design docs
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Make Changes

Edit files in `src/`. Changes automatically reload in the browser.

### 3. Run Tests

```bash
npm test
```

### 4. Lint Code

```bash
npm run lint
```

### 5. Build and Test Production

```bash
npm run build
npm run preview
```

### 6. Deploy to Vercel

```bash
git push origin main
```

Automatic deployment is triggered on push to main branch (if configured).

## Troubleshooting

### Port Already in Use

If port 5173 (dev) or 4173 (preview) is in use:

```bash
# For dev server, specify a different port
npm run dev -- --port 5174

# Or kill the process using the port
lsof -ti:5173 | xargs kill -9
```

### Vercel Dev Server Issues

```bash
# Clear Vercel cache
vercel env pull

# Restart with fresh dependencies
rm -rf node_modules .next
npm install
vercel dev
```

### Tests Failing

```bash
# Clear Vitest cache
npm test -- --clearCache

# Run with more verbose output
npm test -- --reporter=verbose
```

### Build Errors

```bash
# Check TypeScript errors
npx tsc --noEmit

# Clear build cache
rm -rf dist
npm run build
```

### Study Plan Generation Not Working

**Problem**: Getting "API key not configured" or study plan generation fails

**Solutions**:

1. **For `npm run preview`** (static build preview):
   - Study plan generation will NOT work with `npm run preview`
   - `npm run preview` only serves static files, no API functions
   - Use `vercel dev` or `npm run dev + external API call` instead

2. **For `vercel dev` (Vercel dev server)**:
   - Ensure environment variables are loaded:
   ```bash
   # Option A: Pull from Vercel project
   vercel env pull
   vercel dev

   # Option B: Export from .env.local
   export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2)
   vercel dev
   ```

3. **For `npm run dev` (Vite dev server)**:
   - Vite dev server alone cannot run serverless API functions
   - Study plan generation requires the backend API
   - Deploy to Vercel or use a backend server alongside Vite dev

4. **Check API endpoint is correct**:
   - Verify `api/generate-plan.ts` endpoint is accessible
   - Test API directly:
   ```bash
   curl -X POST http://localhost:3000/api/generate-plan \
     -H "Content-Type: application/json" \
     -d '{"content": "test", "daysAvailable": 5}'
   ```
   - Should return a study plan or descriptive error

## Environment Variables

Create `.env.local` in the project root:

```
VITE_GOOGLE_AI_API_KEY=your_api_key_here
```

**Note**: Variables prefixed with `VITE_` are exposed to the client-side code.

## Deployment

### Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect repository to Vercel dashboard
3. Vercel automatically deploys on push to main

Or manually deploy:

```bash
# Login to Vercel
vercel login

# Deploy
vercel
```

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
