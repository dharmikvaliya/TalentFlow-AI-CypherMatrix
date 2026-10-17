# TalentFlow AI — Agent Specifications & Prompt Catalog

This document provides complete technical specifications for all agents and processing stages in **TalentFlow AI**.

---

## Stage 0: PDF Text Extraction (Deterministic Code)

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/services/pdf.service.js` |
| **Type** | Code-based extraction (`pdf-parse`) |
| **Purpose** | Extract unformatted raw text, page count, and character count from candidate resumes. Rejects corrupt or scanned/image-only PDFs. |
| **Input** | PDF binary stream / file path |
| **Output** | `{ rawText: string, pageCount: number, charCount: number }` |
| **Error Handling** | Throws `UNSUPPORTED_PDF_FORMAT` if extractable characters < 30 ("No extractable text; scanned PDFs are not supported"). |

---

## Stage 1: Resume Parser Agent

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/agents/resumeParser.agent.js` |
| **Type** | LLM Agent (OpenAI `gpt-4.1-mini` / Ollama / Mock) + Zod validation |
| **Purpose** | Transform raw extracted PDF text into a structured candidate profile. |
| **Input Schema** | `{ rawText: z.string().min(20) }` |
| **Security Directives** | System prompt enforces security boundaries; raw text is enclosed within `<UNTRUSTED_RESUME_TEXT>` tags and treated strictly as passive data, blocking prompt injection instructions. |
| **Output Schema** | `resumeParserOutputSchema` (`name`, `email`, `phone`, `links`, `summary`, `education`, `experience`, `projects`, `skillsListed`, `achievements`) |
| **Prompt Template** | `You are an expert AI Resume Parser. Extract candidate profile into strictly structured JSON. RULES: Use ONLY information present in input. Do not invent. If unknown, use null or []. Maintain chronological accuracy.` |
| **Retry Strategy** | If initial output fails Zod validation, the Zod error format is sent back to the model in a single corrective retry prompt. If provider call fails, typed `LLMProviderError` is thrown (no silent mock fallback unless explicitly enabled). |
| **Responsible Hiring** | Missing fields are stored as `null` or `[]`, never guessed. Personal attributes are isolated. |

---

## Stage 2: Skills Analysis Agent

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/agents/skillsAnalysis.agent.js` |
| **Type** | LLM Agent (OpenAI `gpt-4.1-mini` / Ollama / Mock) + Grounding Verification |
| **Purpose** | Categorize candidate skills across 9 domains, attach verbatim resume evidence, and evaluate candidate match against JD requirements. |
| **Input Schema** | `{ profile: resumeParserOutputSchema, jobDescription: z.string().min(20), rawText: string }` |
| **Security Directives** | Inputs enclosed in `<UNTRUSTED_RESUME_TEXT>` and `<UNTRUSTED_JOB_DESCRIPTION>` tags with explicit prompt injection defense instructions. |
| **Output Schema** | `skillsAnalysisOutputSchema` (`jobRequirements`, `skills: [{ name, category, proficiency, evidence, source }]`, `requirementMatches: [{ requirement, type, status, evidence, reasoning }]`, `summary`) |
| **Prompt Template** | `You are a Senior Technical Recruiter and AI Skills Analyst. Map candidate skills to categories (language, frontend, backend, database, ai_ml, cloud_tools, core_cs, soft, other). Map qualifications to required/preferred with status (match, partial, missing) and verbatim evidence.` |
| **Evidence Grounding** | **Strict RawText Verification:** Verifies that cited evidence snippets exist as exact or near-exact substrings strictly in `rawText` (candidate PDF text only, never synthetic profile text). Rejects paraphrases or ungrounded claims; downgrades unverified matches to `missing` (or `partial` only if genuine evidence exists). Speculative "easy to learn" justifications are disallowed. |
| **Retry Strategy** | Retry-once with validation error feedback. |

---

## Stage 3: Candidate Scoring Engine (Hybrid)

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/agents/scoring.agent.js` + `server/src/config/scoringRubric.js` |
| **Type** | Deterministic Code Rubric + LLM Grounded Explanation (OpenAI / Ollama / Mock) |
| **Purpose** | Compute an objective 0-100 score based on transparent mathematical weights and generate grounded strengths & gaps. |
| **Input Schema** | `{ profile: resumeParserOutputSchema, skillsAnalysis: skillsAnalysisOutputSchema }` |
| **Security Directives** | Candidate data enclosed in `<UNTRUSTED_RESUME_DATA>` to insulate scoring explanation from prompt injection. |
| **Output Schema** | `fullScoringOutputSchema` (`totalScore`, `breakdown: [{ component, weight, earned, explanation }]`, `strengths`, `gaps`, `scoreExplanation`) |
| **Rubric Weights** | - Required skills match: **40 pts** (match=1.0, partial=0.5, missing=0)<br>- Preferred skills match: **15 pts**<br>- Relevant experience: **20 pts** (verified software roles with seniority gap reduction)<br>- Relevant projects: **15 pts** (demonstrated stack)<br>- Education & fit: **10 pts** (CS/STEM degree) |
| **Responsible Hiring** | **Candidate personal attributes (name, email, phone, links, gender, age) are stripped** prior to LLM evaluation to eliminate demographic bias. |
| **LLM Rule** | The LLM receives the fixed numerical breakdown and writes qualitative explanations. **The LLM is strictly prohibited from altering or inventing numeric scores.** All numerical values in the final explanation are code-assembled. |

