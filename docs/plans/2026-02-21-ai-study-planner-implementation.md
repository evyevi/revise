# AI Study Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered study planner web app that helps students create personalized study schedules with spaced repetition, gamification, and progress tracking.

**Architecture:** Local-first React SPA with IndexedDB storage, serverless backend for Gemini AI integration, mobile-optimized for iPhone with future PWA capabilities.

**Tech Stack:** React 18 + Vite + TypeScript, TailwindCSS, Dexie.js (IndexedDB), PDF.js, Tesseract.js, Framer Motion, Vercel Functions, Google Gemini API

---

## Phase 1: Project Setup & Foundation

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `.gitignore`

**Step 1: Initialize Vite React TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

Expected: Project scaffolded with React + TypeScript

**Step 2: Install core dependencies**

```bash
npm install react-router-dom dexie dexie-react-hooks framer-motion
npm install -D tailwindcss postcss autoprefixer @types/node
```

Expected: Dependencies installed successfully

**Step 3: Initialize TailwindCSS**

```bash
npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created

**Step 4: Configure Tailwind with pink theme**

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F7',
          100: '#FFE3E8',
          200: '#FFC0CB',
          300: '#FF9DB8',
          400: '#FF69B4',
          500: '#FF1493',
          600: '#E01070',
        },
        accent: {
          50: '#F5EBFF',
          100: '#E8D4FF',
          200: '#DDA0DD',
          300: '#D896D8',
        },
        cream: '#FFF8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**Step 5: Update src/index.css with Tailwind**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-cream text-gray-800;
    font-family: 'Inter', system-ui, sans-serif;
  }
}
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: initialize project with React, TypeScript, Tailwind"
```

---

### Task 2: Setup Database Schema

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/types/index.ts`

**Step 1: Define TypeScript types**

Create `src/types/index.ts`:

```typescript
export interface StudyPlan {
  id: string;
  subject: string;
  testDate: Date;
  createdDate: Date;
  totalDays: number;
  suggestedMinutesPerDay: number;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  importance: 'high' | 'medium' | 'low';
  keyPoints: string[];
}

export interface StudyDay {
  id: string;
  planId: string;
  dayNumber: number;
  date: Date;
  completed: boolean;
  newTopicIds: string[];
  reviewTopicIds: string[];
  flashcardIds: string[];
  quizIds: string[];
  estimatedMinutes: number;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
  firstShownDate?: Date;
  reviewDates: Date[];
  masteryLevel: number;
  needsPractice?: boolean;
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ProgressLog {
  id: string;
  planId: string;
  dayId: string;
  completedAt: Date;
  xpEarned: number;
  quizScore: number;
  flashcardsReviewed: number;
}

export interface UserStats {
  id: string;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: Date;
  badges: string[];
}

export interface UploadedFile {
  id: string;
  planId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  extractedText: string;
  fileBlob?: Blob;
}
```

**Step 2: Setup Dexie database**

Create `src/lib/db.ts`:

```typescript
import Dexie, { Table } from 'dexie';
import {
  StudyPlan,
  StudyDay,
  Flashcard,
  QuizQuestion,
  ProgressLog,
  UserStats,
  UploadedFile,
} from '../types';

export class StudyPlannerDB extends Dexie {
  studyPlans!: Table<StudyPlan, string>;
  studyDays!: Table<StudyDay, string>;
  flashcards!: Table<Flashcard, string>;
  quizQuestions!: Table<QuizQuestion, string>;
  progressLogs!: Table<ProgressLog, string>;
  userStats!: Table<UserStats, string>;
  uploadedFiles!: Table<UploadedFile, string>;

  constructor() {
    super('StudyPlannerDB');
    
    this.version(1).stores({
      studyPlans: 'id, testDate, createdDate',
      studyDays: 'id, planId, date, dayNumber, completed',
      flashcards: 'id, topicId, firstShownDate',
      quizQuestions: 'id, topicId',
      progressLogs: 'id, planId, dayId, completedAt',
      userStats: 'id',
      uploadedFiles: 'id, planId, uploadedAt',
    });
  }
}

export const db = new StudyPlannerDB();
```

**Step 3: Create database utility functions**

Add to `src/lib/db.ts`:

```typescript
// Initialize user stats if not exists
export async function initUserStats(): Promise<UserStats> {
  const existing = await db.userStats.get('default');
  if (existing) return existing;
  
  const newStats: UserStats = {
    id: 'default',
    totalXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    badges: [],
  };
  
  await db.userStats.add(newStats);
  return newStats;
}

// Get or create user stats
export async function getUserStats(): Promise<UserStats> {
  const stats = await db.userStats.get('default');
  return stats || initUserStats();
}
```

**Step 4: Test database initialization**

Create `src/lib/__tests__/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db, initUserStats, getUserStats } from '../db';

describe('Database', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('initializes user stats', async () => {
    const stats = await initUserStats();
    expect(stats.id).toBe('default');
    expect(stats.totalXP).toBe(0);
    expect(stats.currentStreak).toBe(0);
  });

  it('retrieves existing user stats', async () => {
    await initUserStats();
    const stats = await getUserStats();
    expect(stats).toBeDefined();
    expect(stats.id).toBe('default');
  });
});
```

**Step 5: Setup Vitest**

Install test dependencies:

```bash
npm install -D vitest @vitest/ui happy-dom
```

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
  },
});
```

**Step 6: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 7: Commit**

```bash
git add .
git commit -m "feat: setup database schema and IndexedDB with Dexie"
```

---

### Task 3: Basic Routing & Layout

**Files:**
- Create: `src/App.tsx`
- Create: `src/pages/Home.tsx`
- Create: `src/pages/CreatePlan.tsx`
- Create: `src/pages/StudySession.tsx`
- Create: `src/pages/Progress.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/components/BottomNav.tsx`

**Step 1: Create Layout component**

Create `src/components/Layout.tsx`:

```typescript
import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <main className="flex-1 pb-20">
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
```

**Step 2: Create BottomNav component**

Create `src/components/BottomNav.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link
          to="/progress"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/progress') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">📊</span>
          <span className="text-xs mt-1">Progress</span>
        </Link>
        
        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/profile') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">⭐</span>
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
```

**Step 3: Create placeholder pages**

Create `src/pages/Home.tsx`:

```typescript
import { Layout } from '../components/Layout';

export function Home() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-primary-500 mb-4">
          Study Planner ✨
        </h1>
        <p className="text-gray-600">Welcome! Let's get started.</p>
      </div>
    </Layout>
  );
}
```

Create `src/pages/CreatePlan.tsx`:

```typescript
import { Layout } from '../components/Layout';

export function CreatePlan() {
  return (
    <Layout showBottomNav={false}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Create Study Plan</h1>
      </div>
    </Layout>
  );
}
```

