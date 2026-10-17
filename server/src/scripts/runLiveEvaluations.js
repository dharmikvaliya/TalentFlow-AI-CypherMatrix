import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromPDF } from '../services/pdf.service.js';
import { initializeWorkflowRun, executeRecruitmentWorkflow } from '../workflows/recruitment.workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

const resumePath = path.join(
  rootDir,
  'samples/sample_resume.pdf'
);

const testRuns = [
  {
    id: 'A',
    name: 'Run A: Sample Resume + Full-Stack AI Engineer JD',
    jdFile: path.join(rootDir, 'samples/test-jds/jd_01_fullstack_ai_engineer.txt')
  },
  {
    id: 'B',
    name: 'Run B: Sample Resume + Senior DevOps Engineer JD',
    jdFile: path.join(rootDir, 'samples/test-jds/jd_devops_engineer.txt')
  },
  {
    id: 'C',
    name: 'Run C: Sample Resume + Junior Data Engineer JD',
    jdFile: path.join(rootDir, 'samples/test-jds/jd_junior_data_engineer.txt')
  }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('========================================================================');
  console.log('TalentFlow AI — Multi-JD Evaluation Script (Sample Resume vs 3 JDs)');
  console.log(`Execution Mode: LLM_MOCK=${process.env.LLM_MOCK || 'true'}`);
  console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-4.1-mini'}`);
  console.log('========================================================================\n');

  if (!fs.existsSync(resumePath)) {
    console.error(`Resume file not found at: ${resumePath}`);
    process.exit(1);
  }

  const pdfData = await extractTextFromPDF(resumePath);
  console.log(`Resume loaded: ${pdfData.charCount} characters extracted, ${pdfData.pageCount} page(s).\n`);

  const results = [];

  for (const testRun of testRuns) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`Starting [${testRun.name}]`);
    console.log(`------------------------------------------------------------------------`);

    if (!fs.existsSync(testRun.jdFile)) {
      console.warn(`JD file not found: ${testRun.jdFile}`);
      continue;
    }

    const jdText = fs.readFileSync(testRun.jdFile, 'utf-8');

    const fakeCandidate = {
      _id: `sample_candidate_${testRun.id}`,
      fileName: 'sample_resume.pdf',
      rawText: pdfData.rawText
    };

    const runRecord = await initializeWorkflowRun({
      candidateId: fakeCandidate,
      jobDescription: jdText
    });

    const runId = runRecord._id.toString();
    console.log(`Workflow run initialized with ID: ${runId}`);

    const startTime = Date.now();
    const completedRun = await executeRecruitmentWorkflow({
      runId,
      rawText: pdfData.rawText,
      jobDescription: jdText
    });
    const durationSecs = ((Date.now() - startTime) / 1000).toFixed(1);

    const report = completedRun.finalReport;
    const scoringStage = completedRun.stages.find(s => s.key === 'scoring')?.output;
    const recommendationStage = completedRun.stages.find(s => s.key === 'recommendation')?.output;

    console.log(`\n>> Run [${testRun.id}] Results:`);
    console.log(`   Status:         ${completedRun.status}`);
    console.log(`   Duration:       ${durationSecs}s`);
    console.log(`   Total Score:    ${scoringStage?.totalScore ?? 'N/A'}/100`);
    console.log(`   Recommendation: ${recommendationStage?.recommendation ?? 'N/A'} (Confidence: ${recommendationStage?.confidence ?? 'N/A'})`);

    results.push({
      runId: testRun.id,
      name: testRun.name,
      candidateName: report?.candidateSummary?.name || 'Sample Candidate',
      jdFile: path.basename(testRun.jdFile),
      status: completedRun.status,
      durationSecs,
      totalScore: scoringStage?.totalScore ?? null,
      recommendation: recommendationStage?.recommendation ?? null,
      confidence: recommendationStage?.confidence ?? null,
      summary: report?.candidateSummary?.overview || ''
    });

    console.log(`Waiting 5 seconds before next evaluation...`);
    await sleep(5000);
  }

  console.log('\n========================================================================');
  console.log('All Evaluations Finished.');
  console.log('========================================================================\n');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('Fatal Error during execution:', err);
  process.exit(1);
});
