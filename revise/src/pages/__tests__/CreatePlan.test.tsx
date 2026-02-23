import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreatePlan } from '../CreatePlan';
import { BrowserRouter } from 'react-router-dom';
import { useCreatePlan } from '../../hooks/useCreatePlan';

// Mock the hooks
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    files: [],
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    getAllExtractedText: vi.fn(() => ''),
  }),
}));

const mockUseCreatePlanReturn = {
  step: 1,
  extractedText: '',
  testDate: null,
  daysAvailable: 0,
  recommendedMinutesPerDay: null,
  minutesPerDay: null,
  plan: null,
  isGenerating: false,
  isSaving: false,
  error: null,
  canProceed: false,
  isStepValid: vi.fn(),
  setExtractedText: vi.fn(),
  setTestDate: vi.fn(),
  setMinutesPerDay: vi.fn(),
  setRecommendedMinutesPerDay: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  goToStep: vi.fn(),
  generatePlan: vi.fn(),
  regeneratePlan: vi.fn(),
  savePlan: vi.fn(),
  reset: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../../hooks/useCreatePlan', () => ({
  useCreatePlan: vi.fn(() => mockUseCreatePlanReturn),
}));

describe('CreatePlan wizard', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 (upload) initially', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/upload.*study materials/i)).toBeInTheDocument();
  });

  it('does not show Back button on step 1', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.queryByText(/back/i)).not.toBeInTheDocument();
  });

  it('renders step 3 (generate) with plan button', () => {
    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 3,
      extractedText: 'content',
      testDate: new Date('2026-02-24'),
      daysAvailable: 2,
      canProceed: true,
    });

    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/ready to generate/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument();
  });

  it('renders step 3 with Continue to Review button when plan exists', () => {
    const mockPlan = {
      topics: [{ id: '1', name: 'Math', importance: 'high' as const, keyPoints: [], estimatedMinutes: 60 }],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 3,
      plan: mockPlan,
      testDate: new Date('2026-02-24'),
      daysAvailable: 2,
      isGenerating: false,
      canProceed: true,
    });

    renderWithRouter(<CreatePlan />);
    expect(screen.getByRole('button', { name: /continue to review/i })).toBeInTheDocument();
  });

  it('renders step 4 (review) with plan details and minutes input', () => {
    const mockPlan = {
      topics: [{ id: '1', name: 'Math', importance: 'high' as const, keyPoints: [], estimatedMinutes: 60 }],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };

    const mockUseCreatePlan = vi.mocked(useCreatePlan);
    mockUseCreatePlan.mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 4,
      plan: mockPlan,
      recommendedMinutesPerDay: 30,
      canProceed: true,
    });

    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/your study plan/i)).toBeInTheDocument();
    expect(screen.getByText(/1 topics/i)).toBeInTheDocument();
  });

  it('renders step 5 (save) with confirmation', () => {
    const mockPlan = {
      topics: [{ id: '1', name: 'Math', importance: 'high' as const, keyPoints: [], estimatedMinutes: 60 }],
      schedule: [{ dayNumber: 1, newTopicIds: ['1'], reviewTopicIds: [], estimatedMinutes: 30 }],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };

    const mockUseCreatePlan = vi.mocked(useCreatePlan);
    mockUseCreatePlan.mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 5,
      plan: mockPlan,
      testDate: new Date('2026-02-24'),
      daysAvailable: 2,
      minutesPerDay: 30,
      canProceed: true,
    });

    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/review your plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save plan/i })).toBeInTheDocument();
  });
});
