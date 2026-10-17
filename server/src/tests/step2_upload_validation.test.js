import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testResumesDir = path.resolve(__dirname, '../../../samples/test-resumes');

describe('Step 2: Upload Validation Suite (MOCK MODE)', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise((resolve) => server.close(resolve));
  });

  async function uploadFile(fileName) {
    const filePath = path.join(testResumesDir, fileName);
    const buffer = fs.readFileSync(filePath);
    const formData = new FormData();
    const mime = fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
    const blob = new Blob([buffer], { type: mime });
    formData.append('resume', blob, fileName);

    const res = await fetch(`${baseUrl}/api/candidates/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  it('rejects empty 0-byte PDF with UNSUPPORTED_PDF_FORMAT or PDF_PARSE_FAILED', async () => {
    const { status, data } = await uploadFile('invalid_empty.pdf');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(['UNSUPPORTED_PDF_FORMAT', 'PDF_PARSE_FAILED']).toContain(data?.error?.code);
  });

  it('rejects image-only scanned PDF with UNSUPPORTED_PDF_FORMAT', async () => {
    const { status, data } = await uploadFile('invalid_scanned_image.pdf');
    expect(status).toBe(422);
    expect(data?.error?.code).toBe('UNSUPPORTED_PDF_FORMAT');
    expect(data?.error?.message).toContain('scanned PDFs are not supported');
  });

  it('rejects corrupted PDF with PDF_PARSE_FAILED', async () => {
    const { status, data } = await uploadFile('invalid_corrupt.pdf');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(['PDF_PARSE_FAILED', 'UNSUPPORTED_PDF_FORMAT']).toContain(data?.error?.code);
  });

  it('rejects .docx renamed to .pdf with PDF_PARSE_FAILED', async () => {
    const { status, data } = await uploadFile('invalid_docx_as_pdf.pdf');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data?.error?.code).toBe('PDF_PARSE_FAILED');
  });

  it('rejects plain .txt file with INVALID_FILE_TYPE', async () => {
    const { status, data } = await uploadFile('invalid_text_file.txt');
    expect(status).toBe(400);
    expect(data?.error?.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects oversized PDF exceeding 5MB with FILE_UPLOAD_ERROR', async () => {
    const { status, data } = await uploadFile('invalid_oversized_6mb.pdf');
    expect(status).toBe(400);
    expect(data?.error?.code).toBe('FILE_UPLOAD_ERROR');
    expect(data?.error?.message).toContain('5MB');
  });

  it('accepts valid near-5MB PDF resume (4.6 MB) successfully', async () => {
    const { status, data } = await uploadFile('resume_11_near_5mb.pdf');
    expect(status).toBe(201);
    expect(data.candidateId).toBeDefined();
    expect(data.fileName).toBe('resume_11_near_5mb.pdf');
    expect(data.pageCount).toBeGreaterThan(10);
  });
});
