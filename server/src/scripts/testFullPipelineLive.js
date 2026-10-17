import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import resumeParserAgent from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';
import scoringAgent from '../agents/scoring.agent.js';
import interviewQuestionsAgent from '../agents/interviewQuestions.agent.js';
import recommendationAgent from '../agents/recommendation.agent.js';

const sampleResumeText = `Sarah Chen
San Francisco, CA | sarah.chen.dev@example.com | (555) 234-5678 | github.com/sarahchen-dev | linkedin.com/in/sarahchen-dev

Professional Summary:
Versatile Full-Stack AI Software Engineer with 2+ years of experience in React, Node.js, Express, and MongoDB. Passionate about LLM agent workflows, structured JSON extraction with Zod, and building responsive recruiter tools.

Education:
University of California, Berkeley - B.S. in Computer Science (2019 - 2023) | GPA: 3.82 / 4.0

Experience:
NovaTech Labs - Software Engineering Intern (Jun 2023 - Present)
- Developed and maintained full-stack web applications using React 18, Vite, Node.js, and Express.
- Constructed server routes and integrated MongoDB Atlas database clusters for low-latency queries.
- Integrated OpenAI API structured output endpoints with runtime Zod schema validation.

Projects:
TalentFlow AI - Multi-Agent Recruitment Automation
- Architected multi-step agentic pipelines consuming structured JSON schemas with React, Node.js, Express, and MongoDB.
- Implemented structured output and rubric-based deterministic scoring engines.

Technical Skills:
Languages: JavaScript (ES6+), TypeScript, Python, HTML5, CSS3
Frameworks & Libraries: React, Vite, Node.js, Express, Zod, Material UI
Databases & Cloud: MongoDB Atlas, Git, GitHub, Postman, Docker`;

const targetJD = `Job Title: Full-Stack AI Engineer / AI Automation Intern
Company: Cypher Matrix Technologies
Location: Remote / Hybrid
About the Role:
We are seeking an enthusiastic and talented Full-Stack AI Engineer to design and implement cutting-edge agentic workflows, LLM orchestration pipelines, and scalable recruitment automation systems. You will work on real-world generative AI products combining React, Node.js, and multi-agent coordination.
Key Responsibilities:
Build reliable, end-to-end full-stack web applications using React, Node.js, Express, and MongoDB.
Architect multi-step agentic workflows and pipeline orchestration consuming structured JSON schemas.
Implement LLM provider integrations (OpenAI, Ollama) with robust prompt engineering and schema validation.
Design transparent, rubric-based deterministic scoring engines with evidence grounding.
Create responsive recruiter dashboards featuring workflow execution traces and candidate evaluation reports.
Required Qualifications & Skills:
Proficiency in JavaScript/TypeScript, Node.js, and Express (ES modules).
Strong hands-on experience with React, Vite, state management, and modern CSS.
Experience with MongoDB/Mongoose or PostgreSQL database design.
Practical experience integrating LLM APIs using structured output / JSON mode.
Familiarity with runtime schema validation libraries (Zod).
Preferred / Nice-to-Have:
Experience building RAG applications with embeddings and vector databases.
Familiarity with workflow orchestration frameworks (LangGraph or custom state machines).
Experience with Docker, automated testing (Vitest, Jest) and Python scripting.`;

async function testPipeline() {
  console.log('--- TESTING STAGE 1: RESUME PARSER ---');
  const profile = await resumeParserAgent.run({ rawText: sampleResumeText });
  console.log('Parsed Profile Name:', profile.name);
  console.log('Parsed Profile Email:', profile.email);
  console.log('Parsed Profile Phone:', profile.phone);
  console.log('Parsed Profile Education:', JSON.stringify(profile.education, null, 2));
  console.log('Parsed Profile Experience:', JSON.stringify(profile.experience, null, 2));
  console.log('Parsed Profile Projects:', JSON.stringify(profile.projects.map(p => p.name), null, 2));

  console.log('\n--- TESTING STAGE 2: SKILLS ANALYSIS ---');
  const skills = await skillsAnalysisAgent.run({ profile, jobDescription: targetJD });
  console.log('Skills count:', skills.skills.length);
  console.log('Requirement matches count:', skills.requirementMatches.length);

  console.log('\n--- TESTING STAGE 3: SCORING ---');
  const scoring = await scoringAgent.run({ profile, skillsAnalysis: skills });
  console.log('Total Score:', scoring.totalScore);
  console.log('Breakdown:', JSON.stringify(scoring.breakdown, null, 2));
  console.log('Strengths:', JSON.stringify(scoring.strengths, null, 2));
  console.log('Gaps:', JSON.stringify(scoring.gaps, null, 2));

  console.log('\n--- TESTING STAGE 4: INTERVIEW QUESTIONS ---');
  const questions = await interviewQuestionsAgent.run({
    profile,
    skillsAnalysis: skills,
    strengths: scoring.strengths,
    gaps: scoring.gaps,
    jobDescription: targetJD
  });
  console.log('Technical questions:', questions.technical.length);
  console.log('Project questions:', questions.projectBased.length);

  console.log('\n--- TESTING STAGE 5: RECOMMENDATION ---');
  const rec = await recommendationAgent.run({
    profile,
    skillsAnalysis: skills,
    scoring,
    interviewQuestions: questions
  });
  console.log('Recommendation:', rec.recommendation);
  console.log('Reasoning:', rec.reasoning);
}

testPipeline().catch(err => {
  console.error('Pipeline Test Error:', err);
});
