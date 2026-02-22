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

## Next Steps

This implementation plan continues with:
- Phase 4: Home Dashboard & Study Session UI
- Phase 5: Flashcards & Quiz Components  
- Phase 6: Gamification System
- Phase 7: Progress Tracking
- Phase 8: Polish & Testing
- Phase 9: Deployment

Each phase follows the same granular task structure with 2-5 minute steps, exact file paths, code examples, test commands, and frequent commits.

Total estimated implementation time: 4-6 weeks for full MVP.