Create `src/pages/StudySession.tsx`:

```typescript
import { Layout } from '../components/Layout';

export function StudySession() {
  return (
    <Layout showBottomNav={false}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Study Session</h1>
      </div>
    </Layout>
  );
}
```

Create `src/pages/Progress.tsx`:

```typescript
import { Layout } from '../components/Layout';

export function Progress() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Progress</h1>
      </div>
    </Layout>
  );
}
```

**Step 4: Setup routing in App.tsx**

Update `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CreatePlan } from './pages/CreatePlan';
import { StudySession } from './pages/StudySession';
import { Progress } from './pages/Progress';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/study/:planId/:dayId" element={<StudySession />} />
        <Route path="/progress" element={<Progress />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 5: Test navigation manually**

```bash
npm run dev
```

Expected:
- Navigate to http://localhost:5173
- See Home page
- Bottom nav works
- Routes navigate correctly

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add basic routing and layout structure"
```

---

## Phase 2: File Upload & Processing

### Task 4: File Upload UI

**Files:**
- Create: `src/components/FileUpload.tsx`
- Create: `src/components/FilePreview.tsx`
- Create: `src/hooks/useFileUpload.ts`

**Step 1: Create FileUpload component**

Create `src/components/FileUpload.tsx`:

```typescript
import { useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string;
}

export function FileUpload({ onFilesSelected, acceptedTypes = '.pdf,.txt,.jpg,.jpeg,.png,.pptx' }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg active:scale-95 transition-transform"
      >
        📁 Upload Files
      </button>
      
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full bg-accent-200 text-gray-800 py-4 px-6 rounded-xl font-semibold text-lg shadow-lg active:scale-95 transition-transform"
      >
        📸 Take Photo
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
```

**Step 2: Create FilePreview component**

Create `src/components/FilePreview.tsx`:

```typescript
interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
}

export function FilePreview({ fileName, fileSize, onRemove }: FilePreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{formatSize(fileSize)}</p>
      </div>
      
      <button
        onClick={onRemove}
        className="ml-4 text-red-500 font-semibold text-sm px-3 py-1 rounded hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
```

**Step 3: Create useFileUpload hook**

Create `src/hooks/useFileUpload.ts`:

```typescript
import { useState } from 'react';

export interface UploadedFileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  error?: string;
}

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = (newFiles: File[]) => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
    }));
    
    setFiles((prev) => [...prev, ...fileInfos]);
    return fileInfos;
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, ...data } : f))
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  return {
    files,
    addFiles,
    removeFile,
    updateFileStatus,
    clearFiles,
  };
}
```

**Step 4: Update CreatePlan page to use FileUpload**

Update `src/pages/CreatePlan.tsx`:

```typescript
import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { useFileUpload } from '../hooks/useFileUpload';

export function CreatePlan() {
  const { files, addFiles, removeFile } = useFileUpload();

  const handleFilesSelected = (newFiles: File[]) => {
    addFiles(newFiles);
  };

  return (
    <Layout showBottomNav={false}>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create Study Plan</h1>
        <p className="text-gray-600 mb-6">Upload your study materials to get started</p>
        
        <FileUpload onFilesSelected={handleFilesSelected} />
        
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-semibold text-gray-700">Uploaded Files ({files.length})</h2>
            {files.map((fileInfo) => (
              <FilePreview
                key={fileInfo.id}
                fileName={fileInfo.file.name}
                fileSize={fileInfo.file.size}
                onRemove={() => removeFile(fileInfo.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

**Step 5: Test file upload UI**

```bash
npm run dev
```

Expected:
- Click "Upload Files" opens file picker
- Click "Take Photo" opens camera (on mobile)
- Selected files appear in list
- Remove button works

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add file upload UI with preview"
```

---

### Task 5: PDF Text Extraction

**Files:**
- Create: `src/lib/textExtraction/pdfExtractor.ts`
- Create: `src/lib/textExtraction/index.ts`

**Step 1: Install PDF.js**

```bash
npm install pdfjs-dist
```

**Step 2: Create PDF extractor**

Create `src/lib/textExtraction/pdfExtractor.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    
    return textParts.join('\n\n');
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}
```

**Step 3: Create text extraction index**

Create `src/lib/textExtraction/index.ts`:

```typescript
import { extractTextFromPDF } from './pdfExtractor';

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }

  // Plain text files
  if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    return file.text();
  }

  // For now, throw error for unsupported types
  // We'll add image OCR and PowerPoint in next tasks
  throw new Error(`Unsupported file type: ${fileType}`);
}

export { extractTextFromPDF } from './pdfExtractor';
```

**Step 4: Write test for PDF extraction**

Create `src/lib/textExtraction/__tests__/pdfExtractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractTextFromFile } from '../index';

describe('Text Extraction', () => {
  it('extracts text from plain text file', async () => {
    const content = 'Hello, this is a test file.';
    const file = new File([content], 'test.txt', { type: 'text/plain' });
    
    const extracted = await extractTextFromFile(file);
    expect(extracted).toBe(content);
  });

  it('throws error for unsupported file type', async () => {
    const file = new File(['data'], 'test.xyz', { type: 'application/unknown' });
    
    await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
  });
});
```

**Step 5: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add PDF text extraction with PDF.js"
```

---

### Task 6: Image OCR with Tesseract

**Files:**
- Create: `src/lib/textExtraction/imageExtractor.ts`
- Modify: `src/lib/textExtraction/index.ts`

**Step 1: Install Tesseract.js**

```bash
npm install tesseract.js
```

**Step 2: Create image extractor**

Create `src/lib/textExtraction/imageExtractor.ts`:

```typescript
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    
    return result.data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from image: ${error}`);
  }
}
```

**Step 3: Update text extraction index**

Update `src/lib/textExtraction/index.ts`:

```typescript
import { extractTextFromPDF } from './pdfExtractor';
import { extractTextFromImage } from './imageExtractor';

export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }

  // Plain text files
  if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    return file.text();
  }

  // Image files
  if (
    fileType.startsWith('image/') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png')
  ) {
    return extractTextFromImage(file, onProgress);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export { extractTextFromPDF } from './pdfExtractor';
export { extractTextFromImage } from './imageExtractor';
```

**Step 4: Update useFileUpload hook to process files**

Update `src/hooks/useFileUpload.ts`:

