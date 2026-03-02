import { extractTextFromPDF } from './pdfExtractor';
import { extractTextFromImage } from './imageExtractor';

/**
 * Extract text from various file types
 * @param file - File to extract text from (PDF, TXT, JPG, PNG)
 * @param onProgress - Optional callback for OCR progress (0-100)
 * @returns Extracted text content
 * @throws Error if file type is unsupported or extraction fails
 */
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
    try {
      return await file.text();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read text file: ${errorMessage}`);
    }
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
