import Tesseract from 'tesseract.js';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

interface TesseractLogger {
  status: string;
  progress: number;
}

/**
 * Extract text from image using OCR with file size validation
 * @param file - Image file (JPG, PNG)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Extracted text from image
 * @throws Error if file is too large or OCR fails
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image too large (${(file.size / (1024 * 1024)).toFixed(1)}MB > 10MB). Please use a smaller image.`
    );
  }

  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m: TesseractLogger) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    
    return result.data.text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from image: ${errorMessage}`);
  }
}
