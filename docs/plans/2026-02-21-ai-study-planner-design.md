# AI-Powered Study Planner - Design Document

**Date:** February 21, 2026  
**Status:** Approved  
**Target User:** Students preparing for school tests (initial focus: high school age)

## Executive Summary

An AI-powered web application that helps students create personalized study plans with spaced repetition, gamification, and progress tracking. Students upload study materials (PDFs, images, PowerPoint), set a test deadline, and receive a daily study plan with flashcards, quizzes, and concept summaries. The app uses local-first storage with minimal backend costs, optimized for iPhone usage with future PWA capabilities.

## Problem Statement

Students often struggle to:
- Organize large amounts of study material systematically
- Create effective study schedules that ensure full content coverage
- Apply spaced repetition for better retention
- Stay motivated through consistent daily study
- Know what to prioritize when time is limited

## Solution Overview

A mobile-optimized web app that:
1. Processes study materials (PDFs, images, text, PowerPoint) via OCR and text extraction
2. Uses AI (Gemini) to analyze content and generate structured study plans
3. Creates daily study sessions with new concepts + spaced repetition reviews
4. Provides flashcards and quizzes for active recall
5. Gamifies progress with XP, streaks, badges, and encouraging feedback
6. Adapts when students fall behind (catch-up or priority-focused modes)
7. Cleans up after test completion (temporary data model)

---

## 1. Architecture Overview

### Three-Layer System

**Layer 1: Frontend (React SPA)**
- Mobile-first responsive design (optimized for iPhone)
- Modern React with hooks, React Router for navigation
- TailwindCSS for styling (pink/girly theme)
- IndexedDB wrapper (Dexie.js) for local data persistence
- File upload handling with native picker + camera capture

**Layer 2: Local Storage (IndexedDB)**
- Stores: study plans, uploaded files (as blobs), flashcards, quiz questions, progress tracking, XP/badges
- No user authentication needed (single user per device)
- Structured as relational-style tables:
  - `StudyPlans` - high-level plan metadata
  - `StudyDays` - daily schedule with topics
  - `Flashcards` - question/answer pairs
  - `QuizQuestions` - multiple choice questions
  - `ProgressLog` - completion tracking, XP, streaks
  - `UploadedFiles` - original files + extracted text

**Layer 3: AI Backend (Serverless Function)**
- Single endpoint hosted on Vercel/Netlify (free tier)
- Accepts: raw text content + deadline + current date + configuration
- Calls Gemini API to generate: study plan structure, flashcards, quiz questions
- Returns: structured JSON
- No database, stateless, just a proxy with prompt engineering

### Data Flow

```
Upload files → Extract text (frontend) → Call backend with text 
→ Gemini generates content → Cache everything locally 
→ Daily study happens offline → Delete when test done
```

---

## 2. File Upload & Content Processing

### Supported Formats
- **PDFs**: Use PDF.js library to extract text
- **Images (JPG, PNG)**: Use Tesseract.js for OCR (runs in browser)
- **PowerPoint (PPTX)**: Convert to PDF first or use pptx-parser library
- **Plain text files**: Direct read
- **Phone camera**: Native file input with camera access

### Processing Pipeline
1. User taps "Upload Files" or "Take Photo"
2. Native file picker opens (works with Files app, Google Drive, iCloud)
3. Frontend extracts text from each file type
4. Shows progress spinner during OCR processing
5. Combined text preview shown with edit capability (fix OCR mistakes)
6. Store original files + extracted text in IndexedDB

### Size Limits
- Individual files: 50MB max (prevents browser crashes)
- Total content per study plan: ~100-200 pages of text
- IndexedDB quota: 50-100MB+ per origin (sufficient)

### Mobile-Friendly Upload Interface
- **"Upload Files" button** → Opens native file picker
- **"Take Photo" button** → Opens camera directly
- **File list** → Thumbnails, size info, delete option
- Large touch targets (min 44px)
- Clear visual feedback during processing
- Preview scrollable area for extracted content

---

## 3. Study Plan Generation & Scheduling

### Input Collection
- Extracted content text + volume estimate (pages/words)
- Test deadline (date picker)
- Optional: Subject/topic name
- Optional: Daily time available slider (15/30/45/60 minutes) → adjusts ambition level

