import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { repairTruncatedJSON, llmService, LLMProviderError } from '../services/llm.service.js';
import {
  resumeParserOutputSchema,
  recommendationOutputSchema,
  skillsAnalysisOutputSchema
} from '../validators/agentSchemas.js';
import resumeParserAgent, { isProfileRawComplete } from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent, { isSkillsAnalysisRawComplete } from '../agents/skillsAnalysis.agent.js';
import scoringAgent from '../agents/scoring.agent.js';

describe('JSON Repair Completeness & Mock Fallback Safety Suite', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.TALENTFLOW_DEMO_MODE;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  describe('1. repairTruncatedJSON Syntactic Safety', () => {
    it('1. returns complete valid JSON unchanged', () => {
      const input = JSON.stringify({
        name: 'Jane Doe',
        skills: ['TypeScript', 'Node.js'],
        yearsOfExperience: 5
      });
      const result = repairTruncatedJSON(input);
      expect(result).toEqual({
        name: 'Jane Doe',
        skills: ['TypeScript', 'Node.js'],
        yearsOfExperience: 5
      });
    });

    it('2. repairs unclosed string gracefully', () => {
      const truncated = '{"name": "Jane Doe", "summary": "Senior software engineer with deep experi';
      const result = repairTruncatedJSON(truncated);
      expect(result).not.toBeNull();
      expect(result.name).toBe('Jane Doe');
      expect(result.summary).toContain('Senior software engineer');
    });

    it('3. repairs unclosed array', () => {
      const truncated = '{"name": "Jane Doe", "skills": ["React", "Vitest", "TypeScript"';
      const result = repairTruncatedJSON(truncated);
      expect(result).not.toBeNull();
      expect(result.name).toBe('Jane Doe');
      expect(Array.isArray(result.skills)).toBe(true);
      expect(result.skills).toEqual(['React', 'Vitest', 'TypeScript']);
    });

    it('4. repairs unclosed object', () => {
      const truncated = '{"name": "Jane Doe", "contact": {"email": "jane@example.com", "phone": "1234"';
      const result = repairTruncatedJSON(truncated);
      expect(result).not.toBeNull();
      expect(result.name).toBe('Jane Doe');
      expect(result.contact.email).toBe('jane@example.com');
      expect(result.contact.phone).toBe('1234');
    });

    it('5. repairs deeply truncated nested objects and arrays', () => {
      const truncated = '{"name": "Alex", "experience": [{"company": "Acme Corp", "roles": [{"title": "Lead", "bullets": ["Built pipeline';
      const result = repairTruncatedJSON(truncated);
      expect(result).not.toBeNull();
      expect(result.name).toBe('Alex');
      expect(result.experience[0].company).toBe('Acme Corp');
      expect(result.experience[0].roles[0].title).toBe('Lead');
      expect(result.experience[0].roles[0].bullets).toEqual(['Built pipeline']);
    });

    it('6. safely parses markdown-wrapped JSON code blocks', () => {
      const markdownJson = '```json\n{"recommendation": "Hire", "confidence": "high"}\n```';
      const result = repairTruncatedJSON(markdownJson);
      expect(result).toEqual({ recommendation: 'Hire', confidence: 'high' });
    });

    it('7. safely handles malicious partial JSON without prototype pollution', () => {
      const malicious = '{"__proto__": {"isAdmin": true}, "name": "Eve"';
      const result = repairTruncatedJSON(malicious);
      expect(result).not.toBeNull();
      const cleanObj = {};
      expect(cleanObj.isAdmin).toBeUndefined();
    });

    it('8. returns null on totally unparseable garbage or non-JSON text', () => {
      expect(repairTruncatedJSON('just some plain text without brackets')).toBeNull();
      expect(repairTruncatedJSON('')).toBeNull();
      expect(repairTruncatedJSON(null)).toBeNull();
      expect(repairTruncatedJSON(undefined)).toBeNull();
      expect(repairTruncatedJSON(12345)).toBeNull();
    });

    it('9. never fabricates candidate information or invents fields not in the input', () => {
      const partial = '{"name": "Sam"';
      const result = repairTruncatedJSON(partial);
      expect(result).toEqual({ name: 'Sam' });
      expect(result.skills).toBeUndefined();
      expect(result.experience).toBeUndefined();
      expect(result.totalScore).toBeUndefined();
    });
  });

  describe('2. Repaired JSON Completeness & Clean Retry Enforcement', () => {
    it('10. isProfileRawComplete detects truncated profiles missing experience or projects', () => {
      // Profile that stopped before experience section
      const truncatedProfile = {
        name: 'Alice',
        skillsListed: ['Python', 'Docker']
      };
      expect(isProfileRawComplete(truncatedProfile)).toBe(false);

      // Complete profile containing all required structural sections (even if empty)
      const completeProfile = {
        name: 'Alice',
        skillsListed: ['Python'],
        experience: [],
        education: [],
        projects: []
      };
      expect(isProfileRawComplete(completeProfile)).toBe(true);
    });

    it('11. isSkillsAnalysisRawComplete detects missing analytical keys', () => {
      const truncatedSkills = {
        jobRequirements: { required: ['Node.js'], preferred: [], experienceLevel: null }
      };
      expect(isSkillsAnalysisRawComplete(truncatedSkills)).toBe(false);

      const completeSkills = {
        jobRequirements: { required: ['Node.js'], preferred: [], experienceLevel: null },
        skills: [],
        requirementMatches: [],
        summary: 'Matches all requirements.'
      };
      expect(isSkillsAnalysisRawComplete(completeSkills)).toBe(true);
    });

    it('12. resumeParser: truncated profile followed by valid clean retry succeeds', async () => {
      const firstTruncatedResponse = {
        name: 'Taylor Swift',
        summary: 'Developer'
        // Missing experience, education, projects, skillsListed due to truncation
      };

      const secondCleanResponse = {
        name: 'Taylor Swift',
        summary: 'Full-stack Developer',
        email: 'taylor@example.com',
        phone: null,
        links: [],
        education: [{ institution: 'State University', degree: 'BS Computer Science', field: null, startYear: null, endYear: null, grade: null }],
        experience: [{ company: 'Tech Inc', role: 'Software Engineer', startDate: null, endDate: null, description: null, highlights: ['Built APIs'] }],
        projects: [{ name: 'App', description: null, technologies: ['Node.js'], highlights: [] }],
        skillsListed: ['Node.js', 'React'],
        achievements: []
      };

      let callCount = 0;
      vi.spyOn(llmService, 'generateStructuredJSON').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Simulate truncation repair metadata on first response
          llmService.lastMetadata = {
            provider: 'mock',
            model: 'mock-model',
            fallbackUsed: false,
            repairedTruncation: true,
            rawOutputComplete: false
          };
          return firstTruncatedResponse;
        }
        // Clean non-truncated retry
        llmService.lastMetadata = {
          provider: 'mock',
          model: 'mock-model',
          fallbackUsed: false,
          repairedTruncation: false,
          rawOutputComplete: true
        };
        return secondCleanResponse;
      });

      const output = await resumeParserAgent.run({
        rawText: 'Taylor Swift - Software Engineer at Tech Inc',
        provider: 'mock'
      });

      expect(callCount).toBe(2);
      expect(output.name).toBe('Taylor Swift');
      expect(output.experience.length).toBe(1);
      expect(output.skillsListed).toContain('Node.js');
    });

    it('13. resumeParser: truncated profile followed by incomplete retry fails explicitly', async () => {
      const incompleteResponse = {
        name: 'Taylor Swift',
        summary: 'Developer'
        // Missing experience and projects
      };

      vi.spyOn(llmService, 'generateStructuredJSON').mockImplementation(async () => {
        llmService.lastMetadata = {
          provider: 'mock',
          model: 'mock-model',
          fallbackUsed: false,
          repairedTruncation: true,
          rawOutputComplete: false
        };
        return incompleteResponse;
      });

      await expect(
        resumeParserAgent.run({
          rawText: 'Taylor Swift resume text',
          provider: 'mock'
        })
      ).rejects.toThrow(/clean retry failed|Response remained truncated/);
    });

    it('14. skillsAnalysis: truncated output followed by incomplete retry fails explicitly', async () => {
      const truncatedSkills = {
        jobRequirements: { required: ['Node.js'], preferred: [], experienceLevel: null }
        // Missing skills, requirementMatches, summary
      };

      vi.spyOn(llmService, 'generateStructuredJSON').mockImplementation(async () => {
        llmService.lastMetadata = {
          provider: 'mock',
          model: 'mock-model',
          fallbackUsed: false,
          repairedTruncation: true,
          rawOutputComplete: false
        };
        return truncatedSkills;
      });

      await expect(
        skillsAnalysisAgent.run({
          profile: {
            name: 'Candidate',
            email: null,
            phone: null,
            links: [],
            summary: null,
            education: [],
            experience: [],
            projects: [],
            skillsListed: ['Node.js'],
            achievements: []
          },
          jobDescription: 'Looking for a Node.js developer',
          provider: 'mock'
        })
      ).rejects.toThrow(/clean retry failed/);
    });
  });

  describe('3. Production Fallback Restriction & Score Protection', () => {
    it('15. NODE_ENV=production strictly throws when LLM_ALLOW_MOCK_FALLBACK=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'true';

      expect(() => llmService.allowMockFallback).toThrow(/Mock fallback is not permitted in production/);
    });

    it('16. LLM_ALLOW_MOCK_FALLBACK is false in non-production unless TALENTFLOW_DEMO_MODE=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'true';
      delete process.env.TALENTFLOW_DEMO_MODE;

      // Without explicit TALENTFLOW_DEMO_MODE=true, fallback remains false
      expect(llmService.allowMockFallback).toBe(false);

      process.env.TALENTFLOW_DEMO_MODE = 'true';
      expect(llmService.allowMockFallback).toBe(true);
    });

    it('17. throws explicit LLMProviderError when live provider fails and fallback is disabled', async () => {
      process.env.NODE_ENV = 'development';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'false';
      delete process.env.TALENTFLOW_DEMO_MODE;
      process.env.OPENAI_API_KEY = 'invalid-dummy-key-for-test';

      await expect(
        llmService.generateStructuredJSON({
          agentName: 'resumeParser',
          systemPrompt: 'Return json',
          userPrompt: 'Parse resume',
          provider: 'openai',
          model: 'gpt-4.1-mini'
        })
      ).rejects.toThrow();

      const meta = llmService.getLastMetadata();
      expect(meta?.fallbackUsed).not.toBe(true);
    });

    it('18. explicit Mock Mode (LLM_PROVIDER=mock) still completes without network calls', async () => {
      process.env.LLM_PROVIDER = 'mock';
      process.env.LLM_MOCK = 'true';

      const res = await llmService.generateStructuredJSON({
        agentName: 'resumeParser',
        systemPrompt: 'Return json',
        userPrompt: 'Jane Doe',
        context: { rawText: 'Jane Doe - Python Engineer' },
        provider: 'mock',
        model: 'mock-deterministic'
      });

      expect(res).toBeDefined();
      expect(res.name).toContain('Jane Doe');
      const meta = llmService.getLastMetadata();
      expect(meta.provider).toBe('mock');
      expect(meta.fallbackUsed).toBe(false);
      expect(meta.rawOutputComplete).toBe(true);
    });

    it('19. capability scoring strictly refuses to consume mock output resulting from live provider failure', async () => {
      const mockProfileWithFallbackFlag = {
        name: 'Compromised Profile',
        email: null,
        phone: null,
        links: [],
        summary: null,
        education: [],
        experience: [],
        projects: [],
        skillsListed: ['Python'],
        achievements: [],
        _isSyntheticMock: true // Flag indicating upstream live failure fell back to mock
      };

      const skillsAnalysis = {
        jobRequirements: { required: ['Python'], preferred: [], experienceLevel: null },
        skills: [{ name: 'Python', category: 'language', proficiency: 'advanced', evidence: 'Mentioned', source: 'skills_section' }],
        requirementMatches: [{ requirement: 'Python', type: 'required', status: 'match', evidence: 'Python', reasoning: 'Match' }],
        summary: 'Matches Python'
      };

      // In a live workflow run (provider='openai'), scoring MUST reject mock output
      await expect(
        scoringAgent.run({
          profile: mockProfileWithFallbackFlag,
          skillsAnalysis,
          jobDescription: 'Python dev needed',
          provider: 'openai',
          model: 'gpt-4.1-mini'
        })
      ).rejects.toThrow(/Capability scoring rejected: Upstream stage received synthetic mock data/);
    });
  });
});
