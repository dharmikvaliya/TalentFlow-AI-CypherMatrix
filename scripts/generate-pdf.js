import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mdPath = path.join(rootDir, 'submission', 'FINAL_INTERNSHIP_SUBMISSION_REPORT.md');
const htmlPath = path.join(rootDir, 'submission', 'report.html');
const pdfPath = path.join(rootDir, 'submission', 'FINAL_INTERNSHIP_SUBMISSION_REPORT.pdf');

const mdContent = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  let html = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;
  let listType = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        html.push(`<pre class="code-block ${codeLang}"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        codeLang = '';
      } else {
        if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        if (inTable) { html.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Table check
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      html.push(renderTable(tableRows));
      inTable = false;
      tableRows = [];
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      html.push('<hr />');
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const text = formatInline(line.slice(2).trim());
      html.push(`<h1 class="doc-title">${text}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const text = formatInline(line.slice(3).trim());
      const isChapter = text.toLowerCase().includes('chapter');
      html.push(`<h2 class="${isChapter ? 'chapter-heading' : ''}">${text}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      html.push(`<h3>${formatInline(line.slice(4).trim())}</h3>`);
      continue;
    }
    if (line.startsWith('#### ')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      html.push(`<h4>${formatInline(line.slice(5).trim())}</h4>`);
      continue;
    }

    // Blockquote / Alerts
    if (line.startsWith('> ')) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      let content = line.slice(2).trim();
      let alertClass = 'quote-standard';
      if (content.includes('[!NOTE]')) {
        alertClass = 'quote-note';
        content = content.replace('[!NOTE]', '<strong>NOTE:</strong>');
      } else if (content.includes('[!IMPORTANT]')) {
        alertClass = 'quote-important';
        content = content.replace('[!IMPORTANT]', '<strong>IMPORTANT:</strong>');
      }
      html.push(`<blockquote class="${alertClass}"><p>${formatInline(content)}</p></blockquote>`);
      continue;
    }

    // Lists
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html.push(listType === 'ul' ? '</ul>' : '</ol>');
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${formatInline(ulMatch[2])}</li>`);
      continue;
    }

    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html.push(listType === 'ul' ? '</ul>' : '</ol>');
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    if (inList && line.trim() === '') {
      html.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      continue;
    }

    // Paragraph
    if (line.trim().length > 0) {
      html.push(`<p>${formatInline(line.trim())}</p>`);
    }
  }

  if (inTable) html.push(renderTable(tableRows));
  if (inList) html.push(listType === 'ul' ? '</ul>' : '</ol>');
  if (inCodeBlock) html.push(`<pre class="code-block ${codeLang}"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);

  return html.join('\n');
}

function formatInline(str) {
  // Bold
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  str = str.replace(/`([^`]+)`/g, (match, p1) => `<code>${escapeHtml(p1)}</code>`);
  // Links
  str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Math expressions in $$...$$ or $...$
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block"><code>$1</code></div>');
  str = str.replace(/\$([^$\n]+)\$/g, '<span class="math-inline"><code>$1</code></span>');
  return str;
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  let out = ['<table class="report-table">'];
  let isHeader = true;

  for (let i = 0; i < rows.length; i++) {
    let r = rows[i];
    if (r.includes('---')) continue; // divider row
    let cells = r.split('|').map(c => c.trim()).slice(1, -1);
    if (isHeader) {
      out.push('<thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>');
      isHeader = false;
    } else {
      out.push('<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>');
    }
  }
  out.push('</tbody></table>');
  return out.join('');
}

const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TalentFlow AI - Cypher Matrix Final Internship Technical Report</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-size: 9pt;
        color: #718096;
      }
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a202c;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1.doc-title {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    h2.chapter-heading {
      page-break-before: always;
      color: #1d4ed8;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 6px;
      margin-top: 30px;
    }
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #334155;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    h4 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #475569;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }
    strong {
      color: #0f172a;
      font-weight: 600;
    }
    code {
      font-family: "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }
    pre.code-block {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 12px 0;
      border: 1px solid #1e293b;
      page-break-inside: avoid;
    }
    pre.code-block code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }
    .math-block {
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      padding: 8px 12px;
      margin: 10px 0;
      font-family: "Cascadia Code", monospace;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    .math-inline code {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #312e81;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    table.report-table th, table.report-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    table.report-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    table.report-table tr:nth-child(even) {
      background: #f8fafc;
    }
    blockquote {
      margin: 10px 0;
      padding: 10px 14px;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    blockquote.quote-standard {
      background: #f8fafc;
      border-left: 4px solid #94a3b8;
    }
    blockquote.quote-note {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e3a8a;
    }
    blockquote.quote-important {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #78350f;
    }
    blockquote p {
      margin: 0;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 10px;
      padding-left: 22px;
    }
    li {
      margin-bottom: 4px;
    }
    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    @media print {
      body {
        font-size: 9.5pt;
      }
      .chapter-heading {
        page-break-before: always;
      }
      pre.code-block, table.report-table, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${parseMarkdown(mdContent)}
  </div>
</body>
</html>`;

fs.writeFileSync(htmlPath, styledHtml, 'utf8');
console.log('Generated HTML report at:', htmlPath);

// Invoke Microsoft Edge headless to render PDF
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" --no-margins "${htmlPath}"`;

try {
  console.log('Rendering PDF via Microsoft Edge headless...');
  execSync(cmd, { stdio: 'inherit' });
  console.log('PDF rendered successfully at:', pdfPath);
} catch (err) {
  console.error('Error rendering PDF with Edge:', err);
  process.exit(1);
}
