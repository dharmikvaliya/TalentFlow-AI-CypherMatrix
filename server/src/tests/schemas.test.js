import { describe, it, expect } from 'vitest';
import {
  resumeParserOutputSchema,
  skillsAnalysisOutputSchema,
  fullScoringOutputSchema,
  interviewQuestionsOutputSchema,
  recommendationOutputSchema,
  createRunSchema
} from '../validators/index.js';

describe('Zod Schema Validation Tests', () => {
  it('validates a complete resume parser output', () => {
    const validProfile = {
      name: 'Alex Johnson',
      email: 'alex.j@example.com',
      phone: '+1-555-0199',
      links: ['https://github.com/alexj'],
      summary: 'Experienced Full Stack Engineer with 4 years building web apps.',
      education: [
        {
          institution: 'State University',
          degree: 'B.S.',
          field: 'Computer Science',
          startYear: 2018,
          endYear: 2022,
          grade: '3.8 GPA'
        }
      ],
      experience: [
        {
          company: 'TechCorp',
          role: 'Software Engineer',
          startDate: '2022-06',
          endDate: 'Present',
          description: 'Built scalable microservices.',
          highlights: ['Improved latency by 35%']
        }
      ],
      projects: [
        {
          name: 'TalentPortal',
          description: 'Recruitment automation app',
          technologies: ['React', 'Node.js', 'MongoDB'],
          highlights: ['Processed 10,000 resumes']
        }
      ],
      skillsListed: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
      achievements: ['Dean\'s List 2021']
    };

    const parsed = resumeParserOutputSchema.safeParse(validProfile);
    expect(parsed.success).toBe(true);
  });

  it('handles missing/null fields gracefully with defaults', () => {
    const minimalProfile = {
      name: 'Jane Doe'
    };
    const parsed = resumeParserOutputSchema.safeParse(minimalProfile);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.education).toEqual([]);
      expect(parsed.data.email).toBeNull();
      expect(parsed.data.links).toEqual([]);
    }
  });

  it('validates skills analysis output with categories and evidence', () => {
    const skillsData = {
      jobRequirements: {
        required: ['React', 'Node.js'],
        preferred: ['Docker', 'AWS'],
        experienceLevel: 'Mid-level'
      },
      skills: [
        {
          name: 'React',
          category: 'frontend',
          proficiency: 'advanced',
          evidence: 'Built responsive UI dashboards using React 18',
          source: 'project'
        }
      ],
      requirementMatches: [
        {
          requirement: 'React',
          type: 'required',
          status: 'match',
          evidence: 'Built responsive UI dashboards using React 18',
          reasoning: 'Strong demonstrable frontend experience'
        }
      ],
      summary: 'Candidate shows strong frontend alignment.'
    };

    const parsed = skillsAnalysisOutputSchema.safeParse(skillsData);
    expect(parsed.success).toBe(true);
  });

  it('validates hiring recommendation schema and guards against invalid recommendation values', () => {
    const validRec = {
      recommendation: 'Hire',
      confidence: 'high',
      reasoning: 'Exceeds all core criteria with verified project evidence.',
      keyRisks: ['No production Docker experience'],
      suggestedNextSteps: ['Conduct technical deep dive on distributed caching'],
      disclaimer: 'Advisory only. Human recruiter decision required.'
    };
    expect(recommendationOutputSchema.safeParse(validRec).success).toBe(true);

    const invalidRec = {
      recommendation: 'DefinitelyHire', // Invalid enum
      confidence: 'high',
      reasoning: 'Super star'
    };
    expect(recommendationOutputSchema.safeParse(invalidRec).success).toBe(false);
  });

  it('validates create run request schema', () => {
    const validRequest = {
      candidateId: '65f1234567890abcdef12345',
      jobDescription: 'Looking for a Senior Full Stack Engineer with 3+ years of React and Node.js experience.'
    };
    expect(createRunSchema.safeParse(validRequest).success).toBe(true);

    const tooShortJD = {
      candidateId: '123',
      jobDescription: 'Short'
    };
    expect(createRunSchema.safeParse(tooShortJD).success).toBe(false);
  });
});
