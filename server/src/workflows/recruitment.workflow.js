import mongoose from 'mongoose';
import WorkflowRun from '../models/WorkflowRun.js';
import resumeParserAgent from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';
import scoringAgent from '../agents/scoring.agent.js';
import interviewQuestionsAgent from '../agents/interviewQuestions.agent.js';
import recommendationAgent from '../agents/recommendation.agent.js';
import { assembleFinalReport } from '../report/reportAssembler.js';
import { llmService } from '../services/llm.service.js';
import { analyzeResumeIntegrity } from '../services/resumeIntegrity.service.js';
import { resumeIntegrityOutputSchema } from '../validators/agentSchemas.js';

// In-memory fallback cache if MongoDB is offline
export const memoryWorkflowRuns = new Map();

export const STAGES_CONFIG = [
  { key: 'resumeParser', name: 'Resume Parser Agent', agent: resumeParserAgent },
  { key: 'skillsAnalysis', name: 'Skills Analysis Agent', agent: skillsAnalysisAgent },
  { key: 'resumeIntegrity', name: 'Resume Integrity Engine', isCode: true },
  { key: 'scoring', name: 'Candidate Scoring Engine', agent: scoringAgent },
  { key: 'interviewQuestions', name: 'Interview Question Agent', agent: interviewQuestionsAgent },
  { key: 'recommendation', name: 'Hiring Recommendation Agent', agent: recommendationAgent },
  { key: 'report', name: 'Final Report Assembler', isCode: true }
];

/**
 * Persists the current workflow run state to MongoDB and in-memory fallback.
 */
export async function persistWorkflowRun(runDoc) {
  memoryWorkflowRuns.set(runDoc._id.toString(), JSON.parse(JSON.stringify(runDoc)));

  if (mongoose.connection.readyState === 1 && typeof runDoc.save === 'function') {
    try {
      if (typeof runDoc.markModified === 'function') runDoc.markModified('stages');
      await runDoc.save();
    } catch (err) {
      console.error('[Workflow] Failed to persist run to MongoDB:', err.message);
    }
  }
}

/**
 * Fetches a workflow run by ID from MongoDB or memory cache.
 */
export async function getRunById(runId) {
  if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(runId)) {
    const doc = await WorkflowRun.findById(runId);
    if (doc) return doc;
  }
  return memoryWorkflowRuns.get(runId.toString()) || null;
}

/**
 * Creates a new WorkflowRun record and initializes all stages to pending.
 */