---

## Stage 4: Interview Question Agent

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/agents/interviewQuestions.agent.js` |
| **Type** | LLM Agent (OpenAI `gpt-4.1-mini` / Ollama / Mock) + Zod validation |
| **Purpose** | Generate tailored, high-signal interview questions directly linked to candidate strengths, gaps, and specific projects. |
| **Input Schema** | `{ profile, skillsAnalysis, strengths, gaps, jobDescription }` |
| **Security Directives** | Candidate data enclosed in `<UNTRUSTED_RESUME_DATA>` and target requirements in `<UNTRUSTED_JOB_DESCRIPTION>` tags with prompt injection immunity directives. |
| **Output Schema** | `interviewQuestionsOutputSchema` (`technical`, `projectBased`, `behavioral`, `gapProbing`) |
| **Question Counts** | 4-5 technical, 3 project-based, 2-3 behavioral, 2-3 gap-probing. |
| **Linkage Requirement** | Every question links directly to a specific target skill, project name, or identified gap. Includes `"whatToLookFor"` evaluation criteria for recruiters. |

---

## Stage 5: Hiring Recommendation Agent

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/agents/recommendation.agent.js` |
| **Type** | LLM Agent (OpenAI `gpt-4.1-mini` / Ollama / Mock) + Deterministic Code Guardrails |
| **Purpose** | Synthesize holistic candidate evaluation into an advisory hiring recommendation (Hire, Maybe, No) with confidence, risks, and next steps. |
| **Input Schema** | `{ profile, skillsAnalysis, scoring, interviewQuestions }` |
| **Security Directives** | Candidate data enclosed in `<UNTRUSTED_RESUME_DATA>` tags to prevent malicious injection from hijacking advisory recommendation logic. |
| **Output Schema** | `recommendationOutputSchema` (`recommendation`, `confidence`, `reasoning`, `keyRisks`, `suggestedNextSteps`, `disclaimer`) |
| **Code Guardrails** | - Score < 45 automatically downgrades "Hire" to "No"<br>- Score 45-59 automatically downgrades "Hire" to "Maybe"<br>- Seniority gap (<1.5 yrs for senior role) caps confidence at "medium"<br>- Prevents LLM optimism from contradicting objective mathematical scoring facts. |
| **Advisory Notice** | Explicit mandatory disclaimer: hiring decisions remain with qualified human recruiters. |

---

## Stage 6: Final Report Assembler (Deterministic Code)

| Specification | Details |
| :--- | :--- |
| **Module** | `server/src/report/reportAssembler.js` |
| **Type** | Deterministic Code Compiler |
| **Purpose** | Aggregate all validated upstream outputs into a consolidated report in structured JSON and downloadable Markdown formats. |
| **Input** | Outputs from stages 0 through 5 + stage execution traces |
| **Output Formats** | 1. JSON document conforming to `finalReportSchema`<br>2. Formatted Markdown document (`candidate-evaluation-report.md`) |
| **Security & Escaping** | All candidate-supplied and LLM-generated text fields pass through `escapeMarkdownAndHtml` to escape HTML tags (`<script>`, etc.) and table metacharacters (`|`, brackets), eliminating XSS risks and rendering breakage. |
| **Design Decision** | Assembled purely in deterministic code with **zero additional LLM calls**, guaranteeing that facts, quotes, scores, and questions cannot be silently modified. |
