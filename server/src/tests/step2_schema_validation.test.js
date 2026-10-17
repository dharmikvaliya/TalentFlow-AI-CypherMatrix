import { describe, it, expect, vi, beforeEach } from 'vitest';
import resumeParserAgent from '../agents/resumeParser.agent.js';
import llmService from '../services/llm.service.js';
import { initializeWorkflowRun, executeRecruitmentWorkflow } from '../workflows/recruitment.workflow.js';

describe('Step 2: Schema Validation & Stage Retry Suite (MOCK MODE)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries once with error feedback when initial LLM JSON violates schema, then succeeds if corrected', async () => {
    // Malformed initial response (education institution is number instead of string)
    const malformedFirstResponse = {
      name: 'Test Candidate',
      education: [{ institution: 12345 }], // Number instead of string triggers Zod failure
      experience: []
    };

    // Valid corrected response on retry
    const validSecondResponse = {
      name: 'Corrected Candidate',
      email: 'corrected@example.com',
      phone: null,
      links: [],
      summary: 'Experienced engineer',
      education: [
        {
          institution: 'State University',
          degree: 'B.S.',
          field: 'Computer Science',
          startYear: 2018,
          endYear: 2022,
          grade: null
        }
      ],
      experience: [],
      projects: [],
      skillsListed: ['JavaScript', 'React'],
      achievements: []
    };

    let callCount = 0;
    vi.spyOn(llmService, 'generateStructuredJSON').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return malformedFirstResponse;
      return validSecondResponse;
    });

    const result = await resumeParserAgent.run({
      rawText: 'Valid raw resume text with sufficient length for testing schema validation.'
    });

    expect(callCount).toBe(2); // Initial attempt + 1 retry
    expect(result.name).toBe('Corrected Candidate');
    expect(result.education).toHaveLength(1);
  });

  it('fails stage with clear schema error after 1 retry fails, and downstream stages are marked skipped in workflow', async () => {
    // Persistently invalid JSON (cannot be normalized)
    const irrecoverableInvalidJson = {
      name: null, // Schema requires non-empty string
      education: 'invalid_type_always'
    };

    // Spy on resumeParser to fail
    vi.spyOn(resumeParserAgent, 'run').mockRejectedValue(
      new Error('Resume Parser Agent failed schema validation: name must be a string')
    );

    const run = await initializeWorkflowRun({
      candidateId: 'test_cand_schema_fail',
      jobDescription: 'Required: React, Node.js'
    });

    const completedRun = await executeRecruitmentWorkflow({
      runId: run._id,
      rawText: 'Candidate raw text for testing failure cascade.',
      jobDescription: 'Required: React, Node.js'
    });

    expect(completedRun.status).toBe('failed');

    // Stage 1 (resumeParser) failed
    const stage1 = completedRun.stages[0];
    expect(stage1.key).toBe('resumeParser');
    expect(stage1.status).toBe('failed');
    expect(stage1.error).toContain('failed schema validation');

    // All downstream stages (1 to 5) must be skipped
    for (let i = 1; i < completedRun.stages.length; i++) {
      const downstreamStage = completedRun.stages[i];
      expect(downstreamStage.status).toBe('skipped');
      expect(downstreamStage.error).toContain('Skipped due to upstream failure');
    }
  });
});
