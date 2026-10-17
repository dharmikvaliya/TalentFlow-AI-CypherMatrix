import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import resumeParserAgent from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleJdPath = path.resolve(__dirname, '../../../samples/sample_job_description.txt');
const sampleJd = fs.readFileSync(sampleJdPath, 'utf8');

const sampleRawText = `Sarah Chen
San Francisco, CA | sarah.chen.dev@example.com | (555) 234-5678 | github.com/sarahchen-dev
PROFESSIONAL SUMMARY:
Versatile Full-Stack AI Software Engineer with 2+ years of hands-on experience developing web applications using React, Node.js, Express, and MongoDB. Passionate about LLM agent workflows, structured JSON extraction with Zod.
EDUCATION:
University of California, Berkeley - B.S. in Computer Science (2019 - 2023), GPA: 3.82 / 4.0
EXPERIENCE:
NovaTech Labs - Software Engineering Intern (Jun 2023 - Present)
- Developed and maintained full-stack web applications using React 18, Vite, Node.js, and Express.
- Integrated Google Gemini and OpenAI APIs with strict Zod schema validation.
- Designed MongoDB schemas with Mongoose improving query execution by 32%.
PROJECTS:
TalentFlow AI - Multi-Agent Hiring Pipeline orchestrating resume parsing, skills analysis, and scoring using React, Node.js, Express, MongoDB, Zod.
SKILLS:
JavaScript, TypeScript, Python, React, Node.js, Express, MongoDB, Zod, Docker, Vitest.`;

describe('Phase 3: Agents Execution Tests (Mock/OpenAI)', () => {
  let parsedProfile;

  it('Stage 1: resumeParser runs and returns valid structured profile', async () => {
    parsedProfile = await resumeParserAgent.run({ rawText: sampleRawText });
    
    expect(parsedProfile).toBeDefined();
    expect(parsedProfile.name).toContain('Sarah');
    expect(parsedProfile.education.length).toBeGreaterThan(0);
    expect(parsedProfile.experience.length).toBeGreaterThan(0);
    expect(parsedProfile.skillsListed).toContain('React');
    expect(parsedProfile.skillsListed).toContain('Node.js');
  });

  it('Stage 2: skillsAnalysis runs and matches requirements against JD', async () => {
    const analysis = await skillsAnalysisAgent.run({
      profile: parsedProfile,
      jobDescription: sampleJd,
      rawText: sampleRawText
    });

    expect(analysis).toBeDefined();
    expect(analysis.jobRequirements.required.length).toBeGreaterThan(0);
    expect(analysis.skills.length).toBeGreaterThan(0);
    expect(analysis.requirementMatches.length).toBeGreaterThan(0);

    // Verify categories and evidence
    const reactSkill = analysis.skills.find(s => s.name.toLowerCase().includes('react'));
    expect(reactSkill).toBeDefined();
    expect(reactSkill.evidence).toBeDefined();

    // Verify requirement match status
    const match = analysis.requirementMatches.find(m => m.status === 'match');
    expect(match).toBeDefined();
    expect(match.reasoning).toBeTruthy();
  });
});
