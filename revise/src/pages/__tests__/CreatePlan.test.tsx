import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreatePlan } from '../CreatePlan';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    files: [],
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    getAllExtractedText: vi.fn(() => ''),
  }),
}));

vi.mock('../../hooks/useCreatePlan', () => ({
  useCreatePlan: () => ({
    step: 1,
    extractedText: '',
    testDate: null,
    daysAvailable: 0,
    recommendedMinutesPerDay: null,
    minutesPerDay: null,
    plan: null,
    isGenerating: false,
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
    reset: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe('CreatePlan wizard', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders step 1 (upload) initially', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.getByText(/upload.*study materials/i)).toBeInTheDocument();
  });

  it('does not show Back button on step 1', () => {
    renderWithRouter(<CreatePlan />);
    expect(screen.queryByText(/back/i)).not.toBeInTheDocument();
  });
});
