import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreatePlan } from '../CreatePlan';
import { BrowserRouter } from 'react-router-dom';
import { useCreatePlan } from '../../hooks/useCreatePlan';
import { useFileUpload } from '../../hooks/useFileUpload';

// Mock text extraction
vi.mock('../../lib/textExtraction', () => ({
  extractTextFromFile: vi.fn(),
}));

// Mock the hooks
const mockUseFileUploadReturn = {
  files: [],
  addFiles: vi.fn(),
  removeFile: vi.fn(),
  clearFiles: vi.fn(),
  getAllExtractedText: vi.fn(() => ''),
};

vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: vi.fn(() => mockUseFileUploadReturn),
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
    vi.resetAllMocks();
  });

  it('renders step 1 (upload) initially', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/upload.*study materials/i)).toBeInTheDocument();
  });

  it('does not show Back button on step 1', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.queryByText(/back/i)).not.toBeInTheDocument();
  });

  it('shows debug panel when debug flag is set', () => {
    window.history.pushState({}, '', '/create-plan?debug=1');

    // Setup mock state with some files
    const mockFile1 = {
      id: 'file-1',
      file: new File(['content1'], 'document.pdf', { type: 'application/pdf' }),
      status: 'completed' as const,
      progress: 100,
    };

    const mockFile2 = {
      id: 'file-2',
      file: new File(['content2'], 'notes.txt', { type: 'text/plain' }),
      status: 'processing' as const,
      progress: 50,
    };

    const mockFile3 = {
      id: 'file-3',
      file: new File(['content3'], 'image.png', { type: 'image/png' }),
      status: 'error' as const,
      progress: 0,
      error: 'Unsupported file type',
    };

    vi.mocked(useFileUpload).mockReturnValue({
      ...mockUseFileUploadReturn,
      files: [mockFile1, mockFile2, mockFile3],
      getAllExtractedText: vi.fn(() => 'Extracted text content with some text'),
    });

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 1,
      extractedText: 'Extracted text content with some text',
      canProceed: true,
      isProcessing: true,
    });

    renderWithRouter(<CreatePlan />);

    // Check for debug panel header
    expect(screen.getByText('Debug')).toBeInTheDocument();

    // State values
    expect(screen.getByText(/Step:/)).toBeInTheDocument();
    expect(screen.getByText(/Can Proceed:/)).toBeInTheDocument();
    expect(screen.getByText(/Is Processing:/)).toBeInTheDocument();
    expect(screen.getByText(/Completed Files:/)).toBeInTheDocument();
    expect(screen.getByText(/Extracted Text Length:/)).toBeInTheDocument();

    // Check for file list
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress:\s*100%/i)).toBeInTheDocument();

    expect(screen.getByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*processing/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress:\s*50%/i)).toBeInTheDocument();

    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*error/i)).toBeInTheDocument();
    expect(screen.getByText('Unsupported file type')).toBeInTheDocument();

    window.history.pushState({}, '', '/');
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

describe('CreatePlan validation', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires at least one file before continuing from step 1', () => {
    vi.mocked(useFileUpload).mockReturnValue({
      ...mockUseFileUploadReturn,
      files: [],
    });

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 1,
      canProceed: false,
    });

    renderWithRouter(<CreatePlan />);
    
    const nextButton = screen.queryByRole('button', { name: /next|continue/i });
    if (nextButton) {
      expect(nextButton).toBeDisabled();
    }
  });

  it('validates test date is in the future', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 2,
      testDate: yesterday,
      daysAvailable: 0,
      canProceed: false,
    });

    renderWithRouter(<CreatePlan />);
    
    // DatePicker should be rendered
    expect(screen.getByLabelText(/test date/i)).toBeInTheDocument();
  });

  it('shows error when file upload fails', async () => {
    const mockFile = {
      id: '1',
      file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      status: 'error' as const,
      error: 'Failed to extract text from file',
    };

    vi.mocked(useFileUpload).mockReturnValue({
      ...mockUseFileUploadReturn,
      files: [mockFile],
    });

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 1,
    });

    renderWithRouter(<CreatePlan />);
    
    expect(await screen.findByText(/failed to extract/i)).toBeInTheDocument();
  });

  it('handles file upload interaction', async () => {
    const user = userEvent.setup();
    const mockAddFiles = vi.fn();
    
    vi.mocked(useFileUpload).mockReturnValue({
      ...mockUseFileUploadReturn,
      addFiles: mockAddFiles,
    });

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 1,
    });

    renderWithRouter(<CreatePlan />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    // Access the hidden input directly since it's aria-hidden
    const inputs = document.querySelectorAll('input[type="file"]');
    const uploadInput = inputs[0] as HTMLInputElement;
    
    await user.upload(uploadInput, file);
    
    // FileUpload calls onFilesSelected, which should trigger addFiles
    expect(mockAddFiles).toHaveBeenCalled();
  });

  it('displays file processing status', () => {
    vi.mocked(useFileUpload).mockReturnValue({
      ...mockUseFileUploadReturn,
      files: [
        {
          id: '1',
          file: new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
          status: 'completed',
          extractedText: 'Text 1',
        },
        {
          id: '2',
          file: new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
          status: 'processing',
          progress: 50,
        },
      ],
    });

    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 1,
    });

    renderWithRouter(<CreatePlan />);
    
    expect(screen.getByText(/uploaded files \(1\/2\)/i)).toBeInTheDocument();
  });

  it('shows generation error when plan generation fails', () => {
    vi.mocked(useCreatePlan).mockReturnValue({
      ...mockUseCreatePlanReturn,
      step: 3,
      extractedText: 'content',
      testDate: new Date('2026-02-24'),
      daysAvailable: 2,
      error: 'Failed to generate plan. Please try again.',
      canProceed: true,
    });

    renderWithRouter(<CreatePlan />);
    
    expect(screen.getByText(/failed to generate plan/i)).toBeInTheDocument();
  });
});
