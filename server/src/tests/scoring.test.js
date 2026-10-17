import { describe, it, expect } from 'vitest';
import { calculateDeterministicScore, SCORING_RUBRIC } from '../config/scoringRubric.js';
import recommendationAgent from '../agents/recommendation.agent.js';

describe('Deterministic Scoring Rubric Tests', () => {
  it('has component weights that sum to exactly 100 points', () => {
    const totalWeight = Object.values(SCORING_RUBRIC).reduce((sum, item) => sum + item.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('calculates top tier score for candidate matching all requirements', () => {
    const requirementMatches = [
      { requirement: 'React & Vite', type: 'required', status: 'match' },
      { requirement: 'Node.js & Express', type: 'required', status: 'match' },
      { requirement: 'MongoDB', type: 'required', status: 'match' },
      { requirement: 'Docker', type: 'preferred', status: 'match' },
      { requirement: 'RAG / Vector search', type: 'preferred', status: 'match' }
    ];

    const profile = {
      experience: [
        { company: 'Company A', role: 'SWE' },
        { company: 'Company B', role: 'SWE Intern' }
      ],
      projects: [
        { name: 'Project 1' },
        { name: 'Project 2' }
      ],
      education: [
        { degree: 'B.S.', field: 'Computer Science' }
      ]
    };

    const result = calculateDeterministicScore({ requirementMatches, profile });

    expect(result.totalScore).toBe(100);
    expect(result.breakdown).toHaveLength(5);
    
    // Check required skills component earned full 40 points
    const reqComponent = result.breakdown.find(b => b.component === SCORING_RUBRIC.requiredSkills.name);
    expect(reqComponent.earned).toBe(40);

    // Check preferred skills component earned full 15 points
    const prefComponent = result.breakdown.find(b => b.component === SCORING_RUBRIC.preferredSkills.name);
    expect(prefComponent.earned).toBe(15);
  });

  it('calculates mid-tier score for candidate with partial matches and fewer projects', () => {
    const requirementMatches = [
      { requirement: 'React', type: 'required', status: 'match' },
      { requirement: 'Node.js', type: 'required', status: 'partial' },
      { requirement: 'MongoDB', type: 'required', status: 'missing' },
      { requirement: 'Docker', type: 'preferred', status: 'missing' }
    ];

    const profile = {
      experience: [
        { company: 'Company A', role: 'SWE' }
      ],
      projects: [
        { name: 'Project 1' }
      ],
      education: [
        { degree: 'B.A.', field: 'Economics' }
      ]
    };

    const result = calculateDeterministicScore({ requirementMatches, profile });

    // Required: (1 + 0.5 + 0) / 3 = 1.5/3 = 50% * 40 = 20 pts
    // Preferred: 0 / 1 = 0 pts
    // Experience (1 exp): 16 pts
    // Projects (1 proj): 11 pts
    // Education (non-CS): 7.5 pts
    // Total: 20 + 0 + 16 + 11 + 7.5 = 54.5 -> ~55 pts
    expect(result.totalScore).toBeGreaterThanOrEqual(50);
    expect(result.totalScore).toBeLessThan(65);
  });

  it('calculates low score for candidate with no matches and no experience', () => {
    const requirementMatches = [
      { requirement: 'React', type: 'required', status: 'missing' },
      { requirement: 'Node.js', type: 'required', status: 'missing' }
    ];

    const profile = {
      experience: [],
      projects: [],
      education: []
    };

    const result = calculateDeterministicScore({ requirementMatches, profile });

    // Should be low (< 30)
    expect(result.totalScore).toBeLessThan(30);
  });

  it('enforces score guardrail so a low score cannot yield a Hire recommendation', async () => {
    const lowScoringInput = {
      profile: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: null,
        links: [],
        summary: 'Entry seeker',
        education: [],
        experience: [],
        projects: [],
        skillsListed: [],
        achievements: []
      },
      skillsAnalysis: {
        jobRequirements: { required: ['React'], preferred: [], experienceLevel: null },
        skills: [],
        requirementMatches: [{ requirement: 'React', type: 'required', status: 'missing', evidence: null, reasoning: 'No experience' }],
        summary: 'No matches found.'
      },
      scoring: {
        totalScore: 25, // Score under 45!
        breakdown: [
          { component: 'Required Skills Match', weight: 40, earned: 0, explanation: '0% match' }
        ],
        strengths: [],
        gaps: [{ point: 'Missing core skills', severity: 'high', evidence: null }],
        scoreExplanation: 'Score is 25/100'
      },
      interviewQuestions: {
        technical: [],
        projectBased: [],
        behavioral: [],
        gapProbing: []
      }
    };

    const rec = await recommendationAgent.run(lowScoringInput);
    // Even if LLM attempted to say Hire, guardrail strictly forces it to No
    expect(rec.recommendation).not.toBe('Hire');
    expect(rec.disclaimer).toBeTruthy();
  });
});
