import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { memoryCandidates } from '../controllers/candidates.controller.js';
import { retryWorkflowStageById, getRunById, initializeWorkflowRun } from '../workflows/recruitment.workflow.js';

describe('Phase 6: Hardening, Resilience & Edge Cases', () => {
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

  it('rejects oversized files exceeding 5MB', async () => {
    // Generate a 6MB dummy buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0);
    const formData = new FormData();
    const blob = new Blob([largeBuffer], { type: 'application/pdf' });
    formData.append('resume', blob, 'oversized.pdf');

    const res = await fetch(`${baseUrl}/api/candidates/upload`, {
      method: 'POST',
      body: formData
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('FILE_UPLOAD_ERROR');
    expect(data.error.message).toContain('5MB');
  });

  it('rejects non-PDF files', async () => {
    const textBuffer = Buffer.from('Plain text file content');
    const formData = new FormData();
    const blob = new Blob([textBuffer], { type: 'text/plain' });
    formData.append('resume', blob, 'resume.txt');

    const res = await fetch(`${baseUrl}/api/candidates/upload`, {
      method: 'POST',
      body: formData
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('sanitizes potential API keys from error responses', async () => {
    // Calling invalid endpoint
    const res = await fetch(`${baseUrl}/api/invalid-route`);
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain('AIza');
  });

  it('allows retrying an individual failed stage without redoing earlier stages', async () => {
    const candidate = {
      _id: 'cand_retry_test',
      fileName: 'test.pdf',
      rawText: 'Sarah Chen Full Stack Developer React Node.js',
      pageCount: 1,
      charCount: 45
    };
    memoryCandidates.set(candidate._id, candidate);

    const run = await initializeWorkflowRun({
      candidateId: candidate,
      jobDescription: 'Required: React and Node.js with 2+ years experience'
    });

    // Simulate stage 1 success and stage 2 failure
    run.stages[0].status = 'success';
    run.stages[0].output = { name: 'Sarah Chen', education: [], experience: [], projects: [], skillsListed: ['React'] };
    run.stages[1].status = 'failed';
    run.stages[1].error = 'Simulated network timeout';

    // Call retry on stage 2 (skillsAnalysis)
    const retriedRun = await retryWorkflowStageById(run._id.toString(), 'skillsAnalysis');
    expect(retriedRun.stages[1].status).toBe('pending');
    expect(retriedRun.stages[1].error).toBeNull();
    // Earlier stage 1 was NOT wiped out
    expect(retriedRun.stages[0].status).toBe('success');
    expect(retriedRun.stages[0].output.name).toBe('Sarah Chen');
  });
});
