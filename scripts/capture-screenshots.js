import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'submission', 'screenshots');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = 'http://localhost:5173';
const completedRunId = '6aedd44b6eed6b4077e7710b';
const resumePdfPath = 'C:\\Users\\ZeeGadgets\\.gemini\\antigravity\brain\\5e1e739d-91a5-4a91-a7d1-fe093fe696c0\\.user_uploaded\\media_1793964600368_38057f5a.pdf';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Remove old screenshots
fs.readdirSync(outDir).forEach(file => {
  fs.unlinkSync(path.join(outDir, file));
});
console.log('Cleaned old screenshots in submission/screenshots/');

async function captureAll() {
  console.log('Launching headless Microsoft Edge at 1920x1080 (scaleFactor 1.5)...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1.5 }
  });

  const page = await browser.newPage();

  // Helper to click tab on run page
  async function selectTab(tabLabel) {
    const success = await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.toLowerCase().includes(label.toLowerCase()));
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, tabLabel);
    await new Promise(r => setTimeout(r, 800));
    return success;
  }

  // 1. Dashboard & Provider Selection
  console.log('1. Capturing 01-dashboard.png...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, '01-dashboard.png') });

  // 2. Resume Upload Interface (with uploaded file)
  console.log('2. Capturing 02-resume-upload.png...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput && fs.existsSync(resumePdfPath)) {
    await fileInput.uploadFile(resumePdfPath);
    await new Promise(r => setTimeout(r, 2000));
  }
  await page.screenshot({ path: path.join(outDir, '02-resume-upload.png') });

  // 3. Job Description Input Interface
  console.log('3. Capturing 03-job-description-input.png...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loadSampleBtn = btns.find(b => b.innerText.includes('Sample') || b.innerText.includes('Load'));
    if (loadSampleBtn) loadSampleBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, '03-job-description-input.png') });

  // 4. How It Works Pipeline Architecture
  console.log('4. Capturing 04-workflow-pipeline.png...');
  await page.goto(`${baseUrl}/how-it-works`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, '04-workflow-pipeline.png') });

  // 5. Evaluation History Portal
  console.log('5. Capturing 05-evaluation-history.png...');
  await page.goto(`${baseUrl}/history`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, '05-evaluation-history.png') });

  // Navigate to Completed Run Page
  console.log(`Navigating to candidate run: ${completedRunId}...`);
  await page.goto(`${baseUrl}/runs/${completedRunId}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // 6. Candidate Parsed Profile Tab
  console.log('6. Capturing 06-candidate-analysis.png...');
  await selectTab('Candidate Info');
  await page.screenshot({ path: path.join(outDir, '06-candidate-analysis.png') });

  // 7. Skills Matching & Analysis Tab
  console.log('7. Capturing 07-skill-matching.png...');
  await selectTab('Skills');
  await page.screenshot({ path: path.join(outDir, '07-skill-matching.png') });

  // 8. Resume Integrity & Gaming Detection Tab
  console.log('8. Capturing 08-integrity-detection.png...');
  await selectTab('Resume Integrity');
  await page.screenshot({ path: path.join(outDir, '08-integrity-detection.png') });

  // 9. Candidate Scoring Breakdown Tab
  console.log('9. Capturing 09-scoring-breakdown.png...');
  await selectTab('Evaluation');
  await page.screenshot({ path: path.join(outDir, '09-scoring-breakdown.png') });

  // 10. AI-Generated Interview Questions Tab
  console.log('10. Capturing 10-interview-questions.png...');
  await selectTab('Questions');
  await page.screenshot({ path: path.join(outDir, '10-interview-questions.png') });

  // 11. Strategic Hiring Recommendations Tab
  console.log('11. Capturing 11-strategic-recommendations.png...');
  await selectTab('Recommendation');
  await page.screenshot({ path: path.join(outDir, '11-strategic-recommendations.png') });

  // 12. Seven-Stage Agent Execution Traces Tab
  console.log('12. Capturing 12-agent-execution-traces.png...');
  await selectTab('Agent Trace');
  await page.screenshot({ path: path.join(outDir, '12-agent-execution-traces.png') });

  // 13. Final Candidate Analysis Report Tab
  console.log('13. Capturing 13-final-report.png...');
  await selectTab('Final Report');
  await page.screenshot({ path: path.join(outDir, '13-final-report.png') });

  await browser.close();
  console.log('All 13 authentic project screenshots captured successfully!');
}

captureAll().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
