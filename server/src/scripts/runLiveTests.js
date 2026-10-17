import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { extractTextFromPDF } from '../services/pdf.service.js';
import { initializeWorkflowRun, executeRecruitmentWorkflow } from '../workflows/recruitment.workflow.js';
import llmService from '../services/llm.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testResumesDir = path.resolve(__dirname, '../../../samples/test-resumes');
const testJdsDir = path.resolve(__dirname, '../../../samples/test-jds');
const resultsPath = path.resolve(__dirname, '../../../docs/live-test-results.json');

const LIVE_PAIRS = [
  {
    id: 'A',
    label: 'Pair A: Strong Match (Marcus Vance)',
    resumeFile: 'resume_01_strong_match.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [85, 100],
    expectedRec: 'Hire'
  },
  {
    id: 'B',
    label: 'Pair B: Student / Fresher Projects (Aarav Patel)',
    resumeFile: 'resume_02_student_projects.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [55, 78],
    expectedRec: ['Hire', 'Maybe']
  },
  {
    id: 'C',
    label: 'Pair C: Career Changer (Elena Rostova)',
    resumeFile: 'resume_03_career_changer.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [45, 65],
    expectedRec: 'Maybe'
  },
  {
    id: 'D',
    label: 'Pair D: Irrelevant Candidate (Chef Antonio Rossi)',
    resumeFile: 'resume_04_irrelevant.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [0, 30],
    expectedRec: 'No'
  },
  {
    id: 'E',
    label: 'Pair E: Keyword-Stuffed Candidate (Kevin Stuffer)',
    resumeFile: 'resume_05_keyword_stuffed.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [30, 55],
    expectedRec: ['No', 'Maybe']
  },
  {
    id: 'F',
    label: 'Pair F: Adversarial Prompt Injection Candidate',
    resumeFile: 'resume_06_prompt_injection.pdf',
    jdFile: 'jd_01_fullstack_ai_engineer.txt',
    expectedScoreRange: [0, 35],
    expectedRec: 'No'
  }
];

async function runSingleLivePair(pairConfig) {
  console.log(`\n======================================================`);
  console.log(`>>> STARTING LIVE TEST: ${pairConfig.label}`);
  console.log(`Resume: ${pairConfig.resumeFile} | JD: ${pairConfig.jdFile}`);
  console.log(`Mode: LIVE (Model: ${llmService.modelName})`);
  console.log(`======================================================\n`);

  const resumePath = path.join(testResumesDir, pairConfig.resumeFile);
  const jdPath = path.join(testJdsDir, pairConfig.jdFile);

  const jdText = fs.readFileSync(jdPath, 'utf8');

  // Step 0: Extract text from PDF
  const startTime = Date.now();
  const pdfResult = await extractTextFromPDF(resumePath);
  console.log(`[Stage 0] PDF extracted: ${pdfResult.pageCount} page(s), ${pdfResult.charCount} characters`);

  // Initialize workflow run
  const run = await initializeWorkflowRun({
    candidateId: {
      _id: `live_cand_${pairConfig.id}`,
      fileName: pairConfig.resumeFile,
      rawText: pdfResult.rawText
    },
    jobDescription: jdText
  });

  // Execute full recruitment pipeline
  const completedRun = await executeRecruitmentWorkflow({
    runId: run._id,
    rawText: pdfResult.rawText,
    jobDescription: jdText
  });

  const totalDuration = Date.now() - startTime;

  // Gather stage timings
  const stageMetrics = completedRun.stages.map(s => ({
    key: s.key,
    name: s.name,
    status: s.status,
    durationMs: s.durationMs,
    error: s.error || null
  }));

  const parserOutput = completedRun.stages.find(s => s.key === 'resumeParser')?.output || {};
  const skillsOutput = completedRun.stages.find(s => s.key === 'skillsAnalysis')?.output || {};
  const scoringOutput = completedRun.stages.find(s => s.key === 'scoring')?.output || {};
  const recOutput = completedRun.stages.find(s => s.key === 'recommendation')?.output || {};

  console.log(`\n--- RESULTS FOR ${pairConfig.label} ---`);
  console.log(`Run Status: ${completedRun.status.toUpperCase()} (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`Extracted Candidate Name: "${parserOutput.name || 'N/A'}"`);
  console.log(`Total Score: ${scoringOutput.totalScore ?? 'N/A'} / 100`);
  console.log(`Recommendation: ${recOutput.recommendation || 'N/A'} (Confidence: ${recOutput.confidence || 'N/A'})`);
  console.log(`Reasoning: ${recOutput.reasoning || 'N/A'}`);

  console.log('\nStage Timing Breakdown:');
  stageMetrics.forEach(st => {
    console.log(`  - [${st.status}] ${st.name}: ${(st.durationMs / 1000).toFixed(2)}s`);
  });

  console.log('\nScore Breakdown:');
  (scoringOutput.breakdown || []).forEach(b => {
    console.log(`  - ${b.component} (${b.weight} max): earned ${b.earned} pts -> ${b.explanation}`);
  });

  // Verify hallucinations & grounding
  const ungroundedSkills = (skillsOutput.skills || []).filter(s => s.isGrounded === false);
  console.log(`Evidence Grounding: ${(skillsOutput.skills || []).length} skills extracted, ${ungroundedSkills.length} ungrounded citations.`);

  return {
    id: pairConfig.id,
    label: pairConfig.label,
    resumeFile: pairConfig.resumeFile,
    jdFile: pairConfig.jdFile,
    status: completedRun.status,
    totalDurationMs: totalDuration,
    candidateName: parserOutput.name,
    totalScore: scoringOutput.totalScore,
    scoreBreakdown: scoringOutput.breakdown || [],
    recommendation: recOutput.recommendation,
    confidence: recOutput.confidence,
    reasoning: recOutput.reasoning,
    keyRisks: recOutput.keyRisks || [],
    stageMetrics,
    ungroundedCount: ungroundedSkills.length,
    timestamp: new Date().toISOString()
  };
}

async function main() {
  console.log('##########################################################');
  console.log('TALENTFLOW AI — STEP 3 LIVE GEMINI PIPELINE TEST RUNNER');
  console.log(`Model: ${process.env.GEMINI_MODEL || 'gemini-flash-latest'}`);
  console.log(`LLM_MOCK: ${process.env.LLM_MOCK}`);
  console.log(`Total Pairs: ${LIVE_PAIRS.length}`);
  console.log('##########################################################');

  const allResults = [];

  for (let i = 0; i < LIVE_PAIRS.length; i++) {
    const pair = LIVE_PAIRS[i];
    try {
      const res = await runSingleLivePair(pair);
      allResults.push(res);
    } catch (err) {
      console.error(`[ERROR] Live test pair ${pair.id} encountered an error:`, err);
      allResults.push({
        id: pair.id,
        label: pair.label,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    // Save progressive results
    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), 'utf8');

    // Cooldown between runs to respect free-tier Gemini rate limits (12s)
    if (i < LIVE_PAIRS.length - 1) {
      console.log('\n[Rate Limiting] Cooling down for 12 seconds before next live run...');
      await new Promise(r => setTimeout(r, 12000));
    }
  }

  console.log('\n======================================================');
  console.log('ALL 6 LIVE GEMINI PAIRS COMPLETED!');
  console.log(`Results saved to: ${resultsPath}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
