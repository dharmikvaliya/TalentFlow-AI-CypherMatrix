# Known Limitations & Methodology Boundaries

**Document Status:** Complete & Audited  
**System:** TalentFlow AI (CypherMatrix)  
**Classification:** Technical & Operational Risk Disclosure  

---

## 1. Executive Summary

TalentFlow AI delivers significant improvements in candidate evaluation, evidence grounding, multi-provider flexibility, and resume integrity detection. However, all automated recruitment and natural language processing systems possess inherent boundaries.

This document formally records the known technical, architectural, heuristic, and operational limitations of the system as of November 2026.

---

## 2. Integrity Detection & Heuristic Limitations

### 2.1 Textual Signals Do Not Prove Intent
- The Resume Integrity Engine scans for textual patterns: statistical repetition, contiguous phrase overlap, uncorroborated claims, and prompt-injection signatures.
- **Critical Limitation:** Textual signals indicate risk, **not dishonesty or moral intent**. A candidate with high JD phrase overlap may have naively followed standard career-counseling advice to "tailor their resume to the job description" rather than attempting to deceive.
- *Mitigation:* The system enforces neutral language (`"Verification recommended"`, `"Human review required"`), strictly bars accusations of cheating, and requires human interviewers to conduct verification.

### 2.2 Inability to Detect Fabricated Work Experience from Text Alone
- If a candidate writes a detailed, grammatically authentic, and metric-rich description of a project or job role that they never actually performed, textual analysis cannot distinguish this from genuine experience.
- *Mitigation:* Automated resume analysis must always be accompanied by formal professional reference checks, employment history verification, and technical live coding interviews.

### 2.3 Semantic Paraphrasing of Job Descriptions
- The JD-copying module detects contiguous 3-to-6-word verbatim phrase overlap.
- If an applicant uses an automated LLM paraphraser to rewrite job description requirements into equivalent synonyms with modified sentence structure, exact n-gram matching will not trigger high overlap.
- *Mitigation:* Future roadmap includes dense vector embedding cosine similarity comparisons between JD requirement vectors and resume paragraph embeddings.

### 2.4 Render-Layer PDF Forensics (White-on-White / Off-Page Text)
- The extraction engine utilizes `pdf-parse`, which extracts text streams from PDF content objects.
- It cannot analyze font color rendering (e.g. white text on a white background), font sizes below 1pt (microscopic keyword injection), or text drawn outside printable canvas coordinates.
- *Mitigation:* Documented for future P0 PDF render-layer rasterization inspection.

### 2.5 Scanned Resumes & OCR Absence
- Resumes uploaded as scanned bitmaps, photographed camera images, or flattened raster graphics without an embedded text layer yield fewer than 30 characters and are rejected with `UNSUPPORTED_PDF_FORMAT`.
- The current implementation does not include Tesseract or cloud OCR engines to preserve a lightweight dependency footprint.

---

## 3. Security, Privacy & Infrastructure Limitations

### 3.1 Heuristic PII Minimization
- The `piiRedaction.service.js` utility uses pattern-based regular expressions to redact standard international and North American emails, phone numbers, and street addresses.
- While effective on standard formats, highly non-standard international address conventions, atypical phone number formatting, or names that mimic common dictionary words may not be fully redacted.
- *Mitigation:* Evaluated as an engineering defense-in-depth measure, not a cryptographic privacy guarantee.

### 3.2 Lack of Authentication & Multi-Tenancy in Demo Scope
- The public REST API currently lacks JWT/OAuth authentication, role-based access control (RBAC), and multi-tenant data isolation.
- Rate limiting is enforced per IP address (`MAX_RUNS_PER_DAY` and 2 runs/hour limit).
- **Mandatory Policy:** The application in its current state is designed for local evaluation and controlled demonstrations. **Real candidate PII must not be hosted on a public deployment without an enterprise authentication gateway.**

### 3.3 Provider Performance Variance
- LLM outputs across OpenAI, Groq, OpenRouter, Together AI, and Ollama vary in nuance, context window efficiency, and speed.
- While Zod schemas enforce deterministic output contracts, different underlying models may exhibit varying levels of extraction granularity on complex multi-column resumes.

---

### 3.4 AI Provider Test Outcomes & Production Readiness
- **OpenAI:** Full workflow verified live (Stage 1 to 7 completed with `gpt-4.1-mini`, Run ID `6aec45fa541eda875a9b27c6`). Recommended for high-accuracy production deployments.
- **Groq:** Full workflow verified live (Stage 1 to 7 completed with `openai/gpt-oss-120b`, Run ID `6aec4a7bddf91259faae639c`). Ultra-low inference latency (~300 tok/s).
- **OpenRouter:** Live stage test verified with `google/gemma-4-31b-it:free` (Stage 1 resume parsing succeeded live). Full workflow was not verified live across all 7 stages on free tier due to rate limits and upstream routing variance. Important: Free router aliases such as `openrouter/free` carry severe output token truncation risks on complex resumes. Free models are subject to upstream ephemeral availability; no guaranteed free model claim is made.
- **NVIDIA NIM:** Live test failed. API authentication was verified, but NVIDIA decommissioned legacy model endpoints like `meta/llama-3.1-70b-instruct` (returning HTTP 410 Gone), and alternate model endpoints returned HTTP 404 or transient 500 without active organization provisioning. Configuration-supported and offline adapter tested, but full workflow is not verified live.
- **Ollama:** Offline configuration tested. Local REST adapter (`/api/chat`) tested via unit tests; live daemon was not verified in this audit session.
- **Mock Engine:** Full workflow verified offline (100% deterministic, 25 test files, 201 tests passing).

---

## 4. Dataset & Evaluation Boundaries

### 4.1 Synthetic Dataset Size
- The benchmark evaluation dataset comprises 12 carefully engineered synthetic test cases covering all core assignment scenarios.
- While achieving 100% precision, 100% recall, and 100% score stability across these cases, a 12-case dataset is a targeted benchmark rather than a population-scale validation.
- *Mitigation:* Production enterprise deployments must execute continuous shadow evaluation against thousands of anonymized real-world candidate records.

### 4.2 Threshold Calibration Needs
- Thresholds for statistical repetition (7 occurrences / 4% content share), JD phrase overlap (0.12 for high, 0.06 for moderate), and unsupported skill ratios (0.50 for high, 0.35 for moderate) were calibrated against diverse synthetic resumes.
- Different industry verticals (e.g. academic curriculum vitae vs early-career gig work) may require domain-specific threshold tuning.
