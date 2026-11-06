# 02. Requirements and Scope Traceability Matrix

## TalentFlow AI – Cypher Matrix
### HR Assignment Specification & Implementation Traceability

**Target Organization:** Cypher Matrix  
**Recipient:** HR Sushmita & Technical Evaluation Committee  
**Candidate:** Dharmik Valiya  
**Date of Record:** November 6, 2026  
**Status:** 100% Implemented & Verified  

---

## 1. Assignment Scope Overview

The Cypher Matrix Internship Assignment requires transforming the baseline TalentFlow recruitment platform into an enterprise-grade, agentic AI candidate screening and verification system. The assignment specifies 5 core technical pillars spanning 20 discrete engineering capabilities:

1. **Pillar 1: Multi-Provider AI Abstraction & Research**
2. **Pillar 2: Intelligent Resume & PDF Analysis**
3. **Pillar 3: Resume Integrity & Adversarial Gaming Detection**
4. **Pillar 4: Explainable Scoring & Candidate Evaluation**
5. **Pillar 5: Enterprise Security, Candidate Privacy & Rigorous Evaluation**

---

## 2. Master Requirement Traceability Matrix (RTM)

The following matrix maps every requirement from the HR assignment brief to its corresponding research, production implementation, test coverage, and documentation reference.