export async function initializeWorkflowRun({ candidateId, jobDescription, provider = null, model = null }) {
  const initialStages = STAGES_CONFIG.map(st => ({
    key: st.key,
    name: st.name,
    status: 'pending',
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    inputSummary: '',
    output: null,
    retries: 0,
    error: null,
    provider: null,
    model: null,
    fallbackUsed: false
  }));

  const isDbConnected = mongoose.connection.readyState === 1;
  let run;

  if (isDbConnected) {
    run = await WorkflowRun.create({
      candidateId,
      provider: provider || null,
      model: model || null,
      jobDescription,
      status: 'pending',
      stages: initialStages,
      resumeIntegrity: null,
      finalReport: null
    });
  } else {
    const id = `mem_run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    run = {
      _id: id,
      candidateId,
      provider: provider || null,
      model: model || null,
      jobDescription,
      status: 'pending',
      stages: initialStages,
      resumeIntegrity: null,
      finalReport: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryWorkflowRuns.set(id, run);
  }

  return run;
}

/**
 * Executes a single stage within the pipeline with tracing, duration timing, and state storage.
 */
async function executeStage({ stageConfig, state, stageIndex, run }) {
  const stageTrace = run.stages[stageIndex];
  stageTrace.status = 'running';
  stageTrace.startedAt = new Date();
  await persistWorkflowRun(run);

  const startTime = Date.now();
  let retriesCount = 0;
  let fallbackUsed = false;

  try {
    let output = null;

    if (stageConfig.key === 'resumeParser') {
      stageTrace.inputSummary = `Raw text: ${state.rawText.length} characters`;
      output = await stageConfig.agent.run({ rawText: state.rawText, provider: state.provider, model: state.model });
      state.outputs.parser = output;
    } else if (stageConfig.key === 'skillsAnalysis') {
      stageTrace.inputSummary = `Profile: ${state.outputs.parser.name} | Target JD (${state.jobDescription.length} chars):\n${state.jobDescription}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        jobDescription: state.jobDescription,
        rawText: state.rawText,
        provider: state.provider,
        model: state.model
      });
      state.outputs.skills = output;
    } else if (stageConfig.key === 'resumeIntegrity') {
      stageTrace.inputSummary = `Raw text: ${state.rawText?.length || 0} chars | Skills: ${state.outputs.skills?.skills?.length || 0} | Req Matches: ${state.outputs.skills?.requirementMatches?.length || 0}`;
      try {
        const rawIntegrityOutput = analyzeResumeIntegrity({
          rawResumeText: state.rawText,
          jobDescription: state.jobDescription,
          candidateProfile: state.outputs.parser,
          requirementMatches: state.outputs.skills?.requirementMatches || []
        });
        output = resumeIntegrityOutputSchema.parse(rawIntegrityOutput);
      } catch (err) {
        console.warn('[Workflow] Resume Integrity Analysis failed; activating safe fallback:', err.message);
        output = {
          // An unavailable analysis cannot support a low-risk conclusion.
          // Use the neutral review tier and require a human assessment.
          riskLevel: 'medium',
          confidence: 0,
          reviewRequired: true,
          metrics: {
            totalWords: 0,
            uniqueWordRatio: 0,
            repeatedTermRatio: 0,
            jdPhraseOverlapRatio: 0,
            unsupportedSkillRatio: 0,
            promptInjectionIndicatorCount: 0,
            genericPhraseCount: 0
          },
          flags: [
            {
              code: 'INTEGRITY_ANALYSIS_UNAVAILABLE',
              severity: 'warning',
              title: 'Integrity analysis unavailable',
              explanation: 'Resume integrity analysis could not be completed. Manual review is required.',
              evidence: [],
              affectedSkills: []
            }
          ],
          summary: 'Integrity analysis was unavailable. No low-risk conclusion should be inferred.',
          limitations: [
            'Manual review is required because automated integrity analysis was unavailable.'
          ]
        };
        stageTrace.fallbackUsed = true;
      }
      state.outputs.integrity = output;
      run.resumeIntegrity = output;
    } else if (stageConfig.key === 'scoring') {
      stageTrace.inputSummary = `Requirement matches: ${state.outputs.skills.requirementMatches.length} items | Target JD: ${state.jobDescription.length} chars`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        jobDescription: state.jobDescription,
        provider: state.provider,
        model: state.model
      });
      state.outputs.scoring = output;
    } else if (stageConfig.key === 'interviewQuestions') {
      const hasIntegrityRisk = state.outputs.integrity && (state.outputs.integrity.riskLevel !== 'low' || state.outputs.integrity.reviewRequired);
      stageTrace.inputSummary = `Score: ${state.outputs.scoring.totalScore}, Strengths: ${state.outputs.scoring.strengths.length}, Gaps: ${state.outputs.scoring.gaps.length}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        strengths: state.outputs.scoring.strengths,
        gaps: state.outputs.scoring.gaps,
        integrityFindings: hasIntegrityRisk ? state.outputs.integrity : null,
        jobDescription: state.jobDescription,
        provider: state.provider,
        model: state.model
      });
      state.outputs.questions = output;
    } else if (stageConfig.key === 'recommendation') {
      const integritySummary = state.outputs.integrity ? {
        riskLevel: state.outputs.integrity.riskLevel,
        confidence: state.outputs.integrity.confidence,
        reviewRequired: state.outputs.integrity.reviewRequired,
        summary: state.outputs.integrity.summary,
        flagsCount: (state.outputs.integrity.flags || []).length,
        flagCodes: (state.outputs.integrity.flags || []).map(f => f.code)
      } : null;
      stageTrace.inputSummary = `Total score: ${state.outputs.scoring.totalScore}/100, Technical questions: ${state.outputs.questions.technical.length}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        scoring: state.outputs.scoring,
        interviewQuestions: state.outputs.questions,
        integritySummary,
        jobDescription: state.jobDescription,
        provider: state.provider,
        model: state.model
      });
      state.outputs.recommendation = output;
    } else if (stageConfig.key === 'report') {
      stageTrace.inputSummary = 'Aggregating all validated stage outputs into final report';
      stageTrace.status = 'success';
      stageTrace.endedAt = new Date();
      stageTrace.durationMs = Math.max(1, Date.now() - startTime);
      output = assembleFinalReport(state.outputs, run.stages);
      state.outputs.report = output;
      run.finalReport = output;
    }

    const meta = (stageConfig.key === 'resumeIntegrity')
      ? { provider: 'code', model: 'deterministic-integrity-engine', fallbackUsed: Boolean(stageTrace.fallbackUsed || fallbackUsed) }
      : (stageConfig.key === 'report')
        ? { provider: 'code', model: 'deterministic-assembler', fallbackUsed: false }
        : (llmService.getLastMetadata() || {
      provider: stageConfig.isCode ? 'code' : llmService.provider,
      model: stageConfig.isCode ? 'deterministic-assembler' : llmService.modelName,
      fallbackUsed: false
    });
    stageTrace.provider = meta.provider;
    stageTrace.model = meta.model;
    stageTrace.fallbackUsed = Boolean(meta.fallbackUsed);
    if (meta.fallbackUsed) {
      stageTrace.fallbackWarning = 'Synthetic mock response substituted due to live provider failure';
      if (output && typeof output === 'object' && !Array.isArray(output)) {
        output._isSyntheticMock = true;
      }
    }
    if (meta.repairedTruncation) {
      stageTrace.repairedTruncation = true;
    }

    const durationMs = Date.now() - startTime;
    stageTrace.status = 'success';
    stageTrace.endedAt = new Date();
    stageTrace.durationMs = durationMs;
    stageTrace.output = output;
    stageTrace.retries = retriesCount;
    stageTrace.error = null;

    await persistWorkflowRun(run);
    return { success: true, output };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[Workflow] Stage ${stageConfig.key} failed:`, err.message);
    stageTrace.status = 'failed';
    stageTrace.endedAt = new Date();
    stageTrace.durationMs = durationMs;
    stageTrace.retries = retriesCount;

    const meta = (stageConfig.key === 'resumeIntegrity')
      ? { provider: 'code', model: 'deterministic-integrity-engine', fallbackUsed: Boolean(stageTrace.fallbackUsed) }
      : (stageConfig.key === 'report')
        ? { provider: 'code', model: 'deterministic-assembler', fallbackUsed: false }
        : (llmService.getLastMetadata() || {
      provider: llmService.provider,
      model: llmService.modelName,
      fallbackUsed: false
    });
    stageTrace.provider = meta.provider;
    stageTrace.model = meta.model;
    stageTrace.fallbackUsed = meta.fallbackUsed;

    let errorMsg = err.message;
    if (err.name === 'LLMProviderError' && err.status === 429 && err.retryAfterSeconds && err.retryAfterSeconds > 60) {
      const hours = Math.round(err.retryAfterSeconds / 3600);
      const timeDesc = hours > 0 ? `~${hours}h` : `${Math.round(err.retryAfterSeconds / 60)}m`;
      const providerLabel = err.provider === 'openai' ? 'OpenAI' : (err.provider === 'gemini' ? 'Gemini' : err.provider);
      errorMsg = `${providerLabel} quota limit reached; retry after ${timeDesc}`;
    }
    stageTrace.error = errorMsg;

    await persistWorkflowRun(run);
    return { success: false, error: errorMsg };
  }
}

/**
 * Main Orchestrator: Runs the recruitment workflow sequentially.
 *
 * @param {Object} params
 * @param {string} params.runId - Target run ID
 * @param {string} params.rawText - Candidate raw text
 * @param {string} params.jobDescription - Target JD
 * @param {number} [params.startFromStageIndex=0] - For retrying a specific stage
 */
export async function executeRecruitmentWorkflow({
  runId,
  rawText,
  jobDescription,
  startFromStageIndex = 0,
  provider = null,
  model = null
}) {
  const run = await getRunById(runId);
  if (!run) {
    throw new Error(`Workflow run ${runId} not found`);
  }

  const effectiveProvider = provider || run.provider || null;
  const effectiveModel = model || run.model || null;
  if (effectiveProvider && !run.provider) run.provider = effectiveProvider;
  if (effectiveModel && !run.model) run.model = effectiveModel;

  run.status = 'running';
  await persistWorkflowRun(run);

  // Initialize shared state
  const state = {
    runId,
    candidateId: run.candidateId,
    rawText,
    jobDescription,
    provider: effectiveProvider,
    model: effectiveModel,
    outputs: {
      parser: run.stages.find(s => s.key === 'resumeParser')?.output || null,
      skills: run.stages.find(s => s.key === 'skillsAnalysis')?.output || null,
      integrity: run.stages.find(s => s.key === 'resumeIntegrity')?.output || run.resumeIntegrity || null,
      scoring: run.stages.find(s => s.key === 'scoring')?.output || null,
      questions: run.stages.find(s => s.key === 'interviewQuestions')?.output || null,
      recommendation: run.stages.find(s => s.key === 'recommendation')?.output || null,
      report: run.finalReport || null
    }
  };

  for (let i = startFromStageIndex; i < STAGES_CONFIG.length; i++) {
    const stageConfig = STAGES_CONFIG[i];
    const result = await executeStage({ stageConfig, state, stageIndex: i, run });

    if (!result.success) {
      // Mark all subsequent stages as skipped
      for (let j = i + 1; j < STAGES_CONFIG.length; j++) {
        run.stages[j].status = 'skipped';
        run.stages[j].error = `Skipped due to upstream failure at stage "${stageConfig.name}"`;
      }
      run.status = 'failed';
      await persistWorkflowRun(run);
      return run;
    }
  }

  run.status = 'completed';
  await persistWorkflowRun(run);
  console.log(`[Workflow] Run ${runId} completed successfully!`);
  return run;
}

/**
 * Retries a failed stage reusing upstream outputs.
 */
export async function retryWorkflowStageById(runId, stageKey) {
  const run = await getRunById(runId);
  if (!run) {
    throw new Error(`Workflow run ${runId} not found`);
  }

  const stageIndex = STAGES_CONFIG.findIndex(s => s.key === stageKey);
  if (stageIndex === -1) {
    throw new Error(`Invalid stage key: ${stageKey}`);
  }

  // Reset target stage and subsequent stages to pending
  for (let i = stageIndex; i < run.stages.length; i++) {
    run.stages[i].status = 'pending';
    run.stages[i].error = null;
    run.stages[i].output = null;
  }
  run.status = 'running';
  await persistWorkflowRun(run);

  // Execute asynchronously
  setImmediate(async () => {
    try {
      // Retrieve raw text from candidate
      let rawText = run.candidateId?.rawText || '';
      if (!rawText) {
        const candId = run.candidateId?._id || run.candidateId;
        if (candId) {
          const { Candidate, memoryCandidates } = await import('../controllers/candidates.controller.js');
          const cand = memoryCandidates?.get(candId.toString()) || (mongoose.isValidObjectId(candId) ? await Candidate?.findById(candId) : null);
          rawText = cand?.rawText || '';
        }
      }

      await executeRecruitmentWorkflow({
        runId,
        rawText,
        jobDescription: run.jobDescription,
        startFromStageIndex: stageIndex
      });
    } catch (err) {
      console.error(`[Workflow] Retry for stage ${stageKey} failed:`, err);
    }
  });

  return run;
}
