import { useCallback } from 'react';
import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { DatePicker } from '../components/DatePicker';
import { useFileUpload } from '../hooks/useFileUpload';
import { useCreatePlan } from '../hooks/useCreatePlan';

export function CreatePlan() {
  const { files, addFiles, removeFile, getAllExtractedText } = useFileUpload();
  const {
    step,
    testDate,
    daysAvailable,
    canProceed,
    setExtractedText,
    setTestDate,
    nextStep,
    prevStep,
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