```typescript
import { useState } from 'react';
import { extractTextFromFile } from '../lib/textExtraction';

export interface UploadedFileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  error?: string;
  progress?: number;
}

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = async (newFiles: File[]) => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
    }));
    
    setFiles((prev) => [...prev, ...fileInfos]);
    
    // Process each file
    for (const fileInfo of fileInfos) {
      await processFile(fileInfo.id);
    }
    
    return fileInfos;
  };

  const processFile = async (id: string) => {
    updateFileStatus(id, 'processing');
    
    const fileInfo = files.find((f) => f.id === id);
    if (!fileInfo) return;

    try {
      const text = await extractTextFromFile(fileInfo.file, (progress) => {
        updateFileProgress(id, progress);
      });
      
      updateFileStatus(id, 'completed', { extractedText: text });
    } catch (error) {
      updateFileStatus(id, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, ...data } : f))
    );
  };

  const updateFileProgress = (id: string, progress: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, progress } : f))
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const getAllExtractedText = (): string => {
    return files
      .filter((f) => f.status === 'completed' && f.extractedText)
      .map((f) => f.extractedText)
      .join('\n\n---\n\n');
  };

  return {
    files,
    addFiles,
    removeFile,
    updateFileStatus,
    clearFiles,
    getAllExtractedText,
  };
}
```

**Step 5: Update FilePreview to show processing status**

Update `src/components/FilePreview.tsx`:

```typescript
interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  onRemove: () => void;
}

export function FilePreview({
  fileName,
  fileSize,
  status,
  progress,
  error,
  onRemove,
}: FilePreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusDisplay = () => {
    if (status === 'processing') {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          <span className="text-xs text-gray-500">
            {progress ? `${progress}%` : 'Processing...'}
          </span>
        </div>
      );
    }
    if (status === 'completed') {
      return <span className="text-xs text-green-600">✓ Ready</span>;
    }
    if (status === 'error') {
      return <span className="text-xs text-red-600">✗ Error</span>;
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <p className="text-xs text-gray-500">{formatSize(fileSize)}</p>
        </div>
        
        <button
          onClick={onRemove}
          className="ml-4 text-red-500 font-semibold text-sm px-3 py-1 rounded hover:bg-red-50"
        >
          Remove
        </button>
      </div>
      
      <div className="mt-2">{getStatusDisplay()}</div>
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
```

**Step 6: Update CreatePlan to pass status**

Update `src/pages/CreatePlan.tsx` to pass status props to FilePreview.

**Step 7: Test OCR processing**

```bash
npm run dev
```

Expected:
- Upload image shows processing spinner
- Progress percentage updates
- Completed files show checkmark
- Errors are displayed

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add image OCR with Tesseract.js and processing status"
```

---

## Phase 3: AI Backend Integration

### Task 7: Setup Serverless Function

**Files:**
- Create: `api/generate-plan.ts`
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Install Gemini SDK**

```bash
npm install @google/generative-ai
```

**Step 2: Create environment file**

Create `.env.example`:

```
GEMINI_API_KEY=your_api_key_here
```

Create `.env.local`:

```
GEMINI_API_KEY=your_actual_api_key
```

Add to `.gitignore`:

```
.env.local
```

**Step 3: Create Vercel function**

Create `api/generate-plan.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, daysAvailable, minutesPerDay } = req.body;

  if (!content || !daysAvailable) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are an educational content analyst. Analyze the following study material 
and create a comprehensive study plan.

Days available: ${daysAvailable}
Minutes per day: ${minutesPerDay || 30}

Material:
${content.substring(0, 10000)} // Limit to avoid token issues

