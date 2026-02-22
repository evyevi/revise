import { extractTextFromPDF } from './pdfExtractor';

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }

  // Plain text files
  if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    return file.text();
  }

  // For now, throw error for unsupported types
  // We'll add image OCR and PowerPoint in next tasks
  throw new Error(`Unsupported file type: ${fileType}`);
}

export { extractTextFromPDF } from './pdfExtractor';
