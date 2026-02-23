import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

type PdfDocumentLoadingTask = { promise: Promise<PDFDocumentProxy> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  version: string;
  getDocument: (src: { data: ArrayBuffer }) => PdfDocumentLoadingTask;
};

const pdfjs = pdfjsLib as unknown as PdfJsLib;

// Configure legacy worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/legacy/build/pdf.worker.min.js`;

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
      const pageText = textContent.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .filter((value) => value.length > 0)
        .join(' ');
      textParts.push(pageText);
    }
    
    return textParts.join(PAGE_SEPARATOR);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}
