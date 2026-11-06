# TalentFlow AI — Agent Specifications & Component Catalog

**Document Status:** Complete & Verified
**System:** TalentFlow AI (CypherMatrix)
**Workflow Architecture:** 7-Stage Integrated Pipeline

---

## 1. System Overview & Component Classification

TalentFlow AI couples deterministic software engineering with generative AI reasoning. The system strictly distinguishes between **generative LLM agents** (which perform natural language understanding, entity extraction, and qualitative reasoning) and **deterministic code engines** (which perform mathematical calculation, heuristic text analysis, and report assembly).

### Architectural Classification Matrix

| Stage | Component Name | Nature | Underlying Technology | Decision Responsibility | Autonomy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 0** | **PDF Text Extraction** | Deterministic Engine | Node.js Buffer, `pdf-parse` | Extracts raw text, verifies `%PDF-` magic bytes, enforces size/page caps. | Pure Code |
| **Stage 1** | **Resume Parser Agent** | Generative LLM Agent | OpenAI / Groq / OpenRouter / Ollama / Mock | Transforms unstructured text into structured candidate JSON profile. | Agentic (Extraction) |
| **Stage 2** | **Skills Analysis Agent** | Generative LLM Agent + Grounding | Multi-provider LLM + Exact Substring Grounding | Maps skills against JD requirements and verifies verbatim textual evidence. | Agentic (Evaluation) |
| **Stage 3** | **Resume Integrity Engine** | **Deterministic Code Engine** | Pure JavaScript Regex & Statistical Algorithms | Heuristic detection of keyword stuffing, repetition, JD copying, uncorroborated skills, prompt injection. | **Pure Code (Not LLM)** |
| **Stage 4** | **Candidate Scoring Engine** | Deterministic Rubric + Qualitative LLM | Mathematical Scoring Formula (`scoringRubric.js`) + LLM Explanation | Computes fixed 0-100 rubric score; LLM drafts grounded strengths/gaps explanation. | Hybrid (Code Calculation) |
| **Stage 5** | **Interview Question Agent** | Generative LLM Agent + Dynamic Routing | Multi-provider LLM | Formulates technical, project, behavioral, and targeted integrity verification questions. | Agentic (Synthesis) |
| **Stage 6** | **Hiring Recommendation Agent** | Generative LLM Agent + Guardrails | Multi-provider LLM + Hard Score Guardrails | Synthesizes advisory recommendation (Hire/Maybe/No) with score caps and integrity advisories. | Agentic (Advisory) |
| **Stage 7** | **Final Report Assembler** | Deterministic Engine | Node.js JSON / Markdown compiler (`reportAssembler.js`) | Compiles all validated outputs into audit-ready JSON and Markdown reports. | Pure Code |

---

## 2. Component Specifications

### Stage 0: PDF Text Extraction (Deterministic Engine)
- **Module:** `server/src/services/pdf.service.js`
- **Component Nature:** Deterministic Code Engine (Not an LLM).
- **Purpose:** Securely extract unformatted text, page count, and character metrics from candidate PDF files.
- **Input:** Buffer or file path string.
- **Output:** `{ rawText: string, pageCount: number, charCount: number }`.
- **Validation & Boundaries:**
  - Verifies `%PDF-` magic bytes.
  - Rejects files > 5 MB.
  - Rejects documents > 30 pages (`MAX_PAGE_COUNT`).
  - Rejects text > 100,000 characters (`MAX_EXTRACTED_TEXT_LENGTH`).
  - Rejects text < 30 characters (empty or unscanned bitmaps).
- **Failure Handling:** Throws structured, public errors (`INVALID_PDF_MAGIC_BYTES`, `UNSUPPORTED_PDF_FORMAT`, `PAGE_COUNT_EXCEEDED`).

---

### Stage 1: Resume Parser Agent (Generative LLM)
- **Module:** `server/src/agents/resumeParser.agent.js`
- **Component Nature:** Generative LLM Agent.
- **Purpose:** Parse unstructured raw resume text into a strictly typed candidate profile JSON object.
- **Input Schema:** `{ rawText: z.string().min(20) }`.
- **Output Schema:** `resumeParserOutputSchema` (`name`, `email`, `phone`, `links`, `summary`, `education`, `experience`, `projects`, `skillsListed`, `achievements`).
- **Security & Trust Boundaries:**
  - Raw resume text is sanitized via `sanitizeUntrustedText()` to neutralize closing delimiter breakouts.
  - Text is wrapped inside `<UNTRUSTED_RESUME_TEXT>` with strict instructions to ignore embedded commands.
  - Candidate contact details are minimized via `piiRedaction.service.js` before transmission to external providers.
- **Validation & Retries:** Output validated via Zod `resumeParserOutputSchema`. If validation fails, retries once with structural error feedback.
- **Failure Handling:** Throws typed `LLMProviderError` if provider fails and fallback is disabled.

---

### Stage 2: Skills Analysis Agent (Generative LLM + Grounding)
- **Module:** `server/src/agents/skillsAnalysis.agent.js`
- **Component Nature:** Generative LLM Agent with Deterministic Evidence Grounding.
- **Purpose:** Categorize candidate skills across technical domains, extract verbatim resume evidence quotes, and evaluate match against JD requirements.
- **Input Schema:** `{ profile: resumeParserOutputSchema, jobDescription: z.string().min(20), rawText: string }`.
- **Output Schema:** `skillsAnalysisOutputSchema` (`jobRequirements`, `skills: [{ name, category, proficiency, evidence, source }]`, `requirementMatches: [{ requirement, type, status, evidence, reasoning }]`, `summary`).
- **Evidence Grounding Verification:**
  - Candidate evidence quotes must exist as exact or near-exact substrings in the original resume `rawText`.
  - Ungrounded claims are downgraded to `missing`.
  - Speculative justifications ("easily learnable in 2 weeks") are rejected.