Please provide a JSON response with this structure:
{
  "topics": [
    {
      "id": "topic-1",
      "name": "Topic name",
      "importance": "high|medium|low",
      "keyPoints": ["point 1", "point 2"],
      "estimatedMinutes": 20
    }
  ],
  "schedule": [
    {
      "dayNumber": 1,
      "newTopicIds": ["topic-1"],
      "reviewTopicIds": [],
      "estimatedMinutes": 25
    }
  ],
  "flashcards": [
    {
      "topicId": "topic-1",
      "front": "Question",
      "back": "Answer"
    }
  ],
  "quizQuestions": [
    {
      "topicId": "topic-1",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Important: Respond ONLY with valid JSON, no markdown formatting or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const planData = JSON.parse(jsonMatch[0]);
    
    return res.status(200).json(planData);
  } catch (error) {
    console.error('Error generating plan:', error);
    return res.status(500).json({
      error: 'Failed to generate study plan',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

**Step 4: Create API client in frontend**

Create `src/lib/api.ts`:

```typescript
export interface GeneratePlanRequest {
  content: string;
  daysAvailable: number;
  minutesPerDay?: number;
}

export interface GeneratePlanResponse {
  topics: Array<{
    id: string;
    name: string;
    importance: 'high' | 'medium' | 'low';
    keyPoints: string[];
    estimatedMinutes: number;
  }>;
  schedule: Array<{
    dayNumber: number;
    newTopicIds: string[];
    reviewTopicIds: string[];
    estimatedMinutes: number;
  }>;
  flashcards: Array<{
    topicId: string;
    front: string;
    back: string;
  }>;
  quizQuestions: Array<{
    topicId: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export async function generateStudyPlan(
  request: GeneratePlanRequest
): Promise<GeneratePlanResponse> {
  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || 'Failed to generate study plan');
  }

  return response.json();
}
```

**Step 5: Configure Vercel**

Create `vercel.json`:

```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Gemini AI serverless function for plan generation"
```

---

### Task 8: Study Plan Creation Flow

**Files:**
- Create: `src/pages/CreatePlan.tsx` (complete implementation)
- Create: `src/components/DatePicker.tsx`
- Create: `src/components/LoadingSpinner.tsx`
- Create: `src/hooks/useCreatePlan.ts`

**Step 1: Create DatePicker component**

Create `src/components/DatePicker.tsx`:

```typescript
interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export function DatePicker({ value, onChange, minDate }: DatePickerProps) {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(new Date(e.target.value));
  };

  return (
    <input
      type="date"
      value={formatDate(value)}
      min={minDate ? formatDate(minDate) : undefined}
      onChange={handleChange}
      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-lg"
    />
  );
}
```

**Step 2: Create LoadingSpinner component**

Create `src/components/LoadingSpinner.tsx`:

```typescript
interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  );
}
```

**Step 3: Create useCreatePlan hook**

Create `src/hooks/useCreatePlan.ts`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateStudyPlan } from '../lib/api';
import { db } from '../lib/db';
import type { StudyPlan, StudyDay, Flashcard, QuizQuestion } from '../types';

export function useCreatePlan() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const createPlan = async (
    subject: string,
    testDate: Date,
    extractedText: string,
    minutesPerDay: number
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      testDate.setHours(0, 0, 0, 0);
      
      const daysAvailable = Math.ceil(
        (testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysAvailable < 1) {
        throw new Error('Test date must be in the future');
      }

      // Call AI to generate plan
      const aiResponse = await generateStudyPlan({
        content: extractedText,
        daysAvailable,
        minutesPerDay,
      });

      // Create study plan
      const planId = `plan-${Date.now()}`;
      const studyPlan: StudyPlan = {
        id: planId,
        subject,
        testDate,
        createdDate: new Date(),
        totalDays: daysAvailable,
        suggestedMinutesPerDay: minutesPerDay,
        topics: aiResponse.topics,
      };

      await db.studyPlans.add(studyPlan);

      // Create study days
      const studyDays: StudyDay[] = aiResponse.schedule.map((day, index) => {
        const dayDate = new Date(today);
        dayDate.setDate(dayDate.getDate() + index);
        
        return {
          id: `day-${planId}-${index + 1}`,
          planId,
          dayNumber: day.dayNumber,
          date: dayDate,
          completed: false,
          newTopicIds: day.newTopicIds,
          reviewTopicIds: day.reviewTopicIds,
          flashcardIds: aiResponse.flashcards
            .filter((fc) => day.newTopicIds.includes(fc.topicId))
            .map((fc) => `flashcard-${planId}-${fc.topicId}-${Math.random()}`),
          quizIds: aiResponse.quizQuestions
            .filter((q) => day.newTopicIds.includes(q.topicId))
            .map((q) => `quiz-${planId}-${q.topicId}-${Math.random()}`),
          estimatedMinutes: day.estimatedMinutes,
        };
      });

      await db.studyDays.bulkAdd(studyDays);

      // Create flashcards
      const flashcards: Flashcard[] = aiResponse.flashcards.map((fc, index) => ({
        id: `flashcard-${planId}-${fc.topicId}-${index}`,
        topicId: fc.topicId,
        front: fc.front,
        back: fc.back,
        reviewDates: [],
        masteryLevel: 0,
      }));

      await db.flashcards.bulkAdd(flashcards);

      // Create quiz questions
      const quizQuestions: QuizQuestion[] = aiResponse.quizQuestions.map((q, index) => ({
        id: `quiz-${planId}-${q.topicId}-${index}`,
        topicId: q.topicId,
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctIndex,
        explanation: q.explanation,
      }));

      await db.quizQuestions.bulkAdd(quizQuestions);

      // Navigate to home
      navigate('/');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create study plan');
      setIsGenerating(false);
    }
  };

  return {
    createPlan,
    isGenerating,
    error,
  };
}
```

**Step 4: Complete CreatePlan page implementation**

Update `src/pages/CreatePlan.tsx` with full implementation including file upload, date picker, and plan creation...

[Content continues but truncated for length - would include full implementation]

**Step 5: Test plan creation flow**

```bash
npm run dev
```

Expected:
- Upload files
- Extract text
- Set test date
- Generate plan successfully
- Navigate to home

**Step 6: Commit**

```bash
git add .
git commit -m "feat: implement complete study plan creation flow"
```

---

---

## Phase 4: Home Dashboard & Study Session UI

### Overview

Phase 4 builds the core study experience: a dashboard showing active plans and a multi-step daily study session flow with concepts, flashcards, quizzes, and completion celebration.

**Components to build:**
- Home dashboard with plan cards and daily stats
- Study session manager with multi-step flow
- Concept summary view
- Flashcard deck with swipe interactions
- Quiz screen with instant feedback
- Session completion celebration screen

---

### Task 9: Home Dashboard UI

**Files:**
- Create: `src/components/PlanCard.tsx`
- Create: `src/components/StudyDashboard.tsx`
- Modify: `src/pages/Home.tsx`

**Step 1: Create PlanCard component**

Create `src/components/PlanCard.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import type { StudyPlan } from '../types';

interface PlanCardProps {
  plan: StudyPlan;
  todayCompleted: boolean;
  daysCompleted: number;
}

export function PlanCard({ plan, todayCompleted, daysCompleted }: PlanCardProps) {
  const navigate = useNavigate();
  
  const daysUntilTest = Math.ceil(
    (plan.testDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const progressPercent = (daysCompleted / plan.totalDays) * 100;

  const handleStart = () => {
    // Will navigate to today's study session
    navigate(`/study/${plan.id}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{plan.subject}</h3>
          <p className="text-sm text-gray-500">
            {daysUntilTest} days until test
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-500">
            {daysCompleted}/{plan.totalDays}
          </p>
          <p className="text-xs text-gray-500">days</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary-400 to-primary-600 h-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Day info */}
      <p className="text-sm text-gray-600 mb-4">
        Day {daysCompleted + 1} of {plan.totalDays}
      </p>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={todayCompleted}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
          todayCompleted
            ? 'bg-gray-100 text-gray-500 cursor-default'
            : 'bg-primary-500 text-white active:scale-95'
        }`}
      >
        {todayCompleted ? '✓ Completed Today' : "🎯 Start Today's Study"}
      </button>
    </div>
  );
}
```

**Step 2: Create StudyDashboard stats component**

Create `src/components/StudyDashboard.tsx`:

```typescript
interface StudyDashboardProps {
  xp: number;
  streak: number;
  totalPlans: number;
  activePlans: number;
}

export function StudyDashboard({
  xp,
  streak,
  totalPlans,
  activePlans,
}: StudyDashboardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* XP */}
      <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Total XP</p>
        <p className="text-2xl font-bold text-primary-600">♥ {xp}</p>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p className="text-2xl font-bold text-orange-600">🔥 {streak}</p>
      </div>

      {/* Active Plans */}
      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Active Plans</p>
        <p className="text-2xl font-bold text-blue-600">{activePlans}</p>
      </div>

      {/* Total Completed */}
      <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Completed</p>
        <p className="text-2xl font-bold text-green-600">{totalPlans}</p>
      </div>
    </div>
  );
}
```

**Step 3: Update Home page with dashboard**

Update `src/pages/Home.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StudyDashboard } from '../components/StudyDashboard';
import { PlanCard } from '../components/PlanCard';
import { db, getUserStats } from '../lib/db';
import type { StudyPlan, StudyDay } from '../types';

export function Home() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [stats, setStats] = useState({
    xp: 0,
    streak: 0,
    totalPlans: 0,
    activePlans: 0,
  });
  const [dayProgress, setDayProgress] = useState<Map<string, number>>(new Map());
  const [todayCompleted, setTodayCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load user stats
    const userStats = await getUserStats();
    setStats({
      xp: userStats.totalXP,
      streak: userStats.currentStreak,
      totalPlans: 0, // Will calculate from completed plans
      activePlans: 0,
    });

    // Load all study plans
    const allPlans = await db.studyPlans.toArray();
    setPlans(allPlans);

    // Calculate progress for each plan
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const progressMap = new Map<string, number>();
    const completedTodaySet = new Set<string>();

    for (const plan of allPlans) {
      const days = await db.studyDays.where('planId').equals(plan.id).toArray();
      const completedCount = days.filter((d) => d.completed).length;
      progressMap.set(plan.id, completedCount);

      // Check if today's session is completed
      const todaySession = days.find(
        (d) => d.date.toDateString() === today.toDateString()
      );
      if (todaySession?.completed) {
        completedTodaySet.add(plan.id);
      }
    }

    setDayProgress(progressMap);
    setTodayCompleted(completedTodaySet);

    // Update active plans count
    setStats((prev) => ({
      ...prev,
      activePlans: allPlans.length,
    }));
  };

  if (plans.length === 0) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h1 className="text-3xl font-bold text-primary-500 mb-4">
            Study Planner ✨
          </h1>
          <p className="text-gray-600 mb-8">
            Create your first study plan to get started!
          </p>
          <a
            href="/create-plan"
            className="inline-block bg-primary-500 text-white py-3 px-6 rounded-xl font-semibold active:scale-95 transition-transform"
          >
            + Create New Plan
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <StudyDashboard {...stats} />

        {/* Plans section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active Plans</h2>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              daysCompleted={dayProgress.get(plan.id) || 0}
              todayCompleted={todayCompleted.has(plan.id)}
            />
          ))}
        </div>

        {/* Create new plan button */}
        <a
          href="/create-plan"
          className="block w-full bg-white border-2 border-dashed border-primary-300 text-primary-600 py-3 px-4 rounded-xl font-semibold text-center hover:bg-primary-50 transition-colors"
        >
          + Add New Plan
        </a>
      </div>
    </Layout>
  );
}
```

**Step 4: Create hooks for plan queries**

Create `src/lib/planQueries.ts`:

```typescript
import { db } from './db';
import type { StudyDay } from '../types';

