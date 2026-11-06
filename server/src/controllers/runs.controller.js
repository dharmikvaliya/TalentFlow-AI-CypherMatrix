import mongoose from 'mongoose';
import WorkflowRun from '../models/WorkflowRun.js';
import Candidate from '../models/Candidate.js';
import { memoryCandidates } from './candidates.controller.js';
import {
  initializeWorkflowRun,
  executeRecruitmentWorkflow,
  retryWorkflowStageById,
  getRunById,
  memoryWorkflowRuns
} from '../workflows/recruitment.workflow.js';
import { generateMarkdownReport } from '../report/reportAssembler.js';

// Demo Quota & Rate Limiting State (Rolling 24h & Rolling 1h per IP)
const runTimestamps = [];
const ipRunMap = new Map();

export function resetDemoRateLimits() {
  runTimestamps.length = 0;
  ipRunMap.clear();
}

export function checkDemoRateLimits(clientIp) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Clean up timestamps older than 24h
  while (runTimestamps.length > 0 && runTimestamps[0] < oneDayAgo) {
    runTimestamps.shift();
  }

  // Max runs per day limit (defaults to 50 in production, 3 in test)
  const maxRunsPerDayEnv = process.env.MAX_RUNS_PER_DAY;
  const maxRunsPerDay = maxRunsPerDayEnv !== undefined
    ? parseInt(maxRunsPerDayEnv, 10)
    : (process.env.NODE_ENV === 'test' ? 3 : 50);

  if (maxRunsPerDay > 0 && runTimestamps.length >= maxRunsPerDay) {
    const error = new Error('Demo analysis limit reached for today. Please try again tomorrow or run locally in mock mode.');
    error.statusCode = 429;
    error.code = 'DEMO_DAILY_LIMIT_REACHED';
    error.isPublic = true;
    throw error;
  }

  // Per-IP limit (defaults to 10 in production, 2 in test)
  const maxRunsPerHourEnv = process.env.MAX_RUNS_PER_HOUR_PER_IP;
  const maxRunsPerHour = maxRunsPerHourEnv !== undefined
    ? parseInt(maxRunsPerHourEnv, 10)
    : (process.env.NODE_ENV === 'test' ? 2 : 10);

  if (maxRunsPerHour > 0 && clientIp) {
    const ipTimestamps = (ipRunMap.get(clientIp) || []).filter(t => t >= oneHourAgo);
    if (ipTimestamps.length >= maxRunsPerHour) {
      const error = new Error(`Rate limit exceeded: maximum ${maxRunsPerHour} runs per hour per IP. Please try again later.`);
      error.statusCode = 429;
      error.code = 'DEMO_IP_LIMIT_REACHED';
      error.isPublic = true;
      throw error;
    }
  }
}

export function recordDemoRun(clientIp) {
  const now = Date.now();
  runTimestamps.push(now);
  if (clientIp) {
    const oneHourAgo = now - 60 * 60 * 1000;
    const ipTimestamps = (ipRunMap.get(clientIp) || []).filter(t => t >= oneHourAgo);
    ipTimestamps.push(now);
    ipRunMap.set(clientIp, ipTimestamps);
  }
}

/**
 * POST /api/runs
 * Starts asynchronous workflow run.
 */
export async function createRun(req, res, next) {
  try {
    const { candidateId, jobDescription, provider, model } = req.body;
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    // Enforce demo rate limits (in production/live demo; bypassed during automated test suites unless enabled)
    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_DEMO_RATE_LIMIT === 'true') {
      checkDemoRateLimits(clientIp);
    }

    // Fetch candidate
    let candidate = null;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(candidateId)) {
      candidate = await Candidate.findById(candidateId);
    } else {
      candidate = memoryCandidates.get(candidateId);
    }

    if (!candidate) {
      const error = new Error(`Candidate ${candidateId} not found`);
      error.statusCode = 404;
      error.code = 'CANDIDATE_NOT_FOUND';
      error.isPublic = true;
      throw error;
    }

    // Initialize run record
    const run = await initializeWorkflowRun({
      candidateId: candidate,
      provider,
      model,
      jobDescription
    });

    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_DEMO_RATE_LIMIT === 'true') {
      recordDemoRun(clientIp);
    }

    const runId = run._id.toString();

    // Trigger pipeline asynchronously in background
    setImmediate(async () => {
      try {
        await executeRecruitmentWorkflow({
          runId,
          rawText: candidate.rawText,
          provider,
          model,
          jobDescription
        });
      } catch (err) {
        console.error(`[Workflow Controller] Error running pipeline ${runId}:`, err);
      }
    });

    return res.status(201).json({
      runId,
      status: 'pending',
      message: 'Recruitment workflow initiated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/runs/:id
 * Fetches status, stages, outputs, and report.
 */
export async function getRun(req, res, next) {
  try {
    const { id } = req.params;
    const run = await getRunById(id);

    if (!run) {
      const error = new Error(`Workflow run ${id} not found`);
      error.statusCode = 404;
      error.code = 'RUN_NOT_FOUND';
      error.isPublic = true;
      throw error;
    }

    return res.json({ run });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/runs/:id/stages/:stageKey/retry
 * Re-runs a specific failed stage.
 */
export async function retryStage(req, res, next) {
  try {
    const { id, stageKey } = req.params;
    const run = await retryWorkflowStageById(id, stageKey);
    return res.json({
      message: `Retrying stage ${stageKey}`,
      runId: id,
      status: run.status
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/runs/:id/report.md
 * Downloads report formatted in Markdown.
 */
export async function downloadMarkdownReport(req, res, next) {
  try {
    const { id } = req.params;
    const run = await getRunById(id);

    if (!run) {
      const error = new Error(`Workflow run ${id} not found`);
      error.statusCode = 404;
      error.code = 'RUN_NOT_FOUND';
      error.isPublic = true;
      throw error;
    }

    if (!run.finalReport) {
      const error = new Error('Final report is not ready yet. Please wait for the workflow to complete.');
      error.statusCode = 400;
      error.code = 'REPORT_NOT_READY';
      error.isPublic = true;
      throw error;
    }

    const markdownText = generateMarkdownReport(run.finalReport);
    const candidateName = (run.finalReport.candidateSummary?.name || 'Candidate')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${candidateName}-evaluation-report.md"`);
    return res.send(markdownText);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/runs
 * Lists history of past runs.
 */
export async function listRuns(req, res, next) {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let runs = [];

    if (isDbConnected) {
      runs = await WorkflowRun.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('candidateId', 'fileName');
    } else {
      runs = Array.from(memoryWorkflowRuns.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    return res.json({ runs });
  } catch (err) {
    next(err);
  }
}
