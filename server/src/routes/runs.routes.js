import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validate.js';
import { createRunSchema, retryStageSchema } from '../validators/requestSchemas.js';
import {
  createRun,
  getRun,
  retryStage,
  downloadMarkdownReport,
  listRuns
} from '../controllers/runs.controller.js';

const router = Router();

// GET /api/runs - List past runs
router.get('/', listRuns);

// POST /api/runs - Start workflow
router.post('/', validateBody(createRunSchema), createRun);

// GET /api/runs/:id - Get run details & stages
router.get('/:id', getRun);

// GET /api/runs/:id/report.md - Download Markdown report
router.get('/:id/report.md', downloadMarkdownReport);

// POST /api/runs/:id/stages/:stageKey/retry - Retry failed stage
router.post('/:id/stages/:stageKey/retry', validateParams(retryStageSchema), retryStage);

export default router;
