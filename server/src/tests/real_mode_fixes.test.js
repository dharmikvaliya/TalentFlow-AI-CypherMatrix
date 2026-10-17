import { describe, it, expect, vi, beforeEach } from 'vitest';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';
import scoringAgent from '../agents/scoring.agent.js';
import recommendationAgent from '../agents/recommendation.agent.js';
import { calculateDeterministicScore, parseJdExperienceRequirements, estimateCandidateExperience } from '../config/scoringRubric.js';
import { assembleFinalReport, generateMarkdownReport } from '../report/reportAssembler.js';
import { getMockSkillsAnalysisResponse } from '../services/mockResponses.js';

describe('Real-Mode Fixes & Validation Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. JD Flow: Two different JDs produce different jobRequirements
  it('JD Flow: two different JDs produce completely different jobRequirements without caching or defaults', () => {
    const candidateProfile = {
      name: 'Alex Morgan',
      summary: 'Computer Engineering student skilled in MERN and RAG.',
      education: [{ institution: 'GEC Modasa', degree: 'B.E.', field: 'Computer Engineering' }],
      experience: [{ company: 'Apna College', role: 'Apprentice', description: 'Web development' }],
      projects: [{ name: 'SigmaGPT', technologies: ['React', 'Node.js'] }],
      skillsListed: ['JavaScript', 'Python', 'React', 'Node.js', 'MongoDB']
    };

    const devOpsJd = `Job Title: Senior DevOps Engineer\nRequired Qualifications:\n- 5+ years of hands-on experience in DevOps\n- Deep expertise in Kubernetes and Helm\n- Infrastructure as Code with Terraform`;
    const dataJd = `Job Title: Junior Data Engineer\nRequired Qualifications:\n- Proficiency in Python and SQL for data querying\n- Experience with relational and NoSQL databases\n- Bachelor degree in Computer Science`;

    const devOpsAnalysis = getMockSkillsAnalysisResponse(candidateProfile, devOpsJd);
    const dataAnalysis = getMockSkillsAnalysisResponse(candidateProfile, dataJd);

    expect(devOpsAnalysis.jobRequirements.required).not.toEqual(dataAnalysis.jobRequirements.required);
    expect(devOpsAnalysis.jobRequirements.required[1]).toContain('Kubernetes');
    expect(dataAnalysis.jobRequirements.required[0]).toContain('Python');
    expect(devOpsAnalysis.jobRequirements.required).not.toContain('Proficiency in JavaScript/TypeScript, Node.js, and Express (ES modules)');
  });

  // 2. Grounding: A match with an unverified citation is downgraded to "missing"
  it('Grounding: requirement match with ungrounded citation is downgraded to missing and never allowed as match', async () => {
    const rawResumeText = 'Alex Morgan. Skills: Java, JavaScript, Python, React.js, Node.js, Express.js, MongoDB.';
    const profile = {
      name: 'Alex Morgan',
      education: [],
      experience: [],
      projects: [],
      skillsListed: ['Java', 'JavaScript', 'Python', 'React.js', 'Node.js', 'Express.js', 'MongoDB']
    };

    // Ensure llmService is mocked to return the test response

    const mockLlmResponse = {
      jobRequirements: {
        required: ['Production Docker container orchestration experience'],
        preferred: [],
        experienceLevel: 'Senior'
      },
      skills: [
        {
          name: 'Docker',
          category: 'cloud_tools',
          proficiency: 'advanced',
          evidence: 'Docker multi-stage builds and swarm cluster management across 50 nodes', // Fabricated quote
          source: 'experience'
        }
      ],
      requirementMatches: [
        {
          requirement: 'Production Docker container orchestration experience',
          type: 'required',
          status: 'match', // LLM claims match
          evidence: 'Docker multi-stage builds and swarm cluster management across 50 nodes', // Fabricated quote
          reasoning: 'Candidate has extensive containerization experience.'
        }
      ],
      summary: 'Candidate claims Docker experience.'
    };

    // Use llmService mock
    const llmService = (await import('../services/llm.service.js')).default;
    vi.spyOn(llmService, 'generateStructuredJSON').mockResolvedValue(mockLlmResponse);

    const result = await skillsAnalysisAgent.run({
      profile,
      jobDescription: 'Required: Production Docker container orchestration experience',
      rawText: rawResumeText
    });

    const match = result.requirementMatches[0];
    // Must NOT be match!
    expect(match.status).not.toBe('match');
    expect(match.status).toBe('missing');
    expect(match.isGrounded).toBe(false);
    expect(match.reasoning).toContain('Downgraded to missing');
  });

  // 3. Missing means missing: "easy to learn" is rejected and downgraded
  it('Missing means missing: "easy to learn" reasoning is rejected and downgraded to missing', async () => {
    const rawResumeText = 'Alex Morgan. Skills: React, Node.js.';
    const profile = {
      name: 'Alex Morgan',
      education: [],
      experience: [],
      projects: [],
      skillsListed: ['React', 'Node.js']
    };

    const mockLlmResponse = {
      jobRequirements: {
        required: ['Runtime schema validation with Zod'],
        preferred: [],
        experienceLevel: 'Entry-level'
      },
      skills: [],
      requirementMatches: [
        {
          requirement: 'Runtime schema validation with Zod',
          type: 'required',
          status: 'partial',
          evidence: null,
          reasoning: 'Candidate does not list Zod, but Zod is easy to learn given their TypeScript and JavaScript background.'
        }
      ],
      summary: 'Evaluation.'
    };

    const llmService = (await import('../services/llm.service.js')).default;
    vi.spyOn(llmService, 'generateStructuredJSON').mockResolvedValue(mockLlmResponse);

    const result = await skillsAnalysisAgent.run({
      profile,
      jobDescription: 'Required: Runtime schema validation with Zod',
      rawText: rawResumeText
    });

    const match = result.requirementMatches[0];
    expect(match.status).toBe('missing');
    expect(match.evidence).toBeNull();
  });

  // 4. Scoring numbers: narrative numbers must be consistent with computed score
  it('Scoring numbers: score narrative in scoring agent does not contradict totalScore', async () => {
    const profile = {
      name: 'Candidate',
      education: [{ institution: 'Uni', degree: 'B.S.', field: 'Computer Science' }],
      experience: [{ company: 'Tech', role: 'Dev', description: 'Coding' }],
      projects: [{ name: 'Project 1', technologies: ['React'] }],
      skillsListed: ['JavaScript']
    };

    const skillsAnalysis = {
      jobRequirements: { required: ['React'], preferred: [], experienceLevel: 'Mid' },
      skills: [],
      requirementMatches: [
        { requirement: 'React', type: 'required', status: 'match', evidence: 'React', reasoning: 'Verified' }
      ],
      summary: 'Skills verified'
    };

    // LLM claims an inconsistent hallucinated score of "98/100"
    const mockLlmResponse = {
      strengths: [{ point: 'Strong React knowledge', evidence: 'React' }],
      gaps: [{ point: 'Missing backend depth', severity: 'low', evidence: null }],
      scoreExplanation: 'The candidate achieved an outstanding score of 98/100 due to rare full-stack prowess.'
    };

    const llmService = (await import('../services/llm.service.js')).default;
    vi.spyOn(llmService, 'generateStructuredJSON').mockResolvedValue(mockLlmResponse);

    const scoringResult = await scoringAgent.run({
      profile,
      skillsAnalysis,
      jobDescription: 'Required: React'
    });

    // Score must be consistent, hallucinated 98/100 must be stripped or reconciled
    expect(scoringResult.scoreExplanation).not.toContain('98/100');
    expect(scoringResult.scoreExplanation).toContain(`${scoringResult.totalScore}/100`);
    expect(scoringResult.scoreExplanation).not.toContain('outstanding');
    expect(scoringResult.scoreExplanation).not.toContain('rare');
  });

  // 5. Experience fit: Senior JD (5+ years) reduces experience score for student/apprentice
  it('Experience fit: 5+ years Senior JD reduces experience score for candidate with a 4-month apprenticeship', () => {
    const studentProfile = {
      summary: 'Computer Engineering student with 4-month web apprenticeship.',
      experience: [
        {
          company: 'Apna College',
          role: 'Web Development Apprentice',
          startDate: 'Dec 2025',
          endDate: 'Apr 2026',
          description: 'Completed 4-month web development apprenticeship program'
        }
      ],
      projects: [{ name: 'P1' }, { name: 'P2' }],
      education: [{ degree: 'B.E.', field: 'Computer Engineering' }]
    };

    const seniorJd = `Job Title: Senior Infrastructure Architect\nRequired Qualifications:\n- 5+ years of experience in distributed cloud engineering\n- Deep Kubernetes mastery`;
    const entryJd = `Job Title: Junior Web Developer Intern\nRequired Qualifications:\n- Knowledge of JavaScript and web development`;

    const seniorScore = calculateDeterministicScore({
      requirementMatches: [],
      profile: studentProfile,
      jobDescription: seniorJd
    });

    const entryScore = calculateDeterministicScore({
      requirementMatches: [],
      profile: studentProfile,
      jobDescription: entryJd
    });

    const seniorExp = seniorScore.breakdown.find(b => b.component === 'Relevant Industry Experience');
    const entryExp = entryScore.breakdown.find(b => b.component === 'Relevant Industry Experience');

    // Senior role heavily penalizes student experience (4 pts) vs entry role (16 pts)
    expect(seniorExp.earned).toBe(4);
    expect(seniorExp.explanation).toContain('Heavy seniority gap');
    expect(entryExp.earned).toBe(16);
    expect(seniorScore.totalScore).toBeLessThan(entryScore.totalScore);
  });

  // 6. Recommendation: Cap confidence at medium for < 1 year experience & enforce guardrails
  it('Recommendation: caps confidence at medium when candidate has under 1 year of professional experience', async () => {
    const studentProfile = {
      name: 'Alex Morgan',
      summary: 'Computer Engineering student graduating 2027.',
      experience: [
        {
          company: 'Apna College',
          role: 'Web Development Apprentice',
          startDate: 'Dec 2025',
          endDate: 'Apr 2026'
        }
      ]
    };

    // LLM claims "high" confidence
    const mockLlmRec = {
      recommendation: 'Hire',
      confidence: 'high', // Should be capped at medium
      reasoning: 'Candidate demonstrates outstanding qualifications.',
      keyRisks: [],
      suggestedNextSteps: [],
      disclaimer: 'Advisory'
    };

    const llmService = (await import('../services/llm.service.js')).default;
    vi.spyOn(llmService, 'generateStructuredJSON').mockResolvedValue(mockLlmRec);

    const recResult = await recommendationAgent.run({
      profile: studentProfile,
      skillsAnalysis: { jobRequirements: { required: [], preferred: [] }, skills: [], requirementMatches: [] },
      scoring: { totalScore: 82, breakdown: [], strengths: [], gaps: [], scoreExplanation: '82/100' },
      interviewQuestions: { technical: [], projectBased: [], behavioral: [], gapProbing: [] },
      jobDescription: 'Full-stack AI intern'
    });

    expect(recResult.confidence).toBe('medium');
    expect(recResult.reasoning).not.toContain('outstanding');
  });

  // 7. Cosmetic: Fix duplicated "1." numbering and report stage status
  it('Cosmetic: removes duplicated 1. numbering in markdown lists and formats clean numbering', () => {
    const mockReport = {
      candidateSummary: { name: 'Alex Morgan', email: 'd@example.com', phone: null, headline: 'Dev', overview: 'Summary' },
      identifiedSkills: [],
      jobMatchResults: { jobRequirements: { required: [], preferred: [] }, requirementMatches: [] },
      scoreAndBreakdown: { totalScore: 80, breakdown: [{ component: 'Req', weight: 40, earned: 32, explanation: 'Match' }], scoreExplanation: 'Summary' },
      strengths: [{ point: '1. Fast learner with strong MERN background', evidence: 'Resume' }],
      skillGaps: [{ point: '1. Production testing with Vitest missing', severity: 'medium', evidence: null }],
      interviewQuestions: {
        technical: [{ question: '1. How do you implement vector search?', difficulty: 'intermediate', targetSkill: 'RAG', reason: 'Depth', whatToLookFor: 'Embeddings' }],
        projectBased: [{ question: '1. Tell us about SigmaGPT', relatedProject: 'SigmaGPT', reason: 'CRUD', whatToLookFor: 'OpenAI API' }],
        behavioral: [{ question: '1. How do you manage academic deadlines?', reason: 'Time' }],
        gapProbing: [{ question: '1. What is your experience with Docker?', relatedGap: 'Docker', reason: 'Containers' }]
      },
      recommendation: {
        recommendation: 'Hire',
        confidence: 'medium',
        reasoning: 'Candidate is strong.',
        keyRisks: ['1. Student availability'],
        suggestedNextSteps: ['1. Schedule technical interview', '2. Review code repository']
      },
      workflowTrace: {
        totalDurationMs: 1500,
        stages: [
          { key: 'resumeParser', name: 'Resume Parser', status: 'success', durationMs: 200 },
          { key: 'skillsAnalysis', name: 'Skills Analysis', status: 'success', durationMs: 250 },
          { key: 'scoring', name: 'Scoring', status: 'success', durationMs: 200 },
          { key: 'interviewQuestions', name: 'Questions', status: 'success', durationMs: 300 },
          { key: 'recommendation', name: 'Recommendation', status: 'success', durationMs: 250 },
          { key: 'report', name: 'Report Assembler', status: 'success', durationMs: 1 }
        ]
      },
      disclaimer: 'Advisory disclaimer'
    };

    const markdown = generateMarkdownReport(mockReport);

    // Verify NO duplicated "1. 1." numbering anywhere in the generated markdown
    expect(markdown).not.toContain('1. 1.');
    expect(markdown).not.toContain('2. 2.');
    expect(markdown).toContain('1. **Fast learner with strong MERN background**');
    expect(markdown).toContain('1. Schedule technical interview');
    expect(markdown).toContain('2. Review code repository');
    expect(markdown).toContain('`report` | Report Assembler | `success`');
  });
});
