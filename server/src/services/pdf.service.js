import fs from 'fs';
import pdfParse from 'pdf-parse';

/**
 * Maximum extractable text length allowed for a single resume (500,000 characters).
 * Chosen based on existing sample files (resume_11_near_5mb.pdf has ~350k characters).
 */
export const MAX_EXTRACTED_TEXT_LENGTH = 500000;

/**
 * Maximum page count allowed for a single resume PDF document (50 pages).
 * Chosen based on existing sample files (resume_11_near_5mb.pdf has 41 pages).
 */
export const MAX_PAGE_COUNT = 50;

/**
 * Extracts text and metadata from a PDF file buffer or path.
 * Enforces magic-byte verification, page count caps, text length boundaries,
 * and rejection of empty/scanned PDFs.
 *
 * @param {string|Buffer} source - File path string or Buffer
 * @returns {Promise<{ rawText: string, pageCount: number, charCount: number }>}
 */
export async function extractTextFromPDF(source) {
  try {
    const rawBuffer = typeof source === 'string' ? fs.readFileSync(source) : source;

    if (!rawBuffer || rawBuffer.length === 0) {
      const error = new Error('Empty PDF document provided. File size is 0 bytes.');
      error.statusCode = 400;
      error.code = 'PDF_PARSE_FAILED';
      error.isPublic = true;
      throw error;
    }

    // 1. Enforce PDF Magic Bytes: First 5 bytes must be "%PDF-"
    const magicHeader = rawBuffer.subarray(0, 5).toString('ascii');
    if (magicHeader !== '%PDF-') {
      const error = new Error('Invalid file format: File header does not contain valid PDF magic bytes (%PDF-).');
      error.statusCode = 400;
      error.code = 'PDF_PARSE_FAILED';
      error.isPublic = true;
      throw error;
    }

    // Copy into a clean Uint8Array with byteOffset === 0.
    // Node.js Buffer pool allocations (where byteOffset > 0) cause pdf-parse/pdf.js
    // to miscalculate stream start offsets, resulting in "bad XRef entry" errors.
    const uint8Data = new Uint8Array(rawBuffer.length);
    uint8Data.set(rawBuffer);

    // Parse PDF
    const data = await pdfParse(uint8Data);

    // Strip null characters and normalize whitespace
    let rawText = (data.text || '').replace(/\0/g, '').trim();
    const pageCount = data.numpages || 1;
    const charCount = rawText.length;

    // 2. Reject empty or scanned/image-only PDFs (< 30 characters)
    if (charCount < 30) {
      const error = new Error('No extractable text; scanned PDFs are not supported');
      error.statusCode = 422;
      error.code = 'UNSUPPORTED_PDF_FORMAT';
      error.isPublic = true;
      throw error;
    }

    // 3. Enforce Maximum Page Count (Cap at 50 pages based on sample files)
    if (pageCount > MAX_PAGE_COUNT) {
      const error = new Error(`PDF document exceeds maximum allowed limit of ${MAX_PAGE_COUNT} pages (received ${pageCount} pages).`);
      error.statusCode = 422;
      error.code = 'PAGE_COUNT_EXCEEDED';
      error.isPublic = true;
      throw error;
    }

    // 4. Enforce Maximum Extracted Text Length (Cap at 500,000 characters based on sample files)
    if (charCount > MAX_EXTRACTED_TEXT_LENGTH) {
      const error = new Error(`Extracted resume text exceeds maximum allowed length of ${MAX_EXTRACTED_TEXT_LENGTH} characters.`);
      error.statusCode = 422;
      error.code = 'TEXT_LENGTH_EXCEEDED';
      error.isPublic = true;
      throw error;
    }

    return {
      rawText,
      pageCount,
      charCount
    };
  } catch (err) {
    if (err.isPublic) {
      throw err;
    }
    const error = new Error(`Failed to parse PDF document: ${err.message}`);
    error.statusCode = 400;
    error.code = 'PDF_PARSE_FAILED';
    error.isPublic = true;
    throw error;
  }
}
