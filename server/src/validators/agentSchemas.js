import { z } from 'zod';

/**
 * Stage 1: Resume Parser Agent Output Schema
 */
export const educationItemSchema = z.object({
  institution: z.string().default('Unknown'),
  degree: z.string().default('Unknown'),
  field: z.string().nullable().default(null),
  startYear: z.union([z.string(), z.number()]).nullable().default(null),
  endYear: z.union([z.string(), z.number()]).nullable().default(null),
  grade: z.string().nullable().default(null)
});

export const experienceItemSchema = z.object({
  company: z.string().default('Unknown'),
  role: z.string().default('Unknown'),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([])
});

export const projectItemSchema = z.object({
  name: z.string().default('Untitled Project'),
  description: z.string().nullable().default(null),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([])
});

export const resumeParserOutputSchema = z.object({
  name: z.string().default('Candidate'),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  links: z.array(z.string()).default([]),
  summary: z.string().nullable().default(null),
  education: z.array(educationItemSchema).default([]),
  experience: z.array(experienceItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  skillsListed: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([])
});

/**
 * Stage 2: Skills Analysis Agent Output Schema
 */
export const skillItemSchema = z.object({
  name: z.string(),
  category: z.preprocess((val) => {
    const valid = ['language', 'frontend', 'backend', 'database', 'ai_ml', 'cloud_tools', 'core_cs', 'soft', 'other'];
    if (typeof val === 'string' && !valid.includes(val.toLowerCase())) return 'other';
    return val;
  }, z.enum([
    'language',
    'frontend',
    'backend',
    'database',
    'ai_ml',
    'cloud_tools',
    'core_cs',
    'soft',
    'other'
  ])).default('other'),
  proficiency: z.preprocess((val) => {
    const valid = ['beginner', 'intermediate', 'advanced', 'unknown'];
    if (typeof val === 'string' && !valid.includes(val.toLowerCase())) return 'unknown';
    return val;
  }, z.enum(['beginner', 'intermediate', 'advanced', 'unknown'])).default('unknown'),
  evidence: z.preprocess((val) => (val === null || val === undefined ? 'Mentioned in resume' : String(val)), z.string()).default('Mentioned in resume'),
  source: z.preprocess((val) => {
    const valid = ['experience', 'project', 'education', 'skills_section'];
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'listed') return 'skills_section';
      if (!valid.includes(lower)) return 'skills_section';
      return lower;
    }
    return val;
  }, z.enum(['experience', 'project', 'education', 'skills_section'])).default('skills_section')
});

export const requirementMatchSchema = z.object({
  requirement: z.string(),
  type: z.enum(['required', 'preferred']).default('required'),
  status: z.enum(['match', 'partial', 'missing']).default('partial'),
  evidence: z.string().nullable().default(null),
  reasoning: z.string().default('')
});

export const skillsAnalysisOutputSchema = z.object({
  jobRequirements: z.object({
    required: z.array(z.string()).default([]),
    preferred: z.array(z.string()).default([]),
    experienceLevel: z.string().nullable().default(null)
  }),
  skills: z.array(skillItemSchema).default([]),
  requirementMatches: z.array(requirementMatchSchema).default([]),
  summary: z.string().default('')
});

/**
 * Stage 3: Candidate Scoring Schemas
 */
export const scoreBreakdownItemSchema = z.object({
  component: z.string(),
  weight: z.number(),
  earned: z.number(),
  explanation: z.string()
});

export const strengthItemSchema = z.object({
  point: z.string(),
  evidence: z.string()
});

export const gapItemSchema = z.object({
  point: z.string(),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  evidence: z.string().nullable().default(null)
});

export const scoringLLMExplanationSchema = z.object({
  strengths: z.array(strengthItemSchema).default([]),
  gaps: z.array(gapItemSchema).default([]),
  scoreExplanation: z.string().default('')
});

export const fullScoringOutputSchema = z.object({
  totalScore: z.number().min(0).max(100),
  breakdown: z.array(scoreBreakdownItemSchema),
  strengths: z.array(strengthItemSchema).default([]),
  gaps: z.array(gapItemSchema).default([]),
  scoreExplanation: z.string().default('')
});