### AI Generation Process

**Step 1:** Frontend sends to serverless backend:
- Full content text (or chunked if very large)
- Deadline date
- Days available (calculated from today to deadline)
- Estimated daily minutes

**Step 2:** Backend calls Gemini API with structured prompts:

1. **Content Analysis:**
   ```
   "Analyze this study material and identify 5-10 main topics/concepts.
   For each topic, provide: topic name, importance level (high/medium/low),
   estimated learning time, and key points to remember."
   ```

2. **Schedule Generation:**
   ```
   "Create a {X}-day study plan with spaced repetition. The student has {Y} minutes
   per day. Distribute topics across days, ensuring: new content introduced gradually,
   previously learned topics reviewed at 1, 3, and 7-day intervals, final 2 days are
   comprehensive review."
   ```

3. **Content Creation:**
   ```
   "For each topic, generate:
   - 5-8 flashcards (question on front, detailed answer on back)
   - 3-5 multiple choice quiz questions with 4 options each, correct answer marked,
     and brief explanation for the correct answer."
   ```

**Step 3:** Frontend receives structured JSON and stores in IndexedDB

### Data Model

```typescript
StudyPlan {
  id: string
  subject: string
  testDate: Date
  createdDate: Date
  totalDays: number
  suggestedMinutesPerDay: number
  topics: Topic[]
}

Topic {
  id: string
  name: string
  importance: 'high' | 'medium' | 'low'
  keyPoints: string[]
}

StudyDay {
  id: string
  planId: string
  dayNumber: number
  date: Date
  completed: boolean
  newTopicIds: string[]
  reviewTopicIds: string[]
  flashcardIds: string[]
  quizIds: string[]
  estimatedMinutes: number
}

Flashcard {
  id: string
  topicId: string
  front: string  // question
  back: string   // answer
  firstShownDate: Date
  reviewDates: Date[]
  masteryLevel: number
}

QuizQuestion {
  id: string
  topicId: string
  question: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
}
```

### Spaced Repetition Logic
- **New content introduction**: Days 1-70% of timeline (spreads new topics)
- **Review schedule**: +1 day, +3 days, +7 days after first learning
- **Final review**: Last 2 days cover all topics comprehensively
- **Adaptive**: Adjusts intervals based on total days available

---

## 4. Daily Study Experience

### Home Dashboard View
- Current study plan card with test countdown timer
- Today's date and day number (e.g., "Day 5 of 14")
- Progress bar: days completed / total days
- XP counter with pink hearts icon (♥ 450 XP)
- Streak counter with flame icon (🔥 5 Day Streak!)
- Large "Start Today's Study" button (glows if not completed)

### Daily Study Session Flow

#### Step 1: Concept Summary (5 mins)
- Shows key concepts for today (new + review)
- Scrollable cards with:
  - **NEW topics**: Fresh content with 🌟 indicator
  - **REVIEW topics**: Previously learned with 🔄 indicator
- Simple, digestible bullet points per topic
- "Got it, let's practice!" button to proceed

#### Step 2: Flashcards (10-15 mins)
- Swipeable card interface (mobile-optimized)
- Front shown first → tap to flip → back revealed
- **Swipe right** = "I knew it" (confident)
- **Swipe left** = "Need more practice" (uncertain)
- Cards marked "need practice" → added to next review session sooner
- Progress indicator: "12 of 25 cards"
- Pink hearts animation when deck completed

#### Step 3: Quiz (5-10 mins)
- 5-10 multiple choice questions
- One question at a time, full screen
- Select answer → immediate feedback:
  - ✅ **Correct**: Green highlight + "Great job!" + XP earned
  - ❌ **Wrong**: Show correct answer + explanation + flag for tomorrow's review
- Option to retry wrong answers at end
- Final score screen with **tiered encouragement:**
  - **80-100%**: "Amazing! You're crushing it! 🎉" + fireworks animation
  - **60-79%**: "Good work! You're learning and improving! 💪" + sparkle animation
  - **40-59%**: "Keep going! Every practice helps you learn! 🌟" + gentle twinkle
  - **Below 40%**: "Don't worry! This content will come up again tomorrow. You've got this! 💖" + pink hearts
- All score levels earn XP (scaled: 80%+ = full points, lower = partial)
- Emphasis: "Learning is a journey, not a race!"