export async function getTodayStudyDay(planId: string): Promise<StudyDay | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = await db.studyDays
    .where('planId')
    .equals(planId)
    .toArray();

  return days.find(
    (d) => d.date.toDateString() === today.toDateString()
  );
}

export async function getStudyDayById(dayId: string): Promise<StudyDay | undefined> {
  return db.studyDays.get(dayId);
}

export async function getPlanWithTopics(planId: string) {
  const plan = await db.studyPlans.get(planId);
  if (!plan) return null;

  const days = await db.studyDays.where('planId').equals(planId).toArray();
  
  return { plan, days };
}

export async function getCardsByTopicIds(topicIds: string[]) {
  const cards = await db.flashcards
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return cards;
}

export async function getQuizzesByTopicIds(topicIds: string[]) {
  const quizzes = await db.quizQuestions
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return quizzes;
}
```

**Step 5: Test home dashboard**

```bash
npm run dev
```

Expected:
- Home page shows stats cards
- Plan cards display correctly
- Progress bars show
- Navigation to create plan works

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add home dashboard with plan cards and stats display"
```

---

### Task 10: Study Session Manager & Multi-Step Flow

**Files:**
- Create: `src/hooks/useStudySession.ts`
- Create: `src/pages/StudySession.tsx` (complete implementation)
- Create: `src/components/StudySessionFlow.tsx`

**Step 1: Create useStudySession hook for state management**

Create `src/hooks/useStudySession.ts`:

```typescript
import { useReducer, useCallback, useEffect } from 'react';
import { db } from '../lib/db';
import {
  getTodayStudyDay,
  getCardsByTopicIds,
  getQuizzesByTopicIds,
} from '../lib/planQueries';
import type { StudyDay, Flashcard, QuizQuestion } from '../types';

export interface SessionState {
  step: 'concepts' | 'flashcards' | 'quiz' | 'completion' | 'loading' | 'error';
  studyDay: StudyDay | null;
  newTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  reviewTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  currentFlashcardIndex: number;
  currentQuizIndex: number;
  quizAnswers: Map<string, number>; // quiz id -> answer index
  xpEarned: number;
  error: string | null;
}

type SessionAction =
  | { type: 'INIT_SUCCESS'; payload: { studyDay: StudyDay; newTopics: any[]; reviewTopics: any[]; flashcards: Flashcard[]; quizzes: QuizQuestion[] } }
  | { type: 'INIT_ERROR'; payload: string }
  | { type: 'ADVANCE_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'NEXT_FLASHCARD' }
  | { type: 'PREV_FLASHCARD' }
  | { type: 'ANSWER_QUIZ'; payload: { quizIndex: number; answerIndex: number } }
  | { type: 'NEXT_QUIZ' }
  | { type: 'PREV_QUIZ' }
  | { type: 'COMPLETE_SESSION'; payload: number };

function getInitialState(): SessionState {
  return {
    step: 'loading',
    studyDay: null,
    newTopics: [],
    reviewTopics: [],
    flashcards: [],
    quizzes: [],
    currentFlashcardIndex: 0,
    currentQuizIndex: 0,
    quizAnswers: new Map(),
    xpEarned: 0,
    error: null,
  };
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT_SUCCESS':
      return {
        ...state,
        step: 'concepts',
        studyDay: action.payload.studyDay,
        newTopics: action.payload.newTopics,
        reviewTopics: action.payload.reviewTopics,
        flashcards: action.payload.flashcards,
        quizzes: action.payload.quizzes,
      };
    
    case 'INIT_ERROR':
      return {
        ...state,
        step: 'error',
        error: action.payload,
      };
    
    case 'ADVANCE_STEP': {
      const steps: SessionState['step'][] = ['concepts', 'flashcards', 'quiz', 'completion'];
      const currentIndex = steps.indexOf(state.step);
      if (currentIndex < steps.length - 1) {
        return { ...state, step: steps[currentIndex + 1] };
      }
      return state;
    }
    
    case 'NEXT_FLASHCARD':
      return {
        ...state,
        currentFlashcardIndex: Math.min(
          state.currentFlashcardIndex + 1,
          state.flashcards.length - 1
        ),
      };
    
    case 'PREV_FLASHCARD':
      return {
        ...state,
        currentFlashcardIndex: Math.max(state.currentFlashcardIndex - 1, 0),
      };
    
    case 'ANSWER_QUIZ':
      const newAnswers = new Map(state.quizAnswers);
      const quizId = state.quizzes[action.payload.quizIndex]?.id;
      if (quizId) {
        newAnswers.set(quizId, action.payload.answerIndex);
      }
      return { ...state, quizAnswers: newAnswers };
    
    case 'NEXT_QUIZ':
      return {
        ...state,
        currentQuizIndex: Math.min(
          state.currentQuizIndex + 1,
          state.quizzes.length - 1
        ),
      };
    
    case 'PREV_QUIZ':
      return {
        ...state,
        currentQuizIndex: Math.max(state.currentQuizIndex - 1, 0),
      };
    
    case 'COMPLETE_SESSION':
      return {
        ...state,
        step: 'completion',
        xpEarned: action.payload,
      };
    
    default:
      return state;
  }
}

export function useStudySession(planId: string) {
  const [state, dispatch] = useReducer(sessionReducer, getInitialState());

  useEffect(() => {
    initializeSession();
  }, [planId]);

  const initializeSession = async () => {
    try {
      // Get today's study day
      const studyDay = await getTodayStudyDay(planId);
      if (!studyDay) {
        throw new Error('No study session for today');
      }

      // Get plan to access topics
      const plan = await db.studyPlans.get(planId);
      if (!plan) {
        throw new Error('Study plan not found');
      }

      // Separate new and review topics
      const topicsMap = new Map(plan.topics.map((t) => [t.id, t]));
      const newTopics = studyDay.newTopicIds.map((id) => topicsMap.get(id)!);
      const reviewTopics = studyDay.reviewTopicIds.map((id) => topicsMap.get(id)!);

      // Get cards and quizzes for all topics for today
      const allTopicIds = [...studyDay.newTopicIds, ...studyDay.reviewTopicIds];
      const flashcards = await getCardsByTopicIds(allTopicIds);
      const quizzes = await getQuizzesByTopicIds(allTopicIds);

      dispatch({
        type: 'INIT_SUCCESS',
        payload: {
          studyDay,
          newTopics,
          reviewTopics,
          flashcards,
          quizzes,
        },
      });
    } catch (error) {
      dispatch({
        type: 'INIT_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load session',
      });
    }
  };

  const advanceStep = useCallback(() => {
    dispatch({ type: 'ADVANCE_STEP' });
  }, []);

  const nextFlashcard = useCallback(() => {
    dispatch({ type: 'NEXT_FLASHCARD' });
  }, []);

  const prevFlashcard = useCallback(() => {
    dispatch({ type: 'PREV_FLASHCARD' });
  }, []);

  const answerQuiz = useCallback((quizIndex: number, answerIndex: number) => {
    dispatch({ type: 'ANSWER_QUIZ', payload: { quizIndex, answerIndex } });
  }, []);

  const nextQuiz = useCallback(() => {
    dispatch({ type: 'NEXT_QUIZ' });
  }, []);

  const prevQuiz = useCallback(() => {
    dispatch({ type: 'PREV_QUIZ' });
  }, []);

  const completeSession = useCallback(async (xp: number) => {
    if (state.studyDay) {
      // Mark day as complete
      await db.studyDays.update(state.studyDay.id, {
        completed: true,
      });

      // Add XP to user stats
      const stats = await db.userStats.get('default');
      if (stats) {
        await db.userStats.update('default', {
          totalXP: stats.totalXP + xp,
        });
      }
    }

    dispatch({ type: 'COMPLETE_SESSION', payload: xp });
  }, [state.studyDay]);

  return {
    ...state,
    advanceStep,
    nextFlashcard,
    prevFlashcard,
    answerQuiz,
    nextQuiz,
    prevQuiz,
    completeSession,
  };
}
```

