import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.join(rootDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[Screenshots] Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });

    // 1. Resume Upload Flow
    console.log('[Screenshots] 1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Click "Load Sample JD"
    console.log('[Screenshots] Loading sample job description...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Load Sample JD'));
      if (btn) btn.click();
    });
    await sleep(500);

    // Upload resume file
    const samplePdfPath = path.join(rootDir, 'samples', 'sample_resume.pdf');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log('[Screenshots] Uploading sample_resume.pdf...');
      await fileInput.uploadFile(samplePdfPath);
      await sleep(2500);
    }

    const uploadScreenshotPath = path.join(screenshotsDir, 'resume_upload_flow.png');
    await page.screenshot({ path: uploadScreenshotPath, fullPage: false });
    console.log(`[Screenshots] Saved: ${uploadScreenshotPath}`);

    // Click "Run Analysis"
    console.log('[Screenshots] Clicking "Run Analysis"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Run Analysis') || b.textContent.includes('Start Analysis'));
      if (btn) btn.click();
    });

    // 2. Agent Workflow (Live Execution Pipeline)
    console.log('[Screenshots] 2. Capturing Agent Workflow...');
    await sleep(1500);
    const workflowScreenshotPath = path.join(screenshotsDir, 'agent_workflow.png');
    await page.screenshot({ path: workflowScreenshotPath, fullPage: false });
    console.log(`[Screenshots] Saved: ${workflowScreenshotPath}`);

    // Wait for all 6 stages to complete
    console.log('[Screenshots] Waiting for analysis to complete...');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('6 of 6') || document.body.innerText.includes('Evaluation (');
    }, { timeout: 45000 });
    await sleep(2000);

    // 3. Evaluation Dashboard / Interface
    console.log('[Screenshots] 3. Capturing Dashboard Interface...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, div[role="tab"]'));
      const evalTab = tabs.find(t => t.textContent.includes('Evaluation'));
      if (evalTab) evalTab.click();
    });
    await sleep(1000);

    const dashboardScreenshotPath = path.join(screenshotsDir, 'dashboard_interface.png');
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: false });
    console.log(`[Screenshots] Saved: ${dashboardScreenshotPath}`);

    // 4. Final Candidate Report
    console.log('[Screenshots] 4. Capturing Final Candidate Report...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, div[role="tab"]'));
      const reportTab = tabs.find(t => t.textContent.includes('Final Report'));
      if (reportTab) reportTab.click();
    });
    await sleep(1000);

    const reportScreenshotPath = path.join(screenshotsDir, 'final_candidate_report.png');
    await page.screenshot({ path: reportScreenshotPath, fullPage: false });
    console.log(`[Screenshots] Saved: ${reportScreenshotPath}`);

    console.log('[Screenshots] All 4 screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

main().then(() => {
  console.log('[Screenshots] Done.');
  process.exit(0);
}).catch(err => {
  console.error('[Screenshots ERR]', err);
  process.exit(1);
});
