import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromPDF } from '../services/pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplePdfPath = path.resolve(__dirname, '../../../samples/sample_resume.pdf');

describe('PDF Service Extraction Tests', () => {
  it('extracts text, pageCount, and charCount from sample resume', async () => {
    const result = await extractTextFromPDF(samplePdfPath);
    expect(result).toBeDefined();
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.charCount).toBeGreaterThan(100);
    expect(result.rawText).toContain('Sarah Chen');
    expect(result.rawText).toContain('NovaTech Labs');
    expect(result.rawText).toContain('React');
  });

  it('rejects empty or corrupt buffer with clear error message', async () => {
    const emptyBuffer = Buffer.from('Not a valid PDF at all');
    await expect(extractTextFromPDF(emptyBuffer)).rejects.toThrow();
  });
});
