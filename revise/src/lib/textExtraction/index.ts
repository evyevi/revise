import { extractTextFromPDF } from './pdfExtractor';

/**
 * Extract text from uploaded file
 * @param file - File to extract text from
 * @returns Extracted text content
 * @throws Error if file type is unsupported or extraction fails
 * 
 * Supported formats:
 * - PDF files (.pdf)
 * - Plain text files (.txt, text/plain)
 * 
 * Browser Requirements:
 * - File.text() requires modern browsers (ES2020+)
 * - PDF.js worker loaded from CDN
 */
export async function extractTextFromFile(file: File): Promise<string> {
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

  // For now, throw error for unsupported types
  // We'll add image OCR and PowerPoint in next tasks
  throw new Error(`Unsupported file type: ${fileType}`);
}

export { extractTextFromPDF } from './pdfExtractor';