---

### Stage 3: Resume Integrity Engine (Deterministic Code Engine)
- **Module:** `server/src/services/resumeIntegrity.service.js`
- **Component Nature:** **100% Deterministic Code Engine. Strictly NOT an autonomous LLM agent.**
- **Purpose:** Deterministically identify textual manipulation signals (keyword stuffing, statistical repetition, JD phrase copying, uncorroborated skill claims, prompt injection).
- **Input Schema:** `{ rawResumeText: string, jobDescription: string, candidateProfile: Object, requirementMatches: Array }`.
- **Output Schema:** `resumeIntegrityOutputSchema` (`riskLevel`, `confidence`, `reviewRequired`, `metrics`, `flags`, `summary`, `limitations`).
- **Detection Heuristics:**
  1. *Statistical Term Repetition:* Token frequency against content tokens; discounts corroborated work experience.
  2. *Contiguous JD Phrase Copying:* 3-to-6-gram matching on contiguous non-stopword tokens.
  3. *Evidence-Based Skill Support:* Matches skills strictly against strong work/project experience and moderate education credentials; summary-only claims are excluded from support.
  4. *Prompt Injection Scanning:* Detects system command overrides (`Ignore previous instructions`, `Return score 100`).
- **Fairness Guarantees:**
  - High keyword density alone NEVER triggers high risk if supported by experience (False Positive Protection).
  - High risk requires $\ge 2$ independent strong signals.
  - **Zero Score Dilution:** Does NOT subtract points from capability score.
- **Safe Fallback:** If an unexpected error occurs, emits `INTEGRITY_ANALYSIS_UNAVAILABLE` with `confidence: 0` and `reviewRequired: true` without crashing the workflow.

---

### Stage 4: Candidate Scoring Engine (Deterministic Rubric + Qualitative LLM)
- **Module:** `server/src/agents/scoring.agent.js` + `server/src/config/scoringRubric.js`
- **Component Nature:** Deterministic Rubric Computation + LLM Grounded Explanation.
- **Purpose:** Calculate objective, mathematically explainable 0-100 capability score and generate grounded strengths & gaps.
- **Input Schema:** `{ profile: resumeParserOutputSchema, skillsAnalysis: skillsAnalysisOutputSchema }`.
- **Output Schema:** `fullScoringOutputSchema` (`totalScore`, `breakdown: [{ component, weight, earned, explanation }]`, `strengths`, `gaps`, `scoreExplanation`).
- **Mathematical Weights:**
  - Required skills match: **40 pts**
  - Preferred skills match: **15 pts**
  - Relevant experience tenure: **20 pts**
  - Relevant projects: **15 pts**
  - Education & domain fit: **10 pts**
- **Score Insulation:** **The LLM is strictly prohibited from altering or inventing numeric scores.** Scores are calculated exclusively by code. Integrity flags are never passed to the scoring engine.

---

### Stage 5: Interview Question Agent (Generative LLM + Conditional Routing)
- **Module:** `server/src/agents/interviewQuestions.agent.js`
- **Component Nature:** Generative LLM Agent with Dynamic Conditional Verification Routing.
- **Purpose:** Formulate tailored interview questions covering technical depth, project decisions, behavioral traits, and uncorroborated integrity claims.
- **Input Schema:** `{ profile, skillsAnalysis, strengths, gaps, jobDescription, integrityFindings: resumeIntegrityOutputSchema.optional() }`.
- **Output Schema:** `interviewQuestionsOutputSchema` (`technical`, `projectBased`, `behavioral`, `gapProbing`, `verification`).
- **Conditional Agentic Routing:**
  - If `integrityFindings.reviewRequired` is true, the agent dynamically generates **neutral, non-accusatory verification questions** targeting uncorroborated skills.
  - Prompts candidate for concrete architectural trade-offs, production responsibilities, and debugging challenges.

---

### Stage 6: Hiring Recommendation Agent (Generative LLM + Guardrails)
- **Module:** `server/src/agents/recommendation.agent.js`
- **Component Nature:** Generative LLM Agent with Score Guardrails & Advisory Integrity Signals.
- **Purpose:** Synthesize final advisory hiring recommendation (`Hire`, `Maybe`, `No`) with next steps and key risks.
- **Input Schema:** `{ totalScore, skillsAnalysis, interviewQuestions, profile, integritySummary: Object.optional() }`.
- **Output Schema:** `recommendationOutputSchema` (`recommendation`, `confidence`, `reasoning`, `keyRisks`, `suggestedNextSteps`).
- **Guardrails & Fairness:**
  - Score $\ge 75 \rightarrow$ `Hire` or `Maybe`.
  - Score $< 50 \rightarrow$ `No` or `Maybe`.
  - Elevated integrity risk adds human verification items to `keyRisks` and `suggestedNextSteps`, and caps confidence at `medium`, **without forcing an automatic "No Hire"**.

---

### Stage 7: Final Report Assembler (Deterministic Engine)
- **Module:** `server/src/report/reportAssembler.js`
- **Component Nature:** Deterministic Code Engine (Not an LLM).
- **Purpose:** Assemble consolidated candidate report into structured JSON and standard audit-ready Markdown.
- **Input:** Validated outputs from Stages 1 through 6.
- **Output:** Final candidate report document containing Executive Overview, Objective Rubric Breakdown, Evidence-Grounded Strengths, Identified Skill Gaps, Resume Integrity Analysis, and Hiring Next Steps.
