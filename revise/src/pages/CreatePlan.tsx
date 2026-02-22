import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { DatePicker } from '../components/DatePicker';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MinutesInput } from '../components/MinutesInput';
import { useFileUpload } from '../hooks/useFileUpload';
import { useCreatePlan } from '../hooks/useCreatePlan';

export function CreatePlan() {
  const navigate = useNavigate();
  const { files, addFiles, removeFile, getAllExtractedText } = useFileUpload();
  const {
    step,
    testDate,
    daysAvailable,
    recommendedMinutesPerDay,
    minutesPerDay,
    plan,
    error,
    isGenerating,
    canProceed,
    setExtractedText,
    setTestDate,
    setMinutesPerDay,
    nextStep,
    prevStep,
    generatePlan,
    savePlan,
    isSaving,
  } = useCreatePlan();

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

  const completedFilesCount = files.filter((f) => f.status === 'completed').length;
  const hasError = files.some((f) => f.status === 'error');
  const isProcessing = files.some((f) => f.status === 'pending' || f.status === 'processing');

  const handleNext = useCallback(() => {
    if (step === 1) {
      // Before advancing from upload, capture extracted text
      const text = getAllExtractedText();
      setExtractedText(text);
    }
    nextStep();
  }, [step, getAllExtractedText, setExtractedText, nextStep]);

  return (
    <Layout showBottomNav={false}>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create Study Plan</h1>

        {/* Step 1: Upload */}
        {step === 1 && (
          <>
            <p className="text-gray-600 mb-6">Upload your study materials to get started</p>
            
            <FileUpload onFilesSelected={handleFilesSelected} />
            
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-gray-700">
                    Uploaded Files ({completedFilesCount}/{files.length})
                  </h2>
                  {hasError && (
                    <p className="text-xs text-red-600">Some files failed</p>
                  )}
                </div>
                {files.map((fileInfo) => (
                  <FilePreview
                    key={fileInfo.id}
                    fileName={fileInfo.file.name}
                    fileSize={fileInfo.file.size}
                    status={fileInfo.status}
                    progress={fileInfo.progress}
                    error={fileInfo.error}
                    onRemove={() => removeFile(fileInfo.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Test Date */}
        {step === 2 && (
          <>
            <p className="text-gray-600 mb-6">When is your test?</p>
            
            <DatePicker
              value={testDate}
              onChange={setTestDate}
              label="Test Date"
              minDate={new Date()}
            />
            
            {testDate && daysAvailable > 0 && (
              <p className="mt-4 text-sm text-gray-600">
                You have <span className="font-semibold">{daysAvailable} days</span> to study
              </p>
            )}
          </>
        )}

        {/* Step 3: Generate */}
        {step === 3 && (
          <>
            <p className="text-gray-600 mb-6">Ready to generate your study plan</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Test Date:</span>
                <span className="font-semibold">
                  {testDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Available:</span>
                <span className="font-semibold">{daysAvailable} days</span>
              </div>
            </div>

            {error && !plan && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {!plan && (
              <>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={generatePlan}
                  className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isGenerating ? 'Generating...' : 'Generate Plan'}
                </button>

                {isGenerating && (
                  <div className="mt-4 flex justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                )}
              </>
            )}

            {plan && !isGenerating && (
              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600"
              >
                Continue to Review
              </button>
            )}
          </>
        )}

        {/* Step 4: Review & Adjust */}
        {step === 4 && plan && (
          <>
            <p className="text-gray-600 mb-6">Your Study Plan</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Topics:</span>
                <span className="font-semibold">{plan.topics.length} topics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Study Days:</span>
                <span className="font-semibold">{plan.schedule.length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Flashcards:</span>
                <span className="font-semibold">{plan.flashcards.length} cards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quiz Questions:</span>
                <span className="font-semibold">{plan.quizQuestions.length} questions</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Study Time
              </label>
              <MinutesInput
                value={minutesPerDay ?? recommendedMinutesPerDay ?? 30}
                onChange={setMinutesPerDay}
                label=""
              />
              <p className="mt-1 text-xs text-gray-500">
                AI recommended: {recommendedMinutesPerDay} minutes/day
              </p>
            </div>

            {minutesPerDay !== null && minutesPerDay !== recommendedMinutesPerDay && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={generatePlan}
                className="w-full mb-3 border-2 border-primary-500 text-primary-600 py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate Plan'}
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600"
            >
              Continue
            </button>
          </>
        )}

        {/* Step 5: Save */}
        {step === 5 && plan && (
          <>
            <p className="text-gray-600 mb-6">Review your plan details</p>
            
            {error && (
              <div className="text-red-600 mb-4">
                {error}
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Topics:</span>
                <span className="font-semibold">{plan.topics.length} topics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Test Date:</span>
                <span className="font-semibold">
                  {testDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Study Time:</span>
                <span className="font-semibold">{minutesPerDay ?? recommendedMinutesPerDay} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Days:</span>
                <span className="font-semibold">{plan.schedule.length} days</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await savePlan(files);
                  navigate('/');
                } catch {
                  // Error already in hook state, will display
                }
              }}
              disabled={isSaving}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Plan'
              )}
            </button>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold active:scale-95 transition-all hover:bg-gray-50"
            >
              Back
            </button>
          )}
          
          {step <= 2 && (
            <button
              type="button"
              disabled={!canProceed || (step === 1 && isProcessing)}
              onClick={handleNext}
              className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-all hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {step === 1 && isProcessing ? 'Processing...' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