#### Step 4: Completion Celebration
- "Day Complete! 🎉" screen
- XP earned summary (+50 XP base, +10 per correct quiz answer)
- Streak updated
- Badge unlocked notification (if applicable)
- Confetti/hearts animation
- "See you tomorrow!" message

---

## 5. Handling Missed Days & Plan Adjustments

### One Missed Day
- Next app open shows: "Yesterday's study is waiting for you!"
- Automatically pushes missed content to today → creates double session
- Today shows: "Catch-up Day" badge
- Combined session still manageable (30-40 mins vs. normal 20)
- No penalty to streak (one-day grace period), shows "⚠️ Recovery mode"

### Multiple Missed Days (2+)
- App detects significant lag
- Shows popup: "You're behind schedule! What would you like to do?"
  - **Option A**: "Keep deadline, reduce coverage" → AI re-plans focusing on high-priority topics only
  - **Option B**: "Catch up gradually" → Redistributes content with heavier daily load warning
- User chooses → if Option A, calls backend to regenerate optimized plan (1 AI call)
- New plan maintains spaced repetition but with fewer topics
- Deadline always preserved

### User-Initiated Plan Adjustments
- Settings menu accessible anytime
- "Adjust my plan" button allows:
  - Change daily time commitment (affects depth/breadth)
  - Focus mode toggle: "Cover everything" vs "Prioritize key concepts"
- Regenerates plan via AI call with new parameters
- Original uploaded content preserved, just reshuffled

### Visual Progress Indicators
- Calendar view showing:
  - Completed days: green checkmark ✅
  - Today: blue pulse animation
  - Future days: gray outline
  - Missed days: yellow warning ⚠️
- Progress never goes backward (maintains motivation)

---

## 6. Gamification & Motivation System

### XP (Experience Points) System
- **Visual**: Pink hearts icon (♥) with number
- **Earning opportunities:**
  - Complete daily study session: +50 XP
  - Each correct quiz answer: +10 XP
  - Finish flashcard deck: +15 XP
  - Perfect quiz score (100%): +30 bonus XP
  - Streak bonuses: +20 XP per 3-day milestone
- **Display**: Prominently on dashboard and after every activity
- **Lifetime stat**: Cumulative across all study plans

### Streak Tracking
- Consecutive days studied
- Visual: Fire emoji 🔥 with number "5 Day Streak!"
- Grace period: One missed day doesn't break streak
- Resets after two consecutive missed days
- Streak milestones unlock special badges

### Badges/Achievements
- **"First Step"** - Complete first study session
- **"Dedicated Student"** - 3-day streak
- **"On Fire!"** - 5-day streak
- **"Unstoppable!"** - 7-day streak
- **"Quiz Champion"** - Score 100% on any quiz
- **"Flashcard Master"** - Complete 50 flashcards
- **"Test Ready!"** - Complete full study plan
- Displayed in profile section, collectible gallery style
- Unlocked badges get pink sparkle animation overlay

### Visual Celebrations
- **Confetti/fireworks** for major achievements
- **Pink hearts floating up** for XP gains
- **Gentle sparkles** for small wins
- **Pulsing glow effects** on incomplete action buttons
- **Encouraging messages** with emojis throughout

### Progress Visualization
- Circular progress ring for daily completion percentage
- Linear progress bar for full study plan (days completed / total)
- Topic mastery indicators: Beginner → Intermediate → Mastered
- Dashboard shows trending statistics

---

## 7. Study Plan Completion & Cleanup

### When Test Date Arrives
- Special "Test Day!" banner appears
- Optional: "Take final practice quiz" (comprehensive quiz covering all topics)
- Encouragement message: "You've prepared well! Good luck! 🍀"

### Post-Test Flow
- Day after test date, app shows prompt:
  - "Your test is over! Hope it went well! 🎉"
  - Displays final stats: Total XP earned, longest streak, topics mastered, completion percentage
  - Celebration screen with all badges earned

### Data Cleanup Flow
- Prompt shown: "Would you like to delete this study plan?"
- Shows storage size being used
- Two options:
  - **"Keep for review"** - Archives plan (read-only, can reference materials later)
  - **"Delete everything"** - Removes all content, keeps only XP/badges (for stats)
