import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { initializeWorkflowRun, executeRecruitmentWorkflow } from '../workflows/recruitment.workflow.js';
import { memoryCandidates } from '../controllers/candidates.controller.js';

describe('Step 2: Markdown Report Generation Suite (MOCK MODE)', () => {
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

  it('returns 400 REPORT_NOT_READY when workflow is not completed yet', async () => {
    const run = await initializeWorkflowRun({
      candidateId: 'test_cand_incomplete',
      jobDescription: 'Required: React, Node.js'
    });

    const res = await fetch(`${baseUrl}/api/runs/${run._id}/report.md`);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe('REPORT_NOT_READY');
  });

  it('downloads complete Markdown report with all required sections when run completes', async () => {
    const candidateId = 'cand_md_report_test';
    memoryCandidates.set(candidateId, {
      _id: candidateId,
      fileName: 'marcus_vance.pdf',
      rawText: 'Marcus Vance: Senior Full-Stack Engineer with 6 years experience in React, Node.js, Express, and MongoDB Atlas. B.S. in Computer Science.',
      pageCount: 2,
      charCount: 250,
      createdAt: new Date().toISOString()
    });

    const run = await initializeWorkflowRun({
      candidateId: memoryCandidates.get(candidateId),
      jobDescription: 'Required Skills: React, Node.js, Express, MongoDB. Preferred: Docker, LangGraph.'
    });

    await executeRecruitmentWorkflow({
      runId: run._id,
      rawText: memoryCandidates.get(candidateId).rawText,
      jobDescription: 'Required Skills: React, Node.js, Express, MongoDB. Preferred: Docker, LangGraph.'
    });

    const res = await fetch(`${baseUrl}/api/runs/${run._id}/report.md`);
    expect(res.status).toBe(200);

    // Verify response headers
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/markdown');
    const contentDisposition = res.headers.get('content-disposition');
    expect(contentDisposition).toContain('attachment; filename=');
    expect(contentDisposition).toContain('.md');

    const markdownText = await res.text();
    expect(markdownText.length).toBeGreaterThan(500);

    // Verify all required report sections are present in Markdown
    expect(markdownText).toContain('# TalentFlow AI — Candidate Evaluation Report');
    expect(markdownText).toContain('## 1. Executive Summary');
    expect(markdownText).toContain('## 2. Objective Rubric Score Breakdown');
    expect(markdownText).toContain('## 3. Key Strengths');
    expect(markdownText).toContain('## 4. Skill Gaps');
    expect(markdownText).toContain('## 5. Job Description Requirement Alignment');
    expect(markdownText).toContain('## 6. Targeted Interview Questions');
    expect(markdownText).toContain('## 7. Recommendation & Next Steps');
    expect(markdownText).toContain('## 8. Workflow Execution Trace');
  });
});