**Step 2: Create minimal StudySession page**

Update `src/pages/StudySession.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useStudySession } from '../hooks/useStudySession';
import { ConceptSummary } from '../components/study-session/ConceptSummary';
import { FlashcardDeck } from '../components/study-session/FlashcardDeck';
import { QuizScreen } from '../components/study-session/QuizScreen';
import { CompletionScreen } from '../components/study-session/CompletionScreen';

export function StudySession() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const session = useStudySession(planId || '');

  if (!planId) {
    return (
      <Layout showBottomNav={false}>
        <div className="p-6 text-center">
          <p className="text-red-600">Invalid study plan</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-primary-500 text-white py-2 px-4 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  if (session.step === 'loading') {
    return (
      <Layout showBottomNav={false}>
        <LoadingSpinner message="Loading your study session..." />
      </Layout>
    );
  }

  if (session.step === 'error') {
    return (
      <Layout showBottomNav={false}>
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{session.error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-500 text-white py-2 px-4 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="max-w-lg mx-auto">
        {session.step === 'concepts' && (
          <ConceptSummary
            newTopics={session.newTopics}
            reviewTopics={session.reviewTopics}
            onNext={session.advanceStep}
            onBack={() => navigate('/')}
          />
        )}

        {session.step === 'flashcards' && (
          <FlashcardDeck
            cards={session.flashcards}
            currentIndex={session.currentFlashcardIndex}
            onNext={() => {
              if (session.currentFlashcardIndex < session.flashcards.length - 1) {
                session.nextFlashcard();
              } else {
                session.advanceStep();
              }
            }}
            onPrev={session.prevFlashcard}
            onSkip={session.advanceStep}
          />
        )}

        {session.step === 'quiz' && (
          <QuizScreen
            quizzes={session.quizzes}
            currentIndex={session.currentQuizIndex}
            answers={session.quizAnswers}
            onAnswer={session.answerQuiz}
            onNext={() => {
              if (session.currentQuizIndex < session.quizzes.length - 1) {
                session.nextQuiz();
              } else {
                // Calculate XP and complete session
                const correct = Array.from(session.quizAnswers.entries()).filter(
                  ([quizId, answerIndex]) => {
                    const quiz = session.quizzes.find((q) => q.id === quizId);
                    return quiz && quiz.correctAnswerIndex === answerIndex;
                  }
                ).length;

                const quizCount = session.quizzes.length;
                const baseXP = 50;
                const correctXP = (correct / quizCount) * 50;
                const totalXP = Math.round(baseXP + correctXP);

                session.completeSession(totalXP);
              }
            }}
            onPrev={session.prevQuiz}
          />
        )}

        {session.step === 'completion' && (
          <CompletionScreen
            xpEarned={session.xpEarned}
            quizScore={
              session.quizzes.length > 0
                ? (Array.from(session.quizAnswers.values()).filter(
                    (_, idx) =>
                      session.quizzes[idx]?.correctAnswerIndex ===
                      session.quizAnswers.get(session.quizzes[idx]?.id || '')
                  ).length / session.quizzes.length) * 100
                : 0
            }
            onHome={() => navigate('/')}
          />
        )}
      </div>
    </Layout>
  );
}
```

**Step 3: Test study session initialization**

```bash
npm run dev
```

