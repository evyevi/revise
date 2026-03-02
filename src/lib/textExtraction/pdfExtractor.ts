import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

type PdfDocumentLoadingTask = { promise: Promise<PDFDocumentProxy> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  version: string;
  getDocument: (src: { data: ArrayBuffer }) => PdfDocumentLoadingTask;
};

const pdfjs = pdfjsLib as unknown as PdfJsLib;

// Use bundled worker to avoid CDN import issues in dev/prod
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PAGE_SEPARATOR = '\n\n'; // Double newline separates pages for readability

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    // PDF.js uses 1-based page indexing
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text from items - each item can be text or other content
      const pageText = textContent.items
        .map((item) => {
          // Check if item has 'str' property (text content)
          if (item && typeof item === 'object' && 'str' in item) {
            const str = (item as { str: string }).str;
            return typeof str === 'string' ? str : '';
          }
          return '';
        })
        .join('');
      
      // Only add non-empty pages
      if (pageText.trim().length > 0) {
        textParts.push(pageText);
      }
    }
    
    return textParts.join(PAGE_SEPARATOR);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}
