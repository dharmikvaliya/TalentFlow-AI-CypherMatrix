import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { memoryCandidates } from '../controllers/candidates.controller.js';

describe('Step 2: API Behavior, Edge Cases & Security Suite (MOCK MODE)', () => {
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

  it('rejects POST /api/runs when candidateId or jobDescription are missing or invalid', async () => {
    // Missing candidateId
    const res1 = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: 'Valid job description that is long enough.' })
    });
    expect(res1.status).toBe(400);
    const data1 = await res1.json();
    expect(data1.error?.code).toBe('VALIDATION_ERROR');

    // Job description too short (<20 chars)
    const res2 = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: 'any_id', jobDescription: 'Too short' })
    });
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 RUN_NOT_FOUND for non-existent run ID', async () => {
    const res = await fetch(`${baseUrl}/api/runs/non_existent_run_id_9999`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.code).toBe('RUN_NOT_FOUND');
  });

  it('handles huge job description (100,000+ characters) without crashing or overflowing', async () => {
    const candidateId = 'cand_huge_jd_test';
    memoryCandidates.set(candidateId, {
      _id: candidateId,
      fileName: 'test.pdf',
      rawText: 'Candidate with 5 years full-stack experience in React, Node.js, Express, MongoDB.',
      pageCount: 1,
      charCount: 100,
      createdAt: new Date().toISOString()
    });

    const hugeJd = 'Required Skills: React, Node.js, Express, MongoDB. '.repeat(2000); // ~104,000 chars

    const res = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, jobDescription: hugeJd })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.runId).toBeDefined();

    // Verify run details can be queried
    const runRes = await fetch(`${baseUrl}/api/runs/${data.runId}`);
    expect(runRes.status).toBe(200);
    const runData = await runRes.json();
    expect(runData.run).toBeDefined();
  });

  it('safely processes XSS / HTML payloads in candidate resume text without executing or crashing', async () => {
    const candidateId = 'cand_xss_test';
    const xssPayload = `
      <script>alert("XSS Attack");</script>
      <img src="x" onerror="maliciousCode()" />
      <iframe src="javascript:alert(1)"></iframe>
      Candidate Name: Sarah Connor
      Summary: Senior Full-Stack Engineer with React & Node.js
      Experience: Built web applications using Express and MongoDB.
    `;

    memoryCandidates.set(candidateId, {
      _id: candidateId,
      fileName: 'xss_resume.pdf',
      rawText: xssPayload,
      pageCount: 1,
      charCount: xssPayload.length,
      createdAt: new Date().toISOString()
    });

    const res = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        jobDescription: 'Required Skills: React, Node.js, Express, MongoDB.'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.runId).toBeDefined();

    // Poll until completed
    let finalRun = null;
    for (let i = 0; i < 20; i++) {
      const runRes = await fetch(`${baseUrl}/api/runs/${data.runId}`);
      const runData = await runRes.json();
      if (runData.run?.status === 'completed' || runData.run?.status === 'failed') {
        finalRun = runData.run;
        break;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    expect(finalRun).toBeDefined();
    expect(finalRun.status).toBe('completed');
    // Ensure final report JSON is structured safely
    expect(finalRun.finalReport).toBeDefined();
    expect(typeof finalRun.finalReport.candidateSummary.name).toBe('string');
  });

  it('never leaks internal stack traces, API keys, or database credentials in client error responses', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/invalid_id_not_found`);
    const data = await res.json();

    expect(data.error).toBeDefined();
    expect(data.error.message).toBeDefined();
    // Must NOT contain sensitive env vars or keys
    expect(JSON.stringify(data)).not.toContain('GEMINI_API_KEY');
    expect(JSON.stringify(data)).not.toContain('MONGO_URI');
    expect(JSON.stringify(data)).not.toContain('password');
    // Stack trace must not be exposed to client in public error response
    expect(data.stack).toBeUndefined();
  });
});