- Manual deletion available anytime from study plan menu
- Confirmation dialog: "Are you sure? This will permanently delete all study materials."

### What Gets Deleted
- All uploaded files and extracted text
- All study days, flashcards, quiz questions
- Study plan structure and schedule
- Frees up IndexedDB storage

### What Gets Preserved
- Total lifetime XP (cumulative across all plans)
- All badges earned
- Lifetime statistics: total days studied, tests completed, highest streak

### Multiple Study Plans
- Can manage multiple active plans simultaneously (studying for multiple tests)
- Each plan independent with own schedule and deadline
- Combined XP pool and badge collection (shared profile)
- Dashboard shows all active plans as cards
- Swipe or select to switch between plans

---

## 8. Technical Stack & Libraries

### Frontend
- **React 18+** with Vite (fast dev server, optimized builds)
- **React Router** for navigation
- **TailwindCSS** for styling (easy pink/girly theme customization)
- **Dexie.js** - IndexedDB wrapper with simpler API
- **PDF.js** - Mozilla's PDF text extraction library
- **Tesseract.js** - Browser-based OCR for image text extraction
- **Framer Motion** - Smooth animations for celebrations and transitions
- **React Query** (optional) - Managing async operations and caching

### Backend
- **Vercel Serverless Functions** (or Netlify Functions) - free tier friendly
- **Node.js** runtime
- **Google Generative AI SDK** for Gemini API integration
- Single endpoint: `POST /api/generate-study-plan`
- Stateless, no database required

### Development Tools
- **TypeScript** - Type safety for better code quality and fewer bugs
- **ESLint + Prettier** - Code quality and consistent formatting
- **Vitest** - Fast unit testing framework

### Hosting
- **Frontend**: Vercel/Netlify static hosting (free tier)
- **Backend**: Same platform's serverless functions
- **Total cost**: $0/month for single user usage
- Scales automatically if needed

### Browser Support
- Modern browsers: Chrome, Safari, Firefox
- iOS Safari 15+ (primary target for iPhone)
- Service Worker ready for future PWA conversion

### Security Note

⚠️ **Before production deployment**: Conduct security audit of all dependencies including:
- Supply chain analysis
- Vulnerability scanning (npm audit, Snyk)
- License compliance review
- Assessment of maintainer trustworthiness
- Consider tools like Socket.dev for dependency risk assessment

---

## 9. AI Integration & Prompting Strategy

### Gemini API Configuration
- **Model**: `gemini-1.5-flash` (free tier, good balance of speed/quality)
- **Rate limits**: 15 requests per minute, 1500 per day (sufficient for this use case)
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max tokens**: 2000-4000 depending on content size
- **Response format**: Structured JSON for easy parsing

### AI Prompt Engineering

Backend sends three structured prompts to Gemini:

**1. Content Analysis & Topic Extraction:**
```
"You are an educational content analyst. Analyze the following study material 
and identify 5-10 main topics/concepts that a student should focus on.

For each topic, provide:
- Topic name (concise, 3-7 words)
- Importance level (high/medium/low)
- Estimated learning time (in minutes)
- 3-5 key points to remember

Material:
{extracted_text}

Return your response as JSON matching this structure:
{
  "topics": [
    {
      "name": "Topic name",
      "importance": "high",
      "estimatedMinutes": 20,
      "keyPoints": ["point 1", "point 2", ...]
    }
  ]
}
"
```

**2. Study Schedule Generation:**
```
"Create a {days_available}-day study plan using spaced repetition principles.
The student can study {minutes_per_day} minutes per day.

Requirements:
- Introduce new topics gradually (spread across first 70% of timeline)
- Review previously learned topics at intervals: +1 day, +3 days, +7 days
- Final 2 days should be comprehensive review of all topics
- Balance daily workload (avoid overwhelming any single day)
- Adjust repetition intervals based on total days available

Topics to schedule:
{topics_json}

Return JSON with daily schedule:
{
  "days": [
    {
      "dayNumber": 1,
      "newTopicIds": ["topic1", "topic2"],
      "reviewTopicIds": [],
      "estimatedMinutes": 25
    },
    ...
  ]
}
"
```

