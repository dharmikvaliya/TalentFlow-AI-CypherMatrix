import { z } from 'zod';

export const createRunSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  jobDescription: z.string().min(20, 'Job description must be at least 20 characters long'),
  provider: z.string().optional(),
  model: z.string().optional()
});

export const retryStageSchema = z.object({
  id: z.string().min(1, 'Run ID is required'),
  stageKey: z.enum([
    'resumeParser',
    'skillsAnalysis',
    'scoring',
    'interviewQuestions',
    'recommendation',
    'report'
  ])
});
