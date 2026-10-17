import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplePdfPath = path.resolve(__dirname, '../../../samples/sample_resume.pdf');

describe('Candidate Upload and Retrieval API Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('uploads a valid PDF resume and returns candidate details and raw text', async () => {
    const fileBuffer = fs.readFileSync(samplePdfPath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('resume', blob, 'sample_resume.pdf');

    const res = await fetch(`${baseUrl}/api/candidates/upload`, {
      method: 'POST',
      body: formData
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.candidateId).toBeDefined();
    expect(data.fileName).toBe('sample_resume.pdf');
    expect(data.pageCount).toBeGreaterThanOrEqual(1);
    expect(data.charCount).toBeGreaterThan(100);
    expect(data.rawTextPreview).toContain('Sarah Chen');

    // Test GET /api/candidates/:id
    const getRes = await fetch(`${baseUrl}/api/candidates/${data.candidateId}`);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.candidate._id).toBe(data.candidateId);
    expect(getData.candidate.rawText).toContain('Sarah Chen');
  });

  it('rejects upload when no file is attached', async () => {
    const formData = new FormData();
    const res = await fetch(`${baseUrl}/api/candidates/upload`, {
      method: 'POST',
      body: formData
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('NO_FILE_PROVIDED');
  });
});