**3. Flashcard & Quiz Generation:**
```
"For the following topic, generate study materials:

Topic: {topic_name}
Key Points: {key_points}

Generate:
1. 5-8 flashcards:
   - Front: Question or concept prompt
   - Back: Detailed answer or explanation
   
2. 3-5 multiple choice quiz questions:
   - Clear question
   - 4 answer options (1 correct, 3 plausible distractors)
   - Mark the correct answer
   - Provide brief explanation for correct answer

Return as JSON:
{
  "flashcards": [
    {"front": "...", "back": "..."}
  ],
  "quizQuestions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2,
      "explanation": "..."
    }
  ]
}
"
```

### Response Processing
- Frontend parses structured JSON from AI
- Validates data structure and content
- Stores directly in IndexedDB tables
- No additional AI calls during study sessions (everything pre-generated)
- Errors trigger user-friendly retry prompts

### Cost Optimization
- AI called only 1-2 times per study plan:
  - Initial plan generation: 1 call
  - Optional re-planning if adjustments needed: 1 call
- Typical usage pattern: 2-3 study plans/month = 4-6 API calls/month
- Well within Gemini free tier limits (1500 requests/day)
- All generated content cached locally
- No repeated generation of same content

---

## 10. UI/UX Design Principles

### Mobile-First Design
- All layouts optimized for iPhone first (375px-428px width)
- Touch targets minimum 44px × 44px (Apple HIG guidelines)
- Bottom navigation for main actions (thumb-friendly zone)
- Swipe gestures for flashcards (intuitive mobile interaction)
- Minimal text input (most interactions are taps/swipes)
- Single-column layouts for readability
- Generous padding/spacing for touch accuracy

### Visual Design Theme

