import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useCreatePlan, 
  getInitialWizardState,
  transformToStudyPlan,
  transformToStudyDays,
  transformToFlashcards,
  transformToQuizQuestions,
  transformToUploadedFiles,
} from '../useCreatePlan';
import { generateStudyPlan } from '../../lib/api';
import type { PlanResponse } from '../../lib/api';
import { db } from '../../lib/db';

vi.mock('../../lib/api', () => ({
  generateStudyPlan: vi.fn(),
}));

vi.mock('../../lib/db', () => ({
  db: {
    transaction: vi.fn(),
    studyPlans: { add: vi.fn() },
    studyDays: { bulkAdd: vi.fn() },
    flashcards: { bulkAdd: vi.fn() },
    quizQuestions: { bulkAdd: vi.fn() },
    uploadedFiles: { bulkAdd: vi.fn() },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-23T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCreatePlan', () => {
  it('initializes to step 1 with empty values', () => {
    const state = getInitialWizardState();
    expect(state.step).toBe(1);
    expect(state.testDate).toBeNull();
    expect(state.minutesPerDay).toBeNull();
    expect(state.recommendedMinutesPerDay).toBeNull();
    expect(state.plan).toBeNull();
  });

  it('exposes derived daysAvailable when testDate is set', () => {
    const { result } = renderHook(() => useCreatePlan());
    const testDate = new Date('2026-02-25T00:00:00Z');

    act(() => {
      result.current.setTestDate(testDate);
    });

    expect(result.current.daysAvailable).toBe(2);
  });

  it('advances steps only when current step is valid', () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.nextStep();
    });

    // No files/extracted text yet, should not advance
    expect(result.current.step).toBe(1);

    act(() => {
      result.current.setExtractedText('Some content');
      result.current.nextStep();
    });

    expect(result.current.step).toBe(2);
  });

  it('calls generateStudyPlan without minutes on first generate', async () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.setExtractedText('content');
      result.current.setTestDate(new Date('2026-02-25T00:00:00Z'));
    });

    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });

    await act(async () => {
      await result.current.generatePlan();
    });

    expect(generateStudyPlan).toHaveBeenCalledWith(
      { content: 'content', daysAvailable: 2 },
      expect.any(Function)
    );
    expect(result.current.recommendedMinutesPerDay).toBe(30);
  });

  it('sends minutesPerDay when user sets it', async () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.setExtractedText('content');
      result.current.setTestDate(new Date('2026-02-25T00:00:00Z'));
      result.current.setMinutesPerDay(45);
    });

    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });

    await act(async () => {
      await result.current.generatePlan();
    });

    expect(generateStudyPlan).toHaveBeenCalledWith(
      { content: 'content', daysAvailable: 2, minutesPerDay: 45 },
      expect.any(Function)
    );
  });

  it('isSaving state starts as false', () => {
    const { result } = renderHook(() => useCreatePlan());
    expect(result.current.isSaving).toBe(false);
  });

  test('transformToStudyPlan creates correct StudyPlan structure', () => {
    const mockPlan: PlanResponse = {
      topics: [
        { id: 't1', name: 'Biology Basics', importance: 'high' as const, keyPoints: ['Cell structure'], estimatedMinutes: 30 },
        { id: 't2', name: 'Chemistry', importance: 'medium' as const, keyPoints: ['Atoms'], estimatedMinutes: 20 },
      ],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 45,
    };
    
    const testDate = new Date('2026-03-01');
    const createdDate = new Date('2026-02-22');
    const daysAvailable = 7;
    const minutesPerDay = 45;
    
    // This function doesn't exist yet - will fail
    const result = transformToStudyPlan(mockPlan, testDate, createdDate, daysAvailable, minutesPerDay);
    
    expect(result).toMatchObject({
      subject: 'Biology Basics Study Plan',
      testDate,
      createdDate,
      totalDays: 7,
      suggestedMinutesPerDay: 45,
      topics: [
        { id: 't1', name: 'Biology Basics', importance: 'high', keyPoints: ['Cell structure'] },
        { id: 't2', name: 'Chemistry', importance: 'medium', keyPoints: ['Atoms'] },
      ],
    });
    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe('string');
  });

  test('transformToStudyPlan handles empty topics array', () => {
    const mockPlan: PlanResponse = {
      topics: [], // Empty array
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };
    
    const testDate = new Date('2026-03-01');
    const createdDate = new Date('2026-02-22');
    const daysAvailable = 7;
    const minutesPerDay = 30;
    
    const result = transformToStudyPlan(mockPlan, testDate, createdDate, daysAvailable, minutesPerDay);
    
    expect(result.subject).toBe('Study Plan'); // Fallback name
    expect(result.topics).toEqual([]);
    expect(result.id).toBeTruthy();
  });

  test('transformToStudyDays creates correct StudyDay entities', () => {
    const mockSchedule = [
      { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
      { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 40 },
    ];
    
    const planId = 'plan-123';
    const createdDate = new Date('2026-02-22T00:00:00Z');
    
    const result = transformToStudyDays(mockSchedule, planId, createdDate);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      planId: 'plan-123',
      dayNumber: 1,
      completed: false,
      newTopicIds: ['t1'],
      reviewTopicIds: [],
      flashcardIds: [],
      quizIds: [],
      estimatedMinutes: 30,
    });
    expect(result[0].id).toBeTruthy();
    expect(result[0].date.getTime()).toBe(createdDate.getTime());
    
    // Day 2 should be createdDate + 1 day
    const expectedDay2 = new Date(createdDate.getTime() + 86400000);
    expect(result[1].date.getTime()).toBe(expectedDay2.getTime());
  });

  test('transformToFlashcards creates correct Flashcard entities', () => {
    const mockFlashcards = [
      { topicId: 't1', front: 'What is a cell?', back: 'Basic unit of life' },
      { topicId: 't2', front: 'What is an atom?', back: 'Smallest unit of matter' },
    ];
    
    const result = transformToFlashcards(mockFlashcards);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      topicId: 't1',
      front: 'What is a cell?',
      back: 'Basic unit of life',
      reviewDates: [],
      masteryLevel: 0,
    });
    expect(result[0].id).toBeTruthy();
    expect(result[0].firstShownDate).toBeUndefined();
    expect(result[0].needsPractice).toBe(false);
  });

  test('transformToQuizQuestions creates correct QuizQuestion entities', () => {
    const mockQuestions = [
      {
        topicId: 't1',
        question: 'What is photosynthesis?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
        explanation: 'Because...',
      },
    ];
    
    const result = transformToQuizQuestions(mockQuestions);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      topicId: 't1',
      question: 'What is photosynthesis?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 2,  // Note: field name mapping
      explanation: 'Because...',
    });
    expect(result[0].id).toBeTruthy();
  });

  test('transformToUploadedFiles creates correct UploadedFile entities', () => {
    const mockFiles = [
      new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    ];
    const planId = 'plan-123';
    const extractedText = 'Extracted text from all files';
    
    const result = transformToUploadedFiles(mockFiles, planId, extractedText);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      planId: 'plan-123',
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      extractedText: 'Extracted text from all files',
    });
    expect(result[0].id).toBeTruthy();
    expect(result[0].uploadedAt).toBeInstanceOf(Date);
    expect(result[0].fileBlob).toBe(mockFiles[0]);
    expect(result[0].fileSize).toBeGreaterThan(0);
  });

  test('savePlan throws error if testDate is null', async () => {
    const { result } = renderHook(() => useCreatePlan());
    
    // Setup: set plan and text
    act(() => {
      result.current.setExtractedText('Some content');
      result.current.setTestDate(new Date('2026-03-01'));
    });
    
    // Generate a plan
    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [{ id: 't1', name: 'Test', importance: 'high', keyPoints: [], estimatedMinutes: 30 }],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });
    
    await act(async () => {
      await result.current.generatePlan();
    });
    
    // Now clear the testDate
    act(() => {
      result.current.setTestDate(null);
    });
    
    // savePlan should throw because testDate is null
    await expect(result.current.savePlan([])).rejects.toThrow('Test date is required');
  });

  test('savePlan successfully saves all entities to database', async () => {
    // Setup mocks
    const mockTransaction = vi.fn().mockImplementation(async (mode, tables, callback) => {
      await callback();
    });
    (db.transaction as any) = mockTransaction; // eslint-disable-line @typescript-eslint/no-explicit-any
    (db.studyPlans.add as any).mockResolvedValue('plan-id'); // eslint-disable-line @typescript-eslint/no-explicit-any
    (db.studyDays.bulkAdd as any).mockResolvedValue(undefined); // eslint-disable-line @typescript-eslint/no-explicit-any
    (db.flashcards.bulkAdd as any).mockResolvedValue(undefined); // eslint-disable-line @typescript-eslint/no-explicit-any
    (db.quizQuestions.bulkAdd as any).mockResolvedValue(undefined); // eslint-disable-line @typescript-eslint/no-explicit-any
    (db.uploadedFiles.bulkAdd as any).mockResolvedValue(undefined); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useCreatePlan());
    
    // Setup wizard state
    act(() => {
      result.current.setExtractedText('Content');
      result.current.setTestDate(new Date('2026-03-01'));
      result.current.setMinutesPerDay(45);
    });
    
    // Mock plan in state by generating one
    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [{ id: 't1', name: 'Biology', importance: 'high', keyPoints: [], estimatedMinutes: 30 }],
      schedule: [{ dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 }],
      flashcards: [{ topicId: 't1', front: 'Q', back: 'A' }],
      quizQuestions: [{ topicId: 't1', question: 'Q?', options: ['A'], correctIndex: 0, explanation: 'E' }],
      recommendedMinutesPerDay: 45,
    });
    
    await act(async () => {
      await result.current.generatePlan();
    });
    
    const mockFiles = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
    
    let planId: string = '';
    await act(async () => {
      planId = await result.current.savePlan(mockFiles);
    });
    
    expect(planId).toBeTruthy();
    expect(mockTransaction).toHaveBeenCalled();
    expect(db.studyPlans.add).toHaveBeenCalled();
    expect(db.studyDays.bulkAdd).toHaveBeenCalled();
    expect(db.flashcards.bulkAdd).toHaveBeenCalled();
    expect(db.quizQuestions.bulkAdd).toHaveBeenCalled();
    expect(db.uploadedFiles.bulkAdd).toHaveBeenCalled();
  });

  test('savePlan sets error state when database save fails', async () => {
    // Setup mock to fail
    const mockTransaction = vi.fn().mockRejectedValue(new Error('Database error'));
    (db.transaction as any) = mockTransaction; // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useCreatePlan());
    
    // Setup wizard state
    act(() => {
      result.current.setExtractedText('Content');
      result.current.setTestDate(new Date('2026-03-01'));
    });
    
    // Generate plan
    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [{ id: 't1', name: 'Test', importance: 'high', keyPoints: [], estimatedMinutes: 30 }],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });
    
    await act(async () => {
      await result.current.generatePlan();
    });
    
    await act(async () => {
      await expect(result.current.savePlan([])).rejects.toThrow('Database error');
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.isSaving).toBe(false);
  });
});
