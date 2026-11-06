import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../app.js';
import { memoryCandidates } from '../controllers/candidates.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleJdPath = path.resolve(__dirname, '../../../samples/sample_job_description.txt');
const sampleJd = fs.readFileSync(sampleJdPath, 'utf8');

describe('Full End-to-End Orchestrator Workflow API Tests', () => {
  let server;
  let baseUrl;
  let candidateId;

  beforeAll(async () => {
    // Seed in-memory candidate
    candidateId = 'cand_integration_test_123';
    memoryCandidates.set(candidateId, {
      _id: candidateId,
      fileName: 'sarah_chen_resume.pdf',
      rawText: 'Sarah Chen\nFull-Stack AI Developer with React, Node.js, Express, MongoDB, Zod, and Gemini experience.',
      pageCount: 1,
      charCount: 120
    });

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

  it('initializes workflow run and completes all 7 stages sequentially', async () => {
    const createRes = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        jobDescription: sampleJd
      })
    });

    expect(createRes.status).toBe(201);
    const { runId } = await createRes.json();
    expect(runId).toBeDefined();

    // Poll until completed (or timeout after 15s)
    let finalRun = null;
    const startPoll = Date.now();
    while (Date.now() - startPoll < 15000) {
      const getRes = await fetch(`${baseUrl}/api/runs/${runId}`);
      const data = await getRes.json();
      if (data.run.status === 'completed' || data.run.status === 'failed') {
        finalRun = data.run;
        break;
      }
      await new Promise(r => setTimeout(r, 600));
    }

    expect(finalRun).not.toBeNull();
    expect(finalRun.status).toBe('completed');
    expect(finalRun.stages.length).toBe(7);

    // Verify resumeIntegrity stage
    const integrityStage = finalRun.stages.find(s => s.key === 'resumeIntegrity');
    expect(integrityStage).toBeDefined();
    expect(integrityStage.status).toBe('success');
    expect(integrityStage.output).toBeDefined();
    expect(finalRun.resumeIntegrity).toBeDefined();

    // Verify all stages succeeded
    finalRun.stages.forEach(st => {
      expect(st.status).toBe('success');
      expect(st.durationMs).toBeGreaterThanOrEqual(0);
      expect(st.output).toBeDefined();
    });

    // Verify final report
    expect(finalRun.finalReport).toBeDefined();
    expect(finalRun.finalReport.candidateSummary.name).toBeTruthy();
    expect(finalRun.finalReport.scoreAndBreakdown.totalScore).toBeGreaterThanOrEqual(0);
    expect(finalRun.finalReport.recommendation.recommendation).toBeDefined();

    // Verify Markdown download endpoint
    const mdRes = await fetch(`${baseUrl}/api/runs/${runId}/report.md`);
    expect(mdRes.status).toBe(200);
    const mdContent = await mdRes.text();
    expect(mdContent).toContain('# TalentFlow AI — Candidate Evaluation Report');
    expect(mdContent).toContain('Objective Rubric Score Breakdown');
  }, 20000);
});
