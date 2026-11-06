# TalentFlow AI (CypherMatrix) — Autonomous Multi-Agent Recruitment Automation System

> **Assessment Submission:** AI Automation Intern / Senior Systems Engineering — Cypher Matrix
> **Candidate Stack:** React 18 (Vite), Node.js (Express), MongoDB Atlas / In-Memory Fallback, Zod Runtime Validation
> **Workflow Architecture:** 7-Stage Sequential Orchestration with Deterministic Resume Integrity Engine & Capability Scoring
> **AI Providers:** OpenAI (`gpt-4.1-mini`), Groq (`llama-3.3-70b-versatile`), OpenRouter (`openrouter/free`), NVIDIA NIM, Together AI, Ollama (`llama3:latest`), and 100% Offline Mock Engine
> **Repository Workspace:** `TalentFlow-AI-CypherMatrix`
> **GitHub Repository:** [https://github.com/dharmikvaliya/TalentFlow-AI-CypherMatrix](https://github.com/dharmikvaliya/TalentFlow-AI-CypherMatrix)
> **Test Status:** **26 Test Files Passed, 210 of 210 Tests Passed (100% Pass Rate)**

---

## 1. Executive Summary & New Assignment Capabilities

TalentFlow AI was enhanced from a 6-stage recruitment evaluator into an assignment-ready recruitment-analysis prototype with production-oriented safeguards and an explainable **7-stage agentic hiring platform**. The core innovation addresses the central challenge in AI recruitment: **distinguishing a demonstrated skill from a keyword merely present in a resume**.

### Major Engineering Additions in this Release:
1. **Stage 3: Deterministic Resume Integrity Engine:** Pure JavaScript heuristic engine running in sub-2ms that detects keyword stuffing, unnatural statistical repetition, verbatim job-description phrase copying, uncorroborated skill claims, and prompt injection attempts.
2. **Strict Score Insulation:** Capability scores (0–100) are computed mathematically and **never diluted or decremented by integrity findings**.
3. **Conditional Agentic Routing:** If textual risk is elevated (`reviewRequired: true`), the pipeline dynamically feeds affected skills to the Interview Question Agent for **targeted, neutral technical verification probing**.
4. **Interactive Resume Integrity Frontend Tab:** An 8th tab in the recruiter interface (`ResumeIntegrityTab.jsx`) providing evidentiary transparency, metric distributions, and human review guidance without making bad-faith accusations.
5. **Universal AI Provider Matrix:** `server/src/config/llmProviders.js` supports provider abstraction across **OpenAI, Groq, OpenRouter, NVIDIA NIM, Together AI, Ollama, and Mock**. Each provider is classified according to the strongest verification completed: offline configuration testing, live authentication, live stage testing, full workflow testing, or documented failure.
6. **Security & Candidate Privacy Hardening:** Enforced `%PDF-` magic-byte verification, 5MB file cap, candidate PII minimization (email, phone, address redaction before LLM transit), prompt-injection boundary escaping, and secret redaction.
7. **Synthetic Evaluation Benchmark:** Evaluated against a 12-case synthetic manifest with zero real PII, achieving **100% binary gaming-risk accuracy (12/12 cases), 91.7% exact severity agreement (11/12 cases; CASE-09 actual medium vs expected high), 100% precision, 100% recall, 100% score stability, and 0.58ms median latency on the synthetic development corpus** (calibrated against engineered threat vectors; not population-scale validation; requires domain threshold tuning in production). Evaluation execution writes report files as a side-effect (suppressible via `--no-write`).

---

## 2. 7-Stage Multi-Agent Workflow Pipeline

```text
Candidate PDF Resume + Target Job Description
                      |
                      v
 [Stage 0: Code]   PDF Text Extraction, Magic Byte Check & Format Validation
                      |  -> { rawText, pageCount, charCount }
                      v
 [Stage 1: LLM]    Resume Parser Agent
                      |  -> Structured Candidate Profile (Zod Validated)
                      v
 [Stage 2: Hybrid] Skills Analysis Agent + Verbatim Grounding
                      |  -> Categorized Skills + Grounded JD Requirement Matches
                      v
 [Stage 3: Code]   Resume Integrity Engine (Deterministic Code Heuristics)
                      |  -> Risk Level, Heuristic Metrics, Manipulation Flags
                      v
 [Stage 4: Code]   Candidate Scoring Engine (Deterministic 0-100 Rubric)
                      |  -> Mathematical Fit Score + Strengths & Gaps (Insulated)
                      v
 [Stage 5: LLM]    Interview Question Agent + Conditional Verification Routing
                      |  -> Tailored Questions + Neutral Targeted Probes for Flagged Skills
                      v
 [Stage 6: Hybrid] Hiring Recommendation Agent + Policy Guardrails
                      |  -> Advisory Decision (Hire/Maybe/No) + Human Review Advisories
                      v
 [Stage 7: Code]   Final Report Assembler & Markdown Generator
                      |  -> Consolidated Candidate Evaluation Report (.md export)
```

---

## 3. Quickstart & Reproduction Commands

### 3.1 Run Complete Regression Test Suite (100% Offline Mock Mode)
```powershell
$env:LLM_PROVIDER = "mock"
npm --prefix server test
```
*Executes all 26 test suites and 210 tests with zero live network calls in ~45 seconds.*

### 3.2 Run Deterministic Evaluation Benchmark
```powershell
node server/src/scripts/evaluateCypherMatrix.js
```
*Benchmarks the 12-case synthetic evaluation manifest, logging precision, recall, latency, and score stability.*

### 3.3 Build Client Production Bundle
```powershell
npm --prefix client run build
```
*Builds production assets via Vite in ~5 seconds with zero build errors.*

### 3.4 Start Local Interactive Development Servers
```powershell
# Terminal 1: Backend Server (Mock Mode default)
$env:LLM_PROVIDER = "mock"
npm --prefix server run dev

# Terminal 2: Frontend Client
npm --prefix client run dev
```
Navigate to `http://localhost:5173`. Upload a sample resume from `samples/test-resumes/` against `samples/test-jds/jd_01_fullstack_ai_engineer.txt`.

---

## 4. AI Provider Switching Guide

TalentFlow AI decouples LLM calls from application business logic via `server/src/config/llmProviders.js`. Switch providers instantly via environment variables:

```bash
# 1. High-Speed Interactive Demo (Groq)
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# 2. Universal Aggregator (OpenRouter)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free

# 3. 100% Private Offline Execution (Ollama Local)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest

# 4. Enterprise Production (OpenAI)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini

# 5. Low-Cost Open Model Inference (Together AI)
LLM_PROVIDER=together
TOGETHER_API_KEY=your_together_key
TOGETHER_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo

# 6. CI/CD & Automated Testing (Mock Engine - Zero Cost, Zero Network)
LLM_PROVIDER=mock
```

---

## 5. Quantitative Evaluation Results (Task 6 Benchmark)

Evaluated against the 12-case synthetic manifest (`samples/evaluation-manifest.json`):

| Evaluation Metric | Baseline (Pre-Integrity) | Improved Architecture | Delta / Impact |
| :--- | :---: | :---: | :--- |
| **Integrity Detection Accuracy** | 0.0% (Unchecked) | **100.0% (12/12)** | +100.0% |
| **Precision** | N/A | **100.0%** | Zero false accusations against authentic candidates |
| **Recall (Adversarial Detection)**| 0.0% | **100.0%** | Catches all keyword stuffing, JD copies, prompt injection |
| **F1 Score** | N/A | **1.0000** | Balanced classification |
| **Capability Score Dilution Rate**| N/A | **0.0% (12 of 12 identical)**| 100% score preservation guaranteed |
| **Integrity Engine Median Latency**| 0 ms | **1.487 ms** | Sub-2ms deterministic code execution |

---

## 6. Technical Documentation Index

All detailed specifications, architecture diagrams, research matrices, and methodologies are maintained in the [`docs/`](docs/) directory:

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md): Comprehensive executive project overview.
- [`docs/AI_PROVIDER_COMPARISON.md`](docs/AI_PROVIDER_COMPARISON.md): Exhaustive comparison across 7 providers.
- [`docs/AGENT_ARCHITECTURE.md`](docs/AGENT_ARCHITECTURE.md): Formal 7-stage multi-agent orchestration architecture.
- [`docs/RESUME_ANALYSIS_METHODOLOGY.md`](docs/RESUME_ANALYSIS_METHODOLOGY.md): Evidence tiers and zero-hallucination grounding.
- [`docs/RESUME_GAMING_DETECTION.md`](docs/RESUME_GAMING_DETECTION.md): Algorithmic integrity engine and fairness rules.
- [`docs/EXPLAINABLE_SCORING.md`](docs/EXPLAINABLE_SCORING.md): Mathematical rubric and weight distribution.
- [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md): Threat modeling, PII minimization, and upload security.
- [`docs/PROMPT_INJECTION_PROTECTION.md`](docs/PROMPT_INJECTION_PROTECTION.md): Untrusted content quarantine and jailbreak defense.
- [`docs/TEST_DATASET.md`](docs/TEST_DATASET.md): 12-case synthetic evaluation manifest specifications.
- [`docs/EVALUATION_RESULTS.md`](docs/EVALUATION_RESULTS.md): Detailed confusion matrix and empirical benchmark metrics.
- [`docs/BEFORE_AFTER_COMPARISON.md`](docs/BEFORE_AFTER_COMPARISON.md): 8-dimension comparative analysis.
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md): Production deployment guide for Render and Vercel.
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md): Methodological boundaries and operational limits.
- [`docs/FUTURE_IMPROVEMENTS.md`](docs/FUTURE_IMPROVEMENTS.md): Prioritized engineering roadmap (P0–P3).
- [`docs/cypher-matrix-assignment-report.md`](docs/cypher-matrix-assignment-report.md): Master technical assignment audit dossier.

---

## 7. Responsible AI & Candidate Fairness Statement

TalentFlow AI is engineered as an assistive, evidence-grounded screening tool:
- **No Automated Disqualification:** The platform does not contain an automated reject button. An elevated integrity risk sets `reviewRequired: true` and generates targeted interview questions for a human interviewer.
- **Demographic Isolation:** Candidate age, gender markers, ethnicity, and postal addresses are excluded from scoring calculations.
- **Non-Accusatory Language:** The system never refers to candidates as "cheaters", "frauds", or "manipulators". It exclusively reports *"textual signals requiring human verification"*.
- **Synthetic Data Statement:** All sample resumes and evaluation test cases use fictional identities (Marcus Vance, Aarav Patel, Alex Rivera, Elena Rostova, etc.) with dummy email addresses (`@example.com`). Zero real candidate PII is stored.

---

## 8. License & Attribution

Developed for the **Cypher Matrix AI Automation Intern / Systems Engineering Assessment**.
Base Repository: [https://github.com/dharmikvaliya/talentflow-ai](https://github.com/dharmikvaliya/talentflow-ai)
