import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import Tesseract from 'tesseract.js';

/** FileReader-based fallback for file.arrayBuffer() — Safari < 14.1 lacks it */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

type PdfDocumentLoadingTask = { promise: Promise<PDFDocumentProxy> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  version: string;
  getDocument: (src: { data: ArrayBuffer }) => PdfDocumentLoadingTask;
};
type PdfPage = {
  getTextContent: () => Promise<{ items: unknown[] }>;
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

const pdfjs = pdfjsLib as unknown as PdfJsLib;

// Use bundled worker to avoid CDN import issues in dev/prod
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PAGE_SEPARATOR = '\n\n'; // Double newline separates pages for readability

const MIN_MEANINGFUL_TEXT_LENGTH = 50;
const OCR_RENDER_SCALE = 1.5; // Higher = better OCR quality, slower

/** Render each PDF page to canvas and OCR it — used for image-based PDFs */
async function extractTextFromPDFViaOCR(pdf: PDFDocumentProxy, language: string): Promise<string> {
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = (await pdf.getPage(i)) as unknown as PdfPage;
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');

    const result = await Tesseract.recognize(dataUrl, language);
    const pageText = result.data.text.trim();
    if (pageText.length > 0) {
      textParts.push(pageText);
    }
  }

  return textParts.join(PAGE_SEPARATOR);
}

export async function extractTextFromPDF(file: File, language: string = 'eng'): Promise<string> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages');
    }

    const textParts: string[] = [];
    
    // PDF.js uses 1-based page indexing
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = (await pdf.getPage(i)) as unknown as PdfPage;
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
    
    const directText = textParts.join(PAGE_SEPARATOR);

    // If the PDF has little/no selectable text, it's likely image-based — try OCR
    if (directText.trim().length < MIN_MEANINGFUL_TEXT_LENGTH) {
      const ocrText = await extractTextFromPDFViaOCR(pdf, language);
      if (ocrText.trim().length >= MIN_MEANINGFUL_TEXT_LENGTH) {
        return ocrText;
      }
      throw new Error(
        'Could not extract text from this PDF. It may be a scanned document with unclear images. ' +
        'Try taking a photo of the document instead using the "Take Photo" button.'
      );
    }

    return directText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}
