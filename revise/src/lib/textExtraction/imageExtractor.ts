import Tesseract from 'tesseract.js';

/**
 * Extract text from image using OCR
 * @param file - Image file (JPG, PNG)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Extracted text from image
 */
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from image: ${errorMessage}`);
  }
}