Expected:
- Navigate to study session from plan card
- Loading spinner shows
- Session initializes without errors

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add study session manager with multi-step flow state"
```

---

### Task 11: Study Session Components Part 1 (Concepts & Flashcards)

**Files:**
- Create: `src/components/study-session/ConceptSummary.tsx`
- Create: `src/components/study-session/FlashcardDeck.tsx`

**Step 1: Create ConceptSummary component**

Create `src/components/study-session/ConceptSummary.tsx`:

```typescript
interface Topic {
  id: string;
  name: string;
  keyPoints: string[];
}

interface ConceptSummaryProps {
  newTopics: Topic[];
  reviewTopics: Topic[];
  onNext: () => void;
  onBack: () => void;
}

export function ConceptSummary({
  newTopics,
  reviewTopics,
  onNext,
  onBack,
}: ConceptSummaryProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Today's Concepts</h1>
        <p className="text-gray-600 text-sm">
          Review what you'll be learning today
        </p>
      </div>

      {/* New Topics */}
      {newTopics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-primary-600 mb-4 flex items-center">
            <span className="text-2xl mr-2">🌟</span>
            New Topics ({newTopics.length})
          </h2>
          <div className="space-y-3">
            {newTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border-l-4 border-primary-500"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {topic.name}
                </h3>
                <ul className="space-y-1">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex">
                      <span className="mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Topics */}
      {reviewTopics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Review Topics ({reviewTopics.length})
          </h2>
          <div className="space-y-3">
            {reviewTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {topic.name}
                </h3>
                <ul className="space-y-1">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex">
                      <span className="mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold active:scale-95 transition-transform"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
        >
          Start Flashcards
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create FlashcardDeck component with swipe**

Create `src/components/study-session/FlashcardDeck.tsx`:

```typescript
import { useState } from 'react';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function FlashcardDeck({
  cards,
  currentIndex,
  onNext,
  onPrev,
  onSkip,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const card = cards[currentIndex];

  if (cards.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No flashcards for today</p>
        <button
          onClick={onSkip}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Skip to Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
        <p className="text-gray-600 text-sm">
          {currentIndex + 1} of {cards.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-8 overflow-hidden">
        <div
          className="bg-primary-500 h-full transition-all"
          style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="flex-1 flex items-center justify-center mb-8 cursor-pointer"
      >
        <div
          className={`w-full max-w-sm bg-gradient-to-br ${
            isFlipped
              ? 'from-blue-100 to-blue-50'
              : 'from-primary-100 to-primary-50'
          } rounded-3xl p-8 shadow-lg aspect-square flex flex-col items-center justify-center text-center transition-all transform hover:scale-105`}
        >
          <div className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            {isFlipped ? '📝 Answer' : '❓ Question'}
          </div>
          <p
            className={`${
              isFlipped ? 'text-lg leading-relaxed' : 'text-2xl font-bold'
            } text-gray-900`}
          >
            {isFlipped ? card.back : card.front}
          </p>
          <div className="text-xs text-gray-500 mt-8">Tap to flip</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Swipe indicators */}
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <span>← Unsure</span>
          <span>Sure →</span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            ← Previous
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
          >
            {currentIndex === cards.length - 1 ? 'Done' : 'Next →'}
          </button>
        </div>

        {/* Skip to quiz */}
        <button
          onClick={onSkip}
          className="w-full text-primary-600 py-2 font-semibold text-sm"
        >
          Skip to Quiz
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Test concepts and flashcard components**

```bash
npm run dev
```

Expected:
- Concept summary displays topics correctly
- Flashcard flips on click
- Navigation works
- Progress bar updates

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add concept summary and flashcard deck components"
```

---

### Task 12: Study Session Components Part 2 (Quiz & Completion)

**Files:**
- Create: `src/components/study-session/QuizScreen.tsx`
- Create: `src/components/study-session/CompletionScreen.tsx`

**Step 1: Create QuizScreen component**

Create `src/components/study-session/QuizScreen.tsx`:

```typescript
import type { QuizQuestion } from '../../types';

interface QuizScreenProps {
  quizzes: QuizQuestion[];
  currentIndex: number;
  answers: Map<string, number>;
  onAnswer: (quizIndex: number, answerIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function QuizScreen({
  quizzes,
  currentIndex,
  answers,
  onAnswer,
  onNext,
  onPrev,
}: QuizScreenProps) {
  const quiz = quizzes[currentIndex];
  const selectedAnswer = answers.get(quiz.id);
  const isCorrect = selectedAnswer === quiz.correctAnswerIndex;

  if (quizzes.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No quizzes for today</p>
        <button
          onClick={onNext}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Complete Session
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Quiz</h1>
        <p className="text-gray-600 text-sm">
          {currentIndex + 1} of {quizzes.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-8 overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all"
          style={{
            width: `${((currentIndex + 1) / quizzes.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-lg font-semibold text-gray-900 mb-6">
          {quiz.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {quiz.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === quiz.correctAnswerIndex;

            let buttonClass = 'bg-white border-2 border-gray-200';
            if (selectedAnswer !== undefined) {
              if (isCorrectAnswer) {
                buttonClass = 'bg-green-50 border-2 border-green-500';
              } else if (isSelected && !isCorrect) {
                buttonClass = 'bg-red-50 border-2 border-red-500';
              }
            } else if (isSelected) {
              buttonClass = 'bg-primary-50 border-2 border-primary-500';
            }

            return (
              <button
                key={index}
                onClick={() => onAnswer(currentIndex, index)}
                disabled={selectedAnswer !== undefined}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all ${buttonClass} disabled:opacity-80`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="text-xs text-white font-bold">
                        {index === quiz.correctAnswerIndex ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selectedAnswer !== undefined && (
          <div
            className={`mt-6 p-4 rounded-xl ${
              isCorrect
                ? 'bg-green-50 border-l-4 border-green-500'
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {isCorrect ? '✓ Correct!' : '📚 Explanation'}
            </p>
            <p className="text-sm text-gray-700">{quiz.explanation}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {selectedAnswer !== undefined && (
        <div className="flex gap-3 mt-8 fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
          >
            {currentIndex === quizzes.length - 1 ? 'See Results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create CompletionScreen component**

Create `src/components/study-session/CompletionScreen.tsx`:

```typescript
interface CompletionScreenProps {
  xpEarned: number;
  quizScore: number;
  onHome: () => void;
}

export function CompletionScreen({
  xpEarned,
  quizScore,
}: CompletionScreenProps) {
  const scorePercentage = Math.round(quizScore);

  let message = '';
  let emoji = '';

  if (scorePercentage >= 80) {
    message = "Amazing! You're crushing it! 🎉";
    emoji = '🎉';
  } else if (scorePercentage >= 60) {
    message = 'Good work! You\'re learning and improving! 💪';
    emoji = '💪';
  } else if (scorePercentage >= 40) {
    message = 'Keep going! Every practice helps you learn! 🌟';
    emoji = '🌟';
  } else {
    message =
      "Don't worry! This content will come up again tomorrow. You've got this! 💖";
    emoji = '💖';
  }

  return (
    <div className="p-6 flex flex-col h-screen items-center justify-center text-center">
      <div className="text-6xl mb-4">{emoji}</div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Complete!</h1>

      <p className="text-gray-600 mb-8">{message}</p>

      {/* Score */}
      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-8 mb-8 w-full">
        <p className="text-sm text-gray-600 mb-2">Quiz Score</p>
        <p className="text-4xl font-bold text-blue-600">
          {scorePercentage.toFixed(0)}%
        </p>
      </div>

      {/* XP */}
      <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl p-8 mb-8 w-full">
        <p className="text-sm text-gray-600 mb-2">XP Earned</p>
        <p className="text-4xl font-bold text-primary-600">
          ♥ +{xpEarned}
        </p>
      </div>

      {/* Confetti animation placeholder */}
      <div className="mb-8">
        <p className="text-sm text-gray-500">✨ Excellent work today! ✨</p>
      </div>

      {/* Home button */}
      <button
        onClick={() => window.location.href = '/'}
        className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl font-bold text-lg active:scale-95 transition-transform mt-8"
      >
        Back to Home
      </button>

      <p className="text-sm text-gray-600 mt-4">See you tomorrow! 👋</p>
    </div>
  );
}
```

**Step 3: Test quiz and completion screens**

```bash
npm run dev
```

Expected:
- Quiz displays questions and options
- Correct/incorrect feedback shows
- Completion screen displays XP and score
- Navigation works end-to-end

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add quiz and completion screens for study sessions"
```

---

### Task 13: Integration & Polish

**Files:**
- Modify: `src/components/MinutesInput.tsx` (create if missing)
- Modify: `src/pages/CreatePlan.tsx` (update with minutes selection)
- Add: `src/components/study-session/index.ts` (barrel exports)

**Step 1: Create MinutesInput component**

Create `src/components/MinutesInput.tsx`:

```typescript
interface MinutesInputProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  recommended?: number;
}

export function MinutesInput({
  value,
  onChange,
  recommended,
}: MinutesInputProps) {
  const presets = [15, 30, 45, 60];

  return (
    <div>
      <label className="block text-lg font-semibold text-gray-900 mb-4">
        Daily Study Time
      </label>

      {recommended && (
        <p className="text-sm text-gray-600 mb-4">
          AI recommends: <span className="font-semibold">{recommended} min/day</span>
        </p>
      )}

      <div className="grid grid-cols-4 gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`py-3 px-2 rounded-lg font-semibold transition-all ${
              value === preset
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 active:scale-95'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <input
        type="number"
        min="5"
        max="480"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        placeholder="Or enter custom time"
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary-500 focus:outline-none"
      />
    </div>
  );
}
```

**Step 2: Create study-session barrel exports**

Create `src/components/study-session/index.ts`:

```typescript
export { ConceptSummary } from './ConceptSummary';
export { FlashcardDeck } from './FlashcardDeck';
export { QuizScreen } from './QuizScreen';
export { CompletionScreen } from './CompletionScreen';
```

**Step 3: Update CreatePlan page with full flow**

Update `src/pages/CreatePlan.tsx` to save minutes and files together, ensure all steps connect properly.

**Step 4: Run full type check**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 5: Test end-to-end flow**

```bash
npm run dev
```

Expected:
- Create plan flow works completely
- Study session can be accessed
- All screens render correctly
- Navigation works throughout

**Step 6: Commit full Phase 4**

```bash
git add .
git commit -m "feat: complete Phase 4 home dashboard and study session UI"
```

---

## Phase Status

**Completed Phases:**
- ✅ Phase 1: Project Setup & Foundation
- ✅ Phase 2: Database Schema & Core Types
- ✅ Phase 3: AI Study Plan Generation
- ✅ Phase 4: Home Dashboard & Study Session UI
- ✅ **Phase 5: Flashcard Mastery Tracking & Quiz Persistence** (Feb 24, 2026)
  - [Design Document](./2026-02-24-phase5-flashcard-quiz-persistence-design.md)
  - [Implementation Plan](./2026-02-24-phase5-flashcard-quiz-persistence-implementation.md)
  - Services: MasteryCalculator, ReviewService, QuizGrader
  - UI: Grading buttons, feedback animations, score display
  - 161/161 tests passing ✅
- ✅ **Phase 6: Gamification System** (Feb 28, 2026)
  - [Implementation Plan](./2026-02-25-phase6-gamification-system.md)
  - Services: XPService, StreakService, BadgeService
  - UI: Celebration animations, BadgeUnlock, XPGain components
  - Session completion with XP/streak/badge integration
- ✅ **Phase 7: Progress Dashboard & Analytics** (Feb 28, 2026)
  - [Implementation Plan](./2026-02-28-phase7-progress-dashboard-implementation.md)
  - Services: ProgressService (data aggregation)
  - UI: ProgressOverview, PlanProgressList, TopicMasteryGrid, StudyCalendar, QuizScoreChart, BadgeShowcase
  - Hook: useProgressData (consolidated state, parallel DB queries)
  - 338/338 tests passing ✅
- ✅ **Phase 8: Advanced Spaced Repetition - SM-2 Algorithm** (Mar 1, 2026)
  - [Implementation Plan](./2026-03-01-phase8-sm2-spaced-repetition-implementation.md)
  - **Algorithm**: SM-2 (SuperMemo 2) spaced repetition with Quality ratings (0-3)
  - **Services**: SM2Calculator, ReviewService enhancements, planQueries filtering
  - **Database**: Extended Flashcard schema (easinessFactor, interval, repetitions, nextReviewDate)
  - **UI**: 4-button grading (Again/Hard/Good/Easy), dashboard SM-2 stats, due card filtering
  - **Migration**: Automatic migration of existing flashcards to SM-2 format
  - **Documentation**: Comprehensive user guides (SM2_GUIDE.md, USER_TIPS.md), code JSDoc
  - **Tasks Completed**: 10/10 (Quality enum, algorithm, DB schema, migration, review service, queries, UI integration, dashboard display, testing, documentation)
  - 415/415 tests passing ✅
  - **Key Features**:
    - Personalized review intervals based on user performance
    - Easiness Factor (1.3-2.5) determines interval growth rate
    - Interval progression: 1d → 6d → exponential (up to 90+ days)
    - Mastery level derived from EF for color-coded progress
    - "Due for review" filtering optimizes study sessions
    - Full test coverage of algorithm correctness and edge cases

**Next Phases:**
- Phase 9: Polish & Testing (refinements)
- Phase 10: Deployment (Vercel setup)

