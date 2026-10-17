import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { llmService } from '../services/llm.service.js';
import resumeParserAgent from '../agents/resumeParser.agent.js';
import skillsAnalysisAgent from '../agents/skillsAnalysis.agent.js';

async function testOpenAI() {
  console.log('--- OpenAI Live Integration Test ---');
  console.log(`Configured Provider: ${llmService.provider}`);
  console.log(`Configured Model: ${llmService.modelName}`);
  console.log(`API Key Configured: ${Boolean(llmService.apiKey)} (length: ${llmService.apiKey.length})`);

  if (!llmService.apiKey) {
    console.log('No OPENAI_API_KEY detected in environment. Skipping live API call.');
    return;
  }

  try {
    console.log('1. Executing live structured JSON test call...');
    const result = await llmService.generateStructuredJSON({
      agentName: 'liveTest',
      systemPrompt: 'You are an AI assistant. Output ONLY valid JSON in format: {"status": "ok", "provider": "openai", "message": "string"}',
      userPrompt: 'Verify connection and return confirmation.',
      temperature: 0.1
    });

    console.log('   Response:', JSON.stringify(result));

    console.log('2. Executing Stage 1: resumeParserAgent with OpenAI...');
    const rawText = `Sarah Chen
San Francisco, CA | sarah.chen.dev@example.com | (555) 234-5678 | github.com/sarahchen-dev
PROFESSIONAL SUMMARY:
Versatile Full-Stack AI Software Engineer with 2+ years of experience in React, Node.js, Express, and MongoDB.
EDUCATION:
University of California, Berkeley - B.S. in Computer Science (2019 - 2023)
EXPERIENCE:
NovaTech Labs - Software Engineering Intern (Jun 2023 - Present)
- Developed and maintained full-stack web applications using React 18, Vite, Node.js, and Express.
PROJECTS:
TalentFlow AI - Multi-Agent Hiring Pipeline using React, Node.js, Express, MongoDB, Zod.
SKILLS:
JavaScript, TypeScript, Python, React, Node.js, Express, MongoDB, Zod.`;

    const parsed = await resumeParserAgent.run({ rawText });
    console.log(`   Parsed Name: ${parsed.name}`);
    console.log(`   Education: ${parsed.education?.length} items`);
    console.log(`   Skills listed: ${parsed.skillsListed?.join(', ')}`);

    console.log('3. Executing Stage 2: skillsAnalysisAgent with OpenAI...');
    const jd = `Job Title: Full-Stack AI Engineer
Required:
- Proficiency in JavaScript/TypeScript, Node.js, and Express
- Strong hands-on experience with React, Vite
- Experience with MongoDB
Preferred:
- Familiarity with runtime schema validation (Zod)`;

    const analysis = await skillsAnalysisAgent.run({
      profile: parsed,
      jobDescription: jd,
      rawText
    });
    console.log(`   Identified Skills: ${analysis.skills?.length} items`);
    console.log(`   Requirement Matches: ${analysis.requirementMatches?.length} items`);
    console.log(`   Summary: ${analysis.summary}`);

    console.log('--- OpenAI Live Multi-Agent Integration Tests PASSED 100% ---');
  } catch (err) {
    console.error('OpenAI Integration Test FAILED:');
    console.error(`Status: ${err.status || 500}`);
    console.error(`Message: ${err.message}`);
    if (err.retryAfterSeconds) {
      console.error(`Retry After: ${err.retryAfterSeconds}s`);
    }
    process.exit(1);
  }
}

testOpenAI().catch(e => {
  console.error('Unexpected error during test execution:', e);
  process.exit(1);
});
