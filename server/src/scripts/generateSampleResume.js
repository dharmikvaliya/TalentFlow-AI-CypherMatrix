import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, '../../../samples/sample_resume.pdf');

// Ensure destination directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const doc = new PDFDocument({ margin: 40, size: 'A4' });
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Header
doc.fontSize(22).font('Helvetica-Bold').text('Sarah Chen', { align: 'center' });
doc.fontSize(10).font('Helvetica').text('San Francisco, CA | sarah.chen.dev@example.com | (555) 234-5678 | github.com/sarahchen-dev', { align: 'center' });
doc.moveDown(0.8);

// Summary
doc.fontSize(12).font('Helvetica-Bold').text('PROFESSIONAL SUMMARY');
doc.strokeColor('#4F46E5').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(10).font('Helvetica').text(
  'Versatile Full-Stack AI Software Engineer with 2+ years of hands-on experience developing web applications using React, Node.js, Express, and MongoDB. Passionate about LLM agent workflows, structured JSON extraction with Zod, and building responsive recruiter tools. Experienced in vector search and RAG architectures.'
);
doc.moveDown(0.8);

// Education
doc.fontSize(12).font('Helvetica-Bold').text('EDUCATION');
doc.strokeColor('#4F46E5').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(10).font('Helvetica-Bold').text('University of California, Berkeley', { continued: true });
doc.font('Helvetica').text(' — B.S. in Computer Science', { align: 'left' });
doc.fontSize(9).text('Graduated: May 2023 | GPA: 3.82 / 4.0 | Dean\'s Honor List (4 semesters)');
doc.moveDown(0.8);

// Experience
doc.fontSize(12).font('Helvetica-Bold').text('PROFESSIONAL EXPERIENCE');
doc.strokeColor('#4F46E5').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);

doc.fontSize(10).font('Helvetica-Bold').text('NovaTech Labs — Software Engineering Intern', { continued: true });
doc.font('Helvetica').text(' | Jun 2023 - Present', { align: 'right' });
doc.fontSize(9).font('Helvetica').list([
  'Developed and maintained full-stack web applications using React 18, Vite, Node.js, and Express.',
  'Integrated Google Gemini and OpenAI APIs with strict Zod schema validation for structured data extraction.',
  'Designed and optimized MongoDB schemas with Mongoose, improving query execution time by 32%.',
  'Implemented rate limiting, CORS controls, and secure RESTful API endpoints handling 20,000+ daily requests.'
]);
doc.moveDown(0.5);

doc.fontSize(10).font('Helvetica-Bold').text('Berkeley AI Student Lab — Undergraduate Researcher', { continued: true });
doc.font('Helvetica').text(' | Jan 2022 - May 2023', { align: 'right' });
doc.fontSize(9).font('Helvetica').list([
  'Built prototype RAG pipelines utilizing embeddings, FAISS, and custom prompt evaluation rubrics.',
  'Wrote comprehensive unit and integration test suites using Vitest and Jest achieving 88% branch coverage.'
]);
doc.moveDown(0.8);

// Projects
doc.fontSize(12).font('Helvetica-Bold').text('KEY PROJECTS');
doc.strokeColor('#4F46E5').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);

doc.fontSize(10).font('Helvetica-Bold').text('TalentFlow AI — Multi-Agent Hiring Pipeline');
doc.fontSize(9).font('Helvetica').text('Technologies: React, Node.js, Express, MongoDB, Google Gemini, Zod, Vitest');
doc.fontSize(9).font('Helvetica').list([
  'Architected a 6-stage autonomous recruitment pipeline orchestrating resume parsing, skills analysis, and scoring.',
  'Built deterministic 0-100 rubric scoring engine grounded in resume textual evidence.',
  'Designed clean, responsive recruiter dashboard with real-time stage status, execution traces, and markdown report export.'
]);
doc.moveDown(0.5);

doc.fontSize(10).font('Helvetica-Bold').text('DocuQuery RAG — Intelligent Knowledge Search');
doc.fontSize(9).font('Helvetica').text('Technologies: Python, Node.js, React, Ollama, LangChain, ChromaDB');
doc.fontSize(9).font('Helvetica').list([
  'Constructed conversational semantic search tool indexing 500+ technical PDF documents.',
  'Created streaming UI with Vite and WebSockets for low-latency question answering.'
]);
doc.moveDown(0.8);

// Skills
doc.fontSize(12).font('Helvetica-Bold').text('TECHNICAL SKILLS');
doc.strokeColor('#4F46E5').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
doc.moveDown(0.3);
doc.fontSize(9).font('Helvetica').text('• Languages: JavaScript (ES6+), TypeScript, Python, SQL, HTML5/CSS3');
doc.fontSize(9).font('Helvetica').text('• Frontend: React, Vite, React Router, Tailwind CSS, Responsive Design');
doc.fontSize(9).font('Helvetica').text('• Backend: Node.js, Express, REST APIs, Multer, Rate Limiting, Helmet, WebSockets');
doc.fontSize(9).font('Helvetica').text('• AI & LLM: Google Gemini API, OpenAI API, Ollama, Prompt Engineering, Structured JSON, Zod');
doc.fontSize(9).font('Helvetica').text('• Databases & Tools: MongoDB, Mongoose, PostgreSQL, Git, Docker, Vitest, Postman');

doc.end();

writeStream.on('finish', () => {
  console.log('Sample resume PDF generated successfully at:', outputPath);
});