/**
 * Stage 4: Interview Question Agent Output Schema
 */
export const technicalQuestionSchema = z.object({
  question: z.string(),
  targetSkill: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  reason: z.string(),
  whatToLookFor: z.string()
});

export const projectQuestionSchema = z.object({
  question: z.string(),
  relatedProject: z.string(),
  reason: z.string(),
  whatToLookFor: z.string()
});

export const behavioralQuestionSchema = z.object({
  question: z.string(),
  reason: z.string()
});

export const gapProbingQuestionSchema = z.object({
  question: z.string(),
  relatedGap: z.string(),
  reason: z.string()
});

export const interviewQuestionsOutputSchema = z.object({
  technical: z.array(technicalQuestionSchema).default([]),
  projectBased: z.array(projectQuestionSchema).default([]),
  behavioral: z.array(behavioralQuestionSchema).default([]),
  gapProbing: z.array(gapProbingQuestionSchema).default([])
});

/**
 * Stage 5: Hiring Recommendation Agent Output Schema
 */
export const recommendationOutputSchema = z.object({
  recommendation: z.enum(['Hire', 'Maybe', 'No']),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  reasoning: z.string(),
  keyRisks: z.array(z.string()).default([]),
  suggestedNextSteps: z.array(z.string()).default([]),
  disclaimer: z.string().default(
    'This AI-generated recommendation is advisory only. Hiring decisions must be made by qualified human recruiters.'
  )
});

/**
 * Stage 6: Report Assembler Schema
 */
export const finalReportSchema = z.object({
  candidateSummary: z.object({
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    headline: z.string().nullable(),
    overview: z.string()
  }),
  identifiedSkills: z.array(skillItemSchema),
  jobMatchResults: z.object({
    jobRequirements: z.object({
      required: z.array(z.string()),
      preferred: z.array(z.string()),
      experienceLevel: z.string().nullable()
    }),
    requirementMatches: z.array(requirementMatchSchema)
  }),
  scoreAndBreakdown: z.object({
    totalScore: z.number(),
    breakdown: z.array(scoreBreakdownItemSchema),
    scoreExplanation: z.string()
  }),
  strengths: z.array(strengthItemSchema),
  skillGaps: z.array(gapItemSchema),
  interviewQuestions: interviewQuestionsOutputSchema,
  recommendation: recommendationOutputSchema,
  resumeIntegrity: z.lazy(() => resumeIntegrityOutputSchema).optional().nullable(),
  workflowTrace: z.object({
    totalDurationMs: z.number(),
    provider: z.string().optional(),
    model: z.string().optional(),
    fallbackUsed: z.boolean().optional(),
    stages: z.array(z.object({
      key: z.string(),
      name: z.string(),
      status: z.string(),
      durationMs: z.number(),
      provider: z.string().nullable().optional(),
      model: z.string().nullable().optional(),
      fallbackUsed: z.boolean().optional()
    }))
  }),
  disclaimer: z.string()
});


/**
 * Isolated Resume Integrity Analysis Output Schema
 */
export const integrityFlagSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'high']),
  title: z.string(),
  explanation: z.string(),
  evidence: z.array(z.string()).default([]),
  affectedSkills: z.array(z.string()).default([])
});

export const resumeIntegrityMetricsSchema = z.object({
  totalWords: z.number().int().nonnegative(),
  uniqueWordRatio: z.number().min(0).max(1),
  repeatedTermRatio: z.number().min(0).max(1),
  jdPhraseOverlapRatio: z.number().min(0).max(1),
  unsupportedSkillRatio: z.number().min(0).max(1),
  promptInjectionIndicatorCount: z.number().int().nonnegative(),
  genericPhraseCount: z.number().int().nonnegative()
});

export const resumeIntegrityOutputSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(100),
  reviewRequired: z.boolean(),
  metrics: resumeIntegrityMetricsSchema,
  flags: z.array(integrityFlagSchema).default([]),
  summary: z.string(),
  limitations: z.array(z.string()).default([])
});
