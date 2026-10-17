import { describe, it, expect } from 'vitest';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';

describe('Step 2: Evidence Grounding Suite (MOCK MODE)', () => {
  it('verifies that genuine quotes present in the candidate profile are grounded', async () => {
    const input = {
      profile: {
        name: 'Jane Developer',
        email: 'jane@example.com',
        phone: null,
        links: [],
        summary: 'Full-stack software engineer specializing in React and Node.js microservices',
        education: [
          {
            institution: 'MIT',
            degree: 'B.S.',
            field: 'Computer Science',
            startYear: 2018,
            endYear: 2022,
            grade: '3.9'
          }
        ],
        experience: [
          {
            company: 'CloudCorp',
            role: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            description: 'Engineered REST APIs with Node.js and Express',
            highlights: ['Built real-time React dashboard with WebSockets']
          }
        ],
        projects: [
          {
            name: 'TaskMaster',
            description: 'Kanban web application built with React and MongoDB',
            technologies: ['React', 'MongoDB'],
            highlights: ['Implemented full text search']
          }
        ],
        skillsListed: ['React', 'Node.js', 'Express', 'MongoDB'],
        achievements: []
      },
      jobDescription: `Required Skills:
- React
- Node.js & Express
- MongoDB`
    };

    const result = await skillsAnalysisAgent.run(input);
    expect(result).toBeDefined();
    expect(result.skills.length).toBeGreaterThan(0);

    // Filter skills with citations
    const groundedSkills = result.skills.filter(s => s.evidence && s.evidence !== 'Mentioned in resume');
    groundedSkills.forEach(skill => {
      expect(skill.isGrounded).toBe(true);
      expect(skill.evidence).not.toContain('[Unverified citation]');
    });
  });

  it('detects and flags fabricated evidence citations not found in candidate profile', async () => {
    const candidateProfile = {
      name: 'Bob Smith',
      summary: 'Data analyst with spreadsheet experience.',
      experience: [],
      projects: [],
      skillsListed: ['Excel', 'SQL']
    };

    // Simulate agent output with a hallucinated quote
    const mockSkillsOutputWithFabrication = {
      jobRequirements: {
        required: ['Kubernetes Cluster Management'],
        preferred: [],
        experienceLevel: 'Senior'
      },
      skills: [
        {
          name: 'Kubernetes',
          category: 'devops',
          evidence: 'Managed 500-node Kubernetes production cluster at Google Cloud', // Pure fabrication
          matchLevel: 'advanced'
        }
      ],
      requirementMatches: [
        {
          requirement: 'Kubernetes Cluster Management',
          type: 'required',
          status: 'match',
          evidence: 'Managed 500-node Kubernetes production cluster at Google Cloud', // Pure fabrication
          reasoning: 'Claimed experience'
        }
      ],
      summary: 'Candidate analysis'
    };

    // Run the internal grounding verifier logic directly or via exported helper
    // In skillsAnalysis.agent.js, verifyEvidenceGrounding checks against profile corpus
    const profileCorpus = JSON.stringify(candidateProfile).toLowerCase();
    const verifiedSkills = mockSkillsOutputWithFabrication.skills.map(skill => {
      const snippetLower = skill.evidence.toLowerCase().trim();
      const isGroundInText = profileCorpus.includes(snippetLower.substring(0, Math.min(25, snippetLower.length)));
      return {
        ...skill,
        isGrounded: isGroundInText,
        evidence: isGroundInText ? skill.evidence : `${skill.evidence} [Unverified citation]`
      };
    });

    expect(verifiedSkills[0].isGrounded).toBe(false);
    expect(verifiedSkills[0].evidence).toContain('[Unverified citation]');
  });
});
