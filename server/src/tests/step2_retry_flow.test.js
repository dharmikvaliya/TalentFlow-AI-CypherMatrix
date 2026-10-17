import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { initializeWorkflowRun, executeRecruitmentWorkflow, getRunById } from '../workflows/recruitment.workflow.js';
import interviewQuestionsAgent from '../agents/interviewQuestions.agent.js';

describe('Step 2: Workflow Stage Retry Flow Suite (MOCK MODE)', () => {
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

  it('preserves upstream outputs when a failed stage is retried via API and completes downstream stages', async () => {
    // 1. Temporarily mock interviewQuestionsAgent to fail
    let shouldFailQuestions = true;
    const originalRun = interviewQuestionsAgent.run;
    vi.spyOn(interviewQuestionsAgent, 'run').mockImplementation(async (input) => {
      if (shouldFailQuestions) {
        throw new Error('Simulated upstream API timeout during question generation');
      }
      return originalRun(input);
    });

    // 2. Initialize and run workflow
    const run = await initializeWorkflowRun({
      candidateId: {
        _id: 'cand_test_retry',
        rawText: 'Marcus Vance senior full stack engineer with React, Node.js, Express, and MongoDB experience.'
      },
      jobDescription: 'Required: React, Node.js, Express, MongoDB. Preferred: Docker.'
    });

    const failedRun = await executeRecruitmentWorkflow({
      runId: run._id,
      rawText: 'Marcus Vance senior full stack engineer with React, Node.js, Express, and MongoDB experience.',
      jobDescription: 'Required: React, Node.js, Express, MongoDB. Preferred: Docker.'
    });

    expect(failedRun.status).toBe('failed');

    // Verify stages 0, 1, 2 succeeded
    expect(failedRun.stages[0].status).toBe('success'); // resumeParser
    expect(failedRun.stages[1].status).toBe('success'); // skillsAnalysis
    expect(failedRun.stages[2].status).toBe('success'); // scoring

    const savedParserOutput = failedRun.stages[0].output;
    const savedSkillsOutput = failedRun.stages[1].output;
    const savedScoringOutput = failedRun.stages[2].output;

    // Verify stage 3 failed
    expect(failedRun.stages[3].status).toBe('failed'); // interviewQuestions
    expect(failedRun.stages[3].error).toContain('Simulated upstream API timeout');

    // Verify stages 4 and 5 were skipped
    expect(failedRun.stages[4].status).toBe('skipped'); // recommendation
    expect(failedRun.stages[5].status).toBe('skipped'); // report

    // 3. Now resolve failure condition and call retry endpoint
    shouldFailQuestions = false;

    const retryRes = await fetch(`${baseUrl}/api/runs/${run._id}/stages/interviewQuestions/retry`, {
      method: 'POST'
    });
    const retryData = await retryRes.json();

    expect(retryRes.status).toBe(200);
    expect(retryData.message).toContain('Retrying stage interviewQuestions');

    // 4. Wait for async retry execution to complete
    await new Promise((r) => setTimeout(r, 2000));

    const finalRun = await getRunById(run._id);
    expect(finalRun.status).toBe('completed');

    // Confirm upstream outputs were NOT recalculated or wiped
    expect(finalRun.stages[0].output.name).toBe(savedParserOutput.name);
    expect(finalRun.stages[1].output.skills.length).toBe(savedSkillsOutput.skills.length);
    expect(finalRun.stages[2].output.totalScore).toBe(savedScoringOutput.totalScore);

    // Confirm retried stage and all downstream stages succeeded
    expect(finalRun.stages[3].status).toBe('success'); // interviewQuestions
    expect(finalRun.stages[4].status).toBe('success'); // recommendation
    expect(finalRun.stages[5].status).toBe('success'); // report
    expect(finalRun.finalReport).toBeDefined();
    expect(finalRun.finalReport.recommendation).toBeDefined();
    expect(['Hire', 'Maybe', 'No']).toContain(finalRun.finalReport.recommendation.recommendation);
  });
});
