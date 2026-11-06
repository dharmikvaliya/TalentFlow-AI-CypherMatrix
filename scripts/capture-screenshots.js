import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'submission', 'screenshots');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = 'https://talentflow-ai-cyphermatrix.vercel.app';
const completedRunId = '6aeda64634b6f68b0a84124d';

// Clear out old files in submission/screenshots
fs.readdirSync(outDir).forEach(file => {
  fs.unlinkSync(path.join(outDir, file));
});

async function captureAll() {
  console.log('Capturing verified, high-resolution screenshots of TalentFlow UI...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950, deviceScaleFactor: 1.5 }
  });

  const page = await browser.newPage();

  // 1. Upload & Recruiter Dashboard
  console.log('1. Capturing Upload Dashboard...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, '01_upload_and_provider_selection.png') });

  // 2. How It Works Architecture Page
  console.log('2. Capturing How It Works Workflow...');
  await page.goto(`${baseUrl}/how-it-works`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, '02_agentic_workflow_architecture.png') });

  // 3. Candidate History List
  console.log('3. Capturing Evaluation History...');
  await page.goto(`${baseUrl}/history`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, '03_candidate_evaluation_history.png') });

  // Navigate to completed run
  console.log('Navigating to completed candidate run...');
  await page.goto(`${baseUrl}/runs/${completedRunId}`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Helper to click a tab by visible text and wait
  async function clickTabAndCapture(buttonLabelMatch, filename, waitMs = 800) {
    const success = await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.toLowerCase().includes(label.toLowerCase()));
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, buttonLabelMatch);

    if (success) {
      console.log(`Captured tab: ${buttonLabelMatch} -> ${filename}`);
      await new Promise(r => setTimeout(r, waitMs));
      await page.screenshot({ path: path.join(outDir, filename) });
    } else {
      console.warn(`Tab not found for: ${buttonLabelMatch}`);
    }
  }

  // 4. Candidate Info Tab
  await clickTabAndCapture('Candidate Info', '04_candidate_parsed_profile.png');

  // 5. Skills Tab
  await clickTabAndCapture('Skills', '05_skills_analysis_matches.png');

  // 6. Resume Integrity Tab
  await clickTabAndCapture('Resume Integrity', '06_resume_integrity_analysis.png');

  // 7. Capability Scoring Tab
  await clickTabAndCapture('Evaluation', '07_explainable_scoring_rubric.png');

  // 8. Interview Questions Tab
  await clickTabAndCapture('Questions', '08_adaptive_interview_questions.png');

  // 9. Recommendation Tab
  await clickTabAndCapture('Recommendation', '09_hiring_recommendation.png');

  // 10. Agent Traces Tab
  await clickTabAndCapture('Agent Trace', '10_seven_stage_agent_traces.png');

  // 11. Final Report Tab
  await clickTabAndCapture('Final Report', '11_final_candidate_report.png');

  await browser.close();
  console.log('All 11 verified project UI screenshots captured successfully!');
}

captureAll().catch(e => {
  console.error('Error during screenshot capture:', e);
  process.exit(1);
});
