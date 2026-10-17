import mongoose from 'mongoose';
import WorkflowRun from '../models/WorkflowRun.js';
import resumeParserAgent from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';
import scoringAgent from '../agents/scoring.agent.js';
import interviewQuestionsAgent from '../agents/interviewQuestions.agent.js';
import recommendationAgent from '../agents/recommendation.agent.js';
import { assembleFinalReport } from '../report/reportAssembler.js';
import { llmService } from '../services/llm.service.js';

// In-memory fallback cache if MongoDB is offline
export const memoryWorkflowRuns = new Map();

export const STAGES_CONFIG = [
  { key: 'resumeParser', name: 'Resume Parser Agent', agent: resumeParserAgent },
  { key: 'skillsAnalysis', name: 'Skills Analysis Agent', agent: skillsAnalysisAgent },
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
export async function initializeWorkflowRun({ candidateId, jobDescription }) {
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
      jobDescription,
      status: 'pending',
      stages: initialStages,
      finalReport: null
    });
  } else {
    const id = `mem_run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    run = {
      _id: id,
      candidateId,
      jobDescription,
      status: 'pending',
      stages: initialStages,
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

  try {
    let output = null;

    if (stageConfig.key === 'resumeParser') {
      stageTrace.inputSummary = `Raw text: ${state.rawText.length} characters`;
      output = await stageConfig.agent.run({ rawText: state.rawText });
      state.outputs.parser = output;
    } else if (stageConfig.key === 'skillsAnalysis') {
      stageTrace.inputSummary = `Profile: ${state.outputs.parser.name} | Target JD (${state.jobDescription.length} chars):\n${state.jobDescription}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        jobDescription: state.jobDescription,
        rawText: state.rawText
      });
      state.outputs.skills = output;
    } else if (stageConfig.key === 'scoring') {
      stageTrace.inputSummary = `Requirement matches: ${state.outputs.skills.requirementMatches.length} items | Target JD: ${state.jobDescription.length} chars`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        jobDescription: state.jobDescription
      });
      state.outputs.scoring = output;
    } else if (stageConfig.key === 'interviewQuestions') {
      stageTrace.inputSummary = `Score: ${state.outputs.scoring.totalScore}, Strengths: ${state.outputs.scoring.strengths.length}, Gaps: ${state.outputs.scoring.gaps.length}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        strengths: state.outputs.scoring.strengths,
        gaps: state.outputs.scoring.gaps,
        jobDescription: state.jobDescription
      });
      state.outputs.questions = output;
    } else if (stageConfig.key === 'recommendation') {
      stageTrace.inputSummary = `Total score: ${state.outputs.scoring.totalScore}/100, Technical questions: ${state.outputs.questions.technical.length}`;
      output = await stageConfig.agent.run({
        profile: state.outputs.parser,
        skillsAnalysis: state.outputs.skills,
        scoring: state.outputs.scoring,
        interviewQuestions: state.outputs.questions,
        jobDescription: state.jobDescription
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

    const meta = llmService.getLastMetadata() || {
      provider: stageConfig.isCode ? 'code' : llmService.provider,
      model: stageConfig.isCode ? 'deterministic-assembler' : llmService.modelName,
      fallbackUsed: false
    };
    stageTrace.provider = meta.provider;
    stageTrace.model = meta.model;
    stageTrace.fallbackUsed = meta.fallbackUsed;

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

    const meta = llmService.getLastMetadata() || {
      provider: llmService.provider,
      model: llmService.modelName,
      fallbackUsed: false
    };
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
export async function executeRecruitmentWorkflow({ runId, rawText, jobDescription, startFromStageIndex = 0 }) {
  const run = await getRunById(runId);
  if (!run) {
    throw new Error(`Workflow run ${runId} not found`);
  }

  run.status = 'running';
  await persistWorkflowRun(run);

  // Initialize shared state
  const state = {
    runId,
    candidateId: run.candidateId,
    rawText,
    jobDescription,
    outputs: {
      parser: run.stages.find(s => s.key === 'resumeParser')?.output || null,
      skills: run.stages.find(s => s.key === 'skillsAnalysis')?.output || null,
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
