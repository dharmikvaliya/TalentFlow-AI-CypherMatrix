import fs from 'fs';
import pdfParse from 'pdf-parse';

/**
 * Extracts text and metadata from a PDF file buffer or path.
 * Implements Stage 0 of the recruitment pipeline.
 *
 * @param {string|Buffer} source - File path string or Buffer
 * @returns {Promise<{ rawText: string, pageCount: number, charCount: number }>}
 */
export async function extractTextFromPDF(source) {
  try {
    const rawBuffer = typeof source === 'string' ? fs.readFileSync(source) : source;
    
    // Copy into a clean Uint8Array with byteOffset === 0.
    // Node.js Buffer pool allocations (where byteOffset > 0) cause pdf-parse/pdf.js
    // to miscalculate stream start offsets, resulting in "bad XRef entry" errors.
    const uint8Data = new Uint8Array(rawBuffer.length);
    uint8Data.set(rawBuffer);

    // Parse PDF
    const data = await pdfParse(uint8Data);
    
    const rawText = (data.text || '').trim();
    const pageCount = data.numpages || 1;
    const charCount = rawText.length;

    // Reject empty or scanned/image-only PDFs
    if (charCount < 30) {
      const error = new Error('No extractable text; scanned PDFs are not supported');
      error.statusCode = 422;
      error.code = 'UNSUPPORTED_PDF_FORMAT';
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
