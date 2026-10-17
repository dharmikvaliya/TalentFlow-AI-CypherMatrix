import { describe, it, expect } from 'vitest';
import { calculateDeterministicScore, SCORING_RUBRIC } from '../config/scoringRubric.js';

describe('Step 2: Scoring Engine Systematic Unit Tests (MOCK MODE)', () => {
  it('ensures rubric weights sum to exactly 100 points', () => {
    const totalWeight = Object.values(SCORING_RUBRIC).reduce((sum, item) => sum + item.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('guarantees score is always bounded between 0 and 100 for all edge inputs', () => {
    const edgeCases = [
      { requirementMatches: [], profile: {} },
      {
        requirementMatches: [
          { requirement: 'A', type: 'required', status: 'missing' },
          { requirement: 'B', type: 'preferred', status: 'missing' }
        ],
        profile: { experience: [], projects: [], education: [] }
      },
      {
        requirementMatches: Array.from({ length: 50 }, (_, i) => ({
          requirement: `Req ${i}`,
          type: 'required',
          status: 'match'
        })),
        profile: {
          experience: [{ company: 'A' }, { company: 'B' }, { company: 'C' }],
          projects: [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }],
          education: [{ degree: 'B.S.', field: 'Computer Science' }]
        }
      }
    ];

    edgeCases.forEach(({ requirementMatches, profile }) => {
      const result = calculateDeterministicScore({ requirementMatches, profile });
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.totalScore)).toBe(true);
      expect(Number.isNaN(result.totalScore)).toBe(false);
    });
  });

  it('verifies score monotonicity: more matched required skills never lowers the score', () => {
    const baseProfile = {
      experience: [{ company: 'Tech Inc', role: 'SWE' }],
      projects: [{ name: 'Portfolio App' }],
      education: [{ degree: 'B.S.', field: 'Computer Science' }]
    };

    // Case 1: 0 matches (all missing)
    const score0 = calculateDeterministicScore({
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'missing' },
        { requirement: 'Node', type: 'required', status: 'missing' },
        { requirement: 'MongoDB', type: 'required', status: 'missing' }
      ],
      profile: baseProfile
    }).totalScore;

    // Case 2: 1 partial match
    const score1 = calculateDeterministicScore({
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'partial' },
        { requirement: 'Node', type: 'required', status: 'missing' },
        { requirement: 'MongoDB', type: 'required', status: 'missing' }
      ],
      profile: baseProfile
    }).totalScore;

    // Case 3: 1 full match
    const score2 = calculateDeterministicScore({
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'match' },
        { requirement: 'Node', type: 'required', status: 'missing' },
        { requirement: 'MongoDB', type: 'required', status: 'missing' }
      ],
      profile: baseProfile
    }).totalScore;

    // Case 4: 2 full matches
    const score3 = calculateDeterministicScore({
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'match' },
        { requirement: 'Node', type: 'required', status: 'match' },
        { requirement: 'MongoDB', type: 'required', status: 'missing' }
      ],
      profile: baseProfile
    }).totalScore;

    // Case 5: 3 full matches
    const score4 = calculateDeterministicScore({
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'match' },
        { requirement: 'Node', type: 'required', status: 'match' },
        { requirement: 'MongoDB', type: 'required', status: 'match' }
      ],
      profile: baseProfile
    }).totalScore;

    expect(score1).toBeGreaterThanOrEqual(score0);
    expect(score2).toBeGreaterThanOrEqual(score1);
    expect(score3).toBeGreaterThanOrEqual(score2);
    expect(score4).toBeGreaterThanOrEqual(score3);
  });

  it('safely handles empty requirements without causing NaN or division by zero', () => {
    const result = calculateDeterministicScore({
      requirementMatches: [],
      profile: {
        experience: [{ company: 'Acme Corp' }],
        projects: [{ name: 'Project Alpha' }],
        education: [{ degree: 'B.S.', field: 'Computer Science' }]
      }
    });

    expect(result.totalScore).toBeGreaterThan(0);
    expect(Number.isNaN(result.totalScore)).toBe(false);
    expect(result.breakdown).toHaveLength(5);
    result.breakdown.forEach(b => {
      expect(Number.isNaN(b.earned)).toBe(false);
      expect(Number.isFinite(b.earned)).toBe(true);
    });
  });

  it('calculates deterministic expected points for candidate with fixed criteria', () => {
    const requirementMatches = [
      { requirement: 'React', type: 'required', status: 'match' },
      { requirement: 'Node.js', type: 'required', status: 'match' },
      { requirement: 'MongoDB', type: 'preferred', status: 'match' }
    ];

    const profile = {
      experience: [
        { company: 'Company A', role: 'Full Stack Engineer' },
        { company: 'Company B', role: 'Software Engineer' }
      ],
      projects: [
        { name: 'App 1' },
        { name: 'App 2' }
      ],
      education: [
        { degree: 'B.S.', field: 'Computer Science' }
      ]
    };

    const result = calculateDeterministicScore({ requirementMatches, profile });

    // Required: 2/2 = 100% of 40 = 40
    // Preferred: 1/1 = 100% of 15 = 15
    // Experience: 2 exp = 20
    // Projects: 2 proj = 15
    // Education: CS degree = 10
    // Total = 40 + 15 + 20 + 15 + 10 = 100
    expect(result.totalScore).toBe(100);
  });
});