**Color Palette:**
- Primary: Pink/rose (#FF69B4, #FFC0CB variations)
- Accent: Purple/lavender (#DDA0DD)
- Success: Soft green (#90EE90)
- Warning: Soft yellow (#FFD700)
- Error: Soft red (#FFB6C1)
- Background: Cream/off-white (#FFF8F0)
- Text: Dark gray (#333333) for readability

**Typography:**
- Rounded, friendly fonts (Inter Rounded, Quicksand, or Comfortaa)
- Clear hierarchy: h1 (24px), h2 (20px), body (16px), small (14px)
- Line height 1.5 for readability

**Animations:**
- Smooth transitions (200-300ms duration)
- Delightful but not distracting
- Reduce motion respected (prefers-reduced-motion media query)

### Key Screens

**1. Home/Dashboard**
- Current study plan cards (if any)
- Stats summary (XP, streak, badges)
- Large "Create New Plan" button
- Bottom nav: Home, Progress, Profile

**2. Create Plan Flow**
- Step 1: Upload files (preview thumbnails)
- Step 2: Set deadline (calendar picker)
- Step 3: Configure time (slider 15-60 mins)
- Step 4: Review and generate (shows processing spinner)

**3. Study Session**
- Full-screen immersive mode
- Progress indicator at top
- Sequential flow: Concepts → Flashcards → Quiz
- Exit confirmation if session incomplete

**4. Progress View**
- Calendar heatmap showing completed days
- Stats cards: Days completed, XP earned, streak
- Topic mastery breakdown
- Badge gallery

**5. Settings**
- Adjust active study plan
- Delete old plans
- About/Help
- Feature toggles (animations, notifications)

### User Flow Simplicity
- Maximum 3 taps to start studying from home
- Clear back buttons always visible (top-left)
- Progress indicators show where you are in multi-step flows
- Confirmation dialogs only for destructive actions
- Consistent button placement (primary action bottom-right)

### Accessibility Considerations
- Color contrast meets WCAG AA minimum (4.5:1 for text)
- Text remains readable when zoomed to 200%
- Focus indicators visible for keyboard navigation
- Alt text for all images and icons
- Semantic HTML structure
- ARIA labels for interactive elements
- Support for screen readers

---

## 11. Error Handling & Edge Cases

### File Upload Errors

**File too large (>50MB):**
- Message: "This file is too large. Try splitting it into smaller parts or upload only key pages."
- Action: Allow user to try another file

**Unsupported format:**
- Message: "This file type isn't supported yet. Try PDF, images (JPG/PNG), or text files."
- Action: Show list of supported formats

**OCR failure:**
- Message: "Couldn't read text from this image. Try retaking with better lighting or higher contrast."
- Action: Option to retry or upload different file

**Corrupted file:**
- Message: "This file seems damaged. Try re-downloading or re-saving it."
- Action: Remove from upload list, allow retry

### AI Generation Errors

**API rate limit hit:**
- Message: "Too many requests right now. Please wait a few minutes and try again."
- Action: Show countdown timer (2-3 minutes), auto-retry option

**Network timeout:**
- Message: "Connection timed out. Check your internet and try again."
- Action: Retry button, check network status

**Invalid/incomplete response:**
- Message: "Something went wrong generating your plan. Let's try again."
- Action: Automatic retry (up to 3 attempts), fallback to simplified plan

**Content too large:**
- Message: "This content is very large (40+ pages). Consider splitting into multiple study plans for better results."
- Action: Option to proceed anyway or split content

### Study Session Errors

**IndexedDB quota exceeded:**
- Message: "Storage is full. Please delete old study plans to free up space."
- Action: Show list of plans with sizes, quick delete option

**Corrupted local data:**
- Message: "We found a small data issue, but your progress is safe. Refreshing this session..."
- Action: Auto-recover from backup snapshot or skip corrupted day

**Missing flashcard/quiz:**
- Silently skip the corrupted item
- Log for debugging
- Continue session without interruption

### Offline Handling

**Initial plan creation (requires internet):**
- Clear message: "Generating your study plan requires internet connection."
- Show network status indicator
- Queue request if connection drops during generation

**Daily study (works offline):**
- Badge: "Offline Mode" shown in corner
- All study activities function normally
- Progress synced when online (for future multi-device support)

### User-Friendly Error Patterns

**Tone:**
- Never show technical jargon or stack traces
- Use encouraging language: "Oops!" instead of "Error"
- Always suggest concrete next action

**Visual:**
- Pink/purple error messages (match theme, not scary red)
- Friendly icons (🤔 💭 💡)
- Retry buttons prominently placed

**Logging:**
- Console errors for debugging (development only)
- User-friendly messages shown in UI
- Optional error reporting to dev team (future feature)

### Fallback Behaviors

**If spaced repetition logic fails:**
- Default to simple sequential review
- Log issue for investigation
- User experience not blocked

**If animations fail:**
- App functions without animations
- Graceful degradation
- No console spam

**If date calculations fail:**
- Use simple day-by-day scheduling
- Warn user of simplified mode
- Maintain core functionality

---

## 12. Future Extensibility & PWA Path

### Phase 1: Current Design (MVP)
**Timeline:** 4-6 weeks  
**Features:**
- Single user per device
- Local-first storage (IndexedDB)
- Gemini free tier integration
- Web app optimized for iPhone
- Core study flow: upload → plan → study → complete
- Basic gamification (XP, streaks, badges)

**Success Criteria:**
- Successfully uploads and processes 10-page PDF
- Generates 7-day study plan in <30 seconds
- Smooth daily study experience on iPhone
- Zero cost at single-user scale

### Phase 2: PWA Enhancement
**Timeline:** 2-3 days (after Phase 1 stable)  
**Features:**
- Add `manifest.json` for installability
- Service Worker for true offline capability
- Custom app icon on home screen
- Splash screen on launch
- Push notifications for daily study reminders (opt-in)
- iOS add-to-homescreen prompt

**Benefits:**
- Feels like native app
- Works completely offline after initial setup
- No App Store submission required
- Notifications increase daily engagement

### Phase 3: Multi-User Support
**Timeline:** 1-2 weeks refactor  
**Features:**
- Add Firebase Authentication (Google Sign-in initially)
- Migrate from IndexedDB to Firestore for cloud sync
- User profiles with personalized stats
- Access same study plans from multiple devices
- Optional: Share study materials with friends
- Parent dashboard (view child's progress)

**Architecture Impact:**
- Backend adds user context to all operations
- Storage layer abstracted (easy to swap IndexedDB → Firestore)
- Minimal frontend changes due to service layer pattern

### Phase 4: Additional AI Providers
**Timeline:** 3-5 days per provider  
**Features:**
- Abstracted AI service interface
- Add OpenAI GPT-4 option
- Add Anthropic Claude option
- Add local LLM support (Ollama integration)
- User selects provider in settings
- Each provider requires API key input

**Benefits:**
- Users choose cost vs. quality trade-off
- Reduces dependency on single provider
- Local LLM option for privacy-conscious users

### Phase 5: Advanced Features (Post-MVP)

**Content Features:**
- Voice recording for study notes (transcribed by AI)
- Image-based quiz questions (diagrams, charts)
- Video content support (YouTube links with transcript extraction)
- Handwritten notes via drawing pad

**Social Features:**
- Study with friends (collaborative study plans)
- Share flashcard decks with classmates
- Public study plan library (community-created)
- Competitive leaderboards (opt-in)

**Parent/Teacher Features:**
- Parent dashboard (monitor progress)
- Teacher mode (create plans for students)
- Class integration (assign study plans to groups)

**Export/Integration:**
- Export study materials as PDF
- Export flashcards to Anki/Quizlet
- Integration with Google Classroom
- Calendar sync (study sessions as events)

**Analytics:**
- Detailed learning analytics
- Topic difficulty assessment
- Optimal study time recommendations
- Retention rate tracking

### Code Architecture for Extensibility

**Service Layer Pattern:**
```typescript
// Easy to swap implementations
interface AIService {
  generateStudyPlan(content: string, config: Config): Promise<Plan>
}

interface StorageService {
  savePlan(plan: Plan): Promise<void>
  getPlan(id: string): Promise<Plan>
}

// Concrete implementations
class GeminiAIService implements AIService { }
class IndexedDBStorageService implements StorageService { }
class FirestoreStorageService implements StorageService { }
```

**Configuration-Driven Features:**
```typescript
// Feature flags stored in config
const features = {
  multiUser: false,
  pushNotifications: false,
  socialSharing: false,
  analytics: false
}
```

**Modular Component Structure:**
```
/src
  /components
    /study     (all study session components)
    /upload    (file upload components)
    /gamification (XP, badges, streaks)
  /services
    /ai        (AI provider abstractions)
    /storage   (storage layer abstractions)
  /hooks       (reusable business logic)
  /utils       (pure functions)
```

**API Contracts:**
- Clear TypeScript interfaces for all services
- Version API responses for backward compatibility
- Graceful degradation when features unavailable

---

## Success Metrics

### Phase 1 Goals
- Successfully process 95%+ of uploaded files
- Generate study plan in <30 seconds
- Complete study session <20 minutes per day
- Zero runtime errors on iPhone Safari
- 80%+ user task completion rate (upload → complete first day)

### User Satisfaction Indicators
- Student completes 70%+ of daily goals
- Streak average >3 days
- Study plans consistently used until test date
- Positive qualitative feedback on motivation

### Technical Health
- Lighthouse score >90 for Performance, Accessibility
- 0 console errors in production
- IndexedDB operations <100ms
- AI API calls <2 per study plan lifecycle

---

## Risks & Mitigations

### Risk: Gemini API free tier rate limits
**Mitigation:** Very unlikely with 1500/day limit for single user; add queue system if needed

### Risk: Large PDFs crash browser during OCR
**Mitigation:** Process in chunks, show progress, enforce 50MB limit, add worker threads

### Risk: AI generates poor-quality questions
**Mitigation:** Prompt engineering refinement, manual review during testing, user feedback loop

### Risk: User loses data if browser storage cleared
**Mitigation:** Accepted trade-off for MVP; Phase 3 adds cloud sync

### Risk: iPhone Safari compatibility issues
**Mitigation:** Test extensively on real devices, use polyfills, follow iOS Safari documentation

---

## Conclusion

This design provides a solid foundation for an AI-powered study planner that is:
- **User-focused**: Optimized for student motivation and learning effectiveness
- **Cost-effective**: Near-zero operational costs for single/small user base
- **Technically sound**: Modern, maintainable architecture with clear extensibility path
- **Pedagogically grounded**: Spaced repetition, active recall, bite-sized learning
- **Delightful**: Gamification and encouraging feedback keep students engaged

The local-first architecture with minimal backend keeps complexity and costs low while delivering a fast, reliable experience. The design naturally extends to PWA, multi-user, and advanced features when ready to scale.

**Next Steps:** Create detailed implementation plan with task breakdown and timeline estimation.