| ID | HR Assignment Requirement | Research Performed | Implementation Artifacts | Automated Test Suite | Documentation File | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Multi-Provider AI Abstraction Layer | Evaluated OpenAI, Groq, OpenRouter, NVIDIA NIM, Ollama, and Together AI for API compatibility. | `server/src/services/llm.service.js`<br>`server/src/config/providers.config.js` | `server/tests/unit/llm.service.test.js`<br>`server/tests/integration/provider-switching.test.js` | `docs/03_AI_PROVIDER_RESEARCH.md`<br>`docs/04_PROVIDER_COMPARISON.md` | **Verified Complete** |
| **REQ-02** | Dynamic Runtime Provider Switching | Tested in-flight model swapping without server restart via REST API and UI dropdown. | `server/src/routes/provider.routes.js`<br>`client/src/components/ProviderSelector.jsx` | `server/tests/integration/provider-switching.test.js` | `docs/04_PROVIDER_COMPARISON.md`<br>`docs/05_SYSTEM_ARCHITECTURE.md` | **Verified Complete** |
| **REQ-03** | Comprehensive AI Provider Benchmark | Benchmarked latency, context window, pricing, output reliability, and rate limits. | `scripts/benchmark-providers.js`<br>`docs/ai-provider-comparison.json` | Live API verification runs | `docs/03_AI_PROVIDER_RESEARCH.md`<br>`docs/04_PROVIDER_COMPARISON.md` | **Verified Complete** |
| **REQ-04** | Agentic Workflow & Dynamic Orchestration | Designed 7-stage directed workflow with conditional branching and data flow state. | `server/src/services/agent.service.js`<br>`server/src/agents/*.js` | `server/tests/unit/agent.service.test.js`<br>`server/tests/integration/pipeline.test.js` | `docs/06_AGENT_DESIGN_AND_WORKFLOW.md` | **Verified Complete** |
| **REQ-05** | Intelligent PDF Extraction & Validation | Implemented PDF magic-byte checks (`%PDF-`), buffer boundary validation, and text extraction. | `server/src/services/pdf.service.js`<br>`server/src/middleware/upload.js` | `server/tests/unit/pdf.service.test.js`<br>`server/tests/unit/upload.test.js` | `docs/07_RESUME_ANALYSIS_METHODOLOGY.md`<br>`docs/10_SECURITY_AND_PRIVACY.md` | **Verified Complete** |
| **REQ-06** | Multi-Tier Evidence Extraction | Established 3-tier hierarchy separating demonstrated experience from self-proclaimed claims. | `server/src/agents/resumeParser.agent.js`<br>`server/src/agents/skillsAnalysis.agent.js` | `server/tests/unit/resumeParser.agent.test.js`<br>`server/tests/unit/skillsAnalysis.agent.test.js` | `docs/07_RESUME_ANALYSIS_METHODOLOGY.md` | **Verified Complete** |
| **REQ-07** | Statistical Keyword Stuffing Detection | Developed frequency density counter ($\ge 4\%$ share, $\ge 7$ occurrences) discounted by actual work history. | `server/src/agents/resumeIntegrity.agent.js` (`detectKeywordStuffing`) | `server/tests/unit/resumeIntegrity.agent.test.js`<br>`server/tests/integration/integrity-pipeline.test.js` | `docs/08_RESUME_GAMING_DETECTION.md` | **Verified Complete** |
| **REQ-08** | Verbatim Job Description Copy Detection | Implemented sliding-window n-gram tokenizer scanning contiguous 3-to-6-word sequences against JD. | `server/src/agents/resumeIntegrity.agent.js` (`detectVerbatimJDCopying`) | `server/tests/unit/resumeIntegrity.agent.test.js` | `docs/08_RESUME_GAMING_DETECTION.md` | **Verified Complete** |
| **REQ-09** | Uncorroborated Skill Inflation Detection | Built cross-section validator flagging skills appearing only in summary/skills sections. | `server/src/agents/resumeIntegrity.agent.js` (`detectUnsupportedSkills`) | `server/tests/unit/resumeIntegrity.agent.test.js` | `docs/08_RESUME_GAMING_DETECTION.md` | **Verified Complete** |
| **REQ-10** | Senior Engineer False-Positive Protection | Implemented dual-signal rule ($\ge 2$ independent signals) preventing penalization of authentic experts. | `server/src/agents/resumeIntegrity.agent.js` (`assessOverallIntegrity`) | `server/tests/unit/resumeIntegrity.agent.test.js`<br>`server/tests/unit/integrity-fairness.test.js` | `docs/08_RESUME_GAMING_DETECTION.md` | **Verified Complete** |
| **REQ-11** | Transparent Resume Integrity UI Tab | Created dedicated React view displaying gaming findings, severity flags, and flagged excerpts. | `client/src/components/ResumeIntegrityTab.jsx`<br>`client/src/pages/CandidateDetail.jsx` | Client Vite build validation | `docs/08_RESUME_GAMING_DETECTION.md` | **Verified Complete** |
| **REQ-12** | Explainable Mathematical Capability Scoring | Formulated 0–100 deterministic scoring algorithm across 5 weighted evidence tiers in code. | `server/src/agents/scoring.agent.js`<br>`server/src/services/scoring.service.js` | `server/tests/unit/scoring.agent.test.js`<br>`server/tests/unit/scoring.service.test.js` | `docs/09_EXPLAINABLE_SCORING.md` | **Verified Complete** |
| **REQ-13** | Score Insulation Guarantee | Ensured integrity findings never decrement technical capability scores, preventing double jeopardy. | `server/src/agents/scoring.agent.js` | `server/tests/unit/scoring.agent.test.js` | `docs/09_EXPLAINABLE_SCORING.md` | **Verified Complete** |
| **REQ-14** | Adaptive Technical Interview Questioning | Connected integrity engine outputs to Interview Agent to generate neutral, targeted verification probes. | `server/src/agents/interviewQuestions.agent.js` | `server/tests/unit/interviewQuestions.agent.test.js` | `docs/06_AGENT_DESIGN_AND_WORKFLOW.md` | **Verified Complete** |
| **REQ-15** | Adversarial Prompt-Injection Defense | Encapsulated untrusted resume text inside `<untrusted_resume_content>` with jailbreak stripping. | `server/src/services/llm.service.js`<br>`server/src/utils/sanitize.js` | `server/tests/unit/sanitize.test.js`<br>`server/tests/integration/prompt-injection.test.js` | `docs/10_SECURITY_AND_PRIVACY.md` | **Verified Complete** |
| **REQ-16** | Client & Server PII Masking | Implemented regex-driven scrubbing for phone numbers, emails, addresses, and social links. | `server/src/utils/pii.js`<br>`client/src/utils/piiMasker.js` | `server/tests/unit/pii.test.js` | `docs/10_SECURITY_AND_PRIVACY.md` | **Verified Complete** |
| **REQ-17** | Synthetic Test Dataset (12 Cases) | Curated 12 synthetic test resumes covering authentic, gaming, stuffed, injected, and edge profiles. | `server/tests/fixtures/synthetic-resumes.json`<br>`docs/evaluation-results.json` | `server/tests/integration/synthetic-corpus.test.js` | `docs/11_TEST_DATASET_AND_METHODOLOGY.md` | **Verified Complete** |
| **REQ-18** | Quantitative Baseline Comparison | Measured execution speed, detection recall, score stability, and error rates against v1 baseline. | `scripts/run-evaluation.js`<br>`docs/evaluation-report.md` | Comprehensive regression suite | `docs/12_EVALUATION_RESULTS.md`<br>`docs/13_BEFORE_AFTER_COMPARISON.md` | **Verified Complete** |
| **REQ-19** | Zero Live-to-Mock Fallback Policy | Enforced strict error escalation in live mode; prohibited silent fallback masking API failures. | `server/src/services/llm.service.js` | `server/tests/unit/llm.service.test.js` | `docs/05_SYSTEM_ARCHITECTURE.md`<br>`docs/10_SECURITY_AND_PRIVACY.md` | **Verified Complete** |
| **REQ-20** | Production Deployment & Audit Readiness | Deployed live Vercel frontend, Render backend, MongoDB Atlas database, and full documentation. | `render.yaml`<br>`vercel.json`<br>`docs/*` | CI build and live HTTP health check | `docs/16_DEPLOYMENT_AND_OPERATIONS.md`<br>`submission/*` | **Verified Complete** |

---

## 3. Delimitation of Scope & Decisions

### 3.1 Together AI Policy
Together AI was comprehensively researched and benchmarked alongside other cloud providers. However, per project specifications, **Together AI is designated as Research-Only and is completely excluded from active runtime selection and deployment configuration**. The active platform runtime relies on OpenAI, Groq, OpenRouter, NVIDIA NIM, Local Ollama, and the deterministic Mock provider.

### 3.2 Evaluation Methodology
Testing was conducted using a 12-case synthetic development corpus calibrated against known manipulation patterns. The reported 100% precision and recall metrics represent internal benchmark validation against engineered threat vectors rather than an uncalibrated population-scale clinical trial.
