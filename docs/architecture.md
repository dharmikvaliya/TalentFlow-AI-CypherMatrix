# TalentFlow AI — System Architecture & Workflow Specifications

**Document Status:** Complete & Verified
**System:** TalentFlow AI (CypherMatrix)
**Workflow Revision:** 7-Stage Pipeline (Integrated Resume Integrity Engine)

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph ClientLayer ["Frontend Client (React 18 + Vite)"]
        UI["Recruiter Dashboard UI"]
        UploadView["Resume Upload & JD Input"]
        LivePipeline["Autonomous Pipeline View"]
        IntegrityTab["Resume Integrity Tab"]
        ReportViewer["Markdown & Document Report Viewer"]
    end

    subgraph APILayer ["Backend Server (Node.js + Express)"]
        Router["REST API Router (/api)"]
        CandidatesCtrl["Candidates Controller"]
        RunsCtrl["Runs & Report Controller"]
        SecMiddleware["Helmet, Rate Limiter & CORS"]
        MulterService["Multer Upload Middleware (5MB Limit)"]
    end

    subgraph OrchestratorLayer ["7-Stage Recruitment Orchestration Engine"]
        PipelineRunner["Sequential Pipeline Runner"]
        StateStore["Workflow Run State & In-Memory Cache"]

        S0["Stage 0: PDF Text Extraction (Deterministic Engine)"]
        S1["Stage 1: Resume Parser Agent (LLM + Zod)"]
        S2["Stage 2: Skills Analysis Agent (LLM + Grounding)"]
        S3["Stage 3: Resume Integrity Engine (Deterministic Code)"]
        S4["Stage 4: Candidate Scoring Engine (Deterministic Rubric)"]
        S5["Stage 5: Interview Question Agent (LLM + Dynamic Routing)"]
        S6["Stage 6: Recommendation Agent (LLM + Score Guardrails)"]
        S7["Stage 7: Final Report Assembler (Deterministic Engine)"]
    end

    subgraph ProviderLayer ["AI Provider Abstraction Matrix"]
        LLMConfig["Provider Config Resolver (llmProviders.js)"]
        OpenAIAPI["OpenAI (gpt-4.1-mini)"]
        GroqAPI["Groq (llama-3.3-70b-versatile)"]
        OpenRouterAPI["OpenRouter (meta-llama/llama-3.3-70b)"]
        NvidiaAPI["NVIDIA NIM (meta/llama-3.1-70b-instruct)"]
        TogetherAPI["Together AI (Llama 3.1 70B Turbo)"]
        OllamaAPI["Ollama Local (llama3.2)"]
        MockProvider["Mock Deterministic Engine"]
    end

    subgraph PersistenceLayer ["Persistence & Cache"]
        MongoDB[("MongoDB Database")]
        MemoryCache[("In-Memory Resilience Fallback")]
    end

    UI --> Router
    Router --> SecMiddleware
    SecMiddleware --> CandidatesCtrl
    SecMiddleware --> RunsCtrl
    CandidatesCtrl --> MulterService
    CandidatesCtrl --> S0
    RunsCtrl --> PipelineRunner

    PipelineRunner --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7
    PipelineRunner --> StateStore
    StateStore -.-> MongoDB
    StateStore -.-> MemoryCache

    S1 -.-> LLMConfig
    S2 -.-> LLMConfig
    S5 -.-> LLMConfig
    S6 -.-> LLMConfig

    LLMConfig --> OpenAIAPI
    LLMConfig --> GroqAPI
    LLMConfig --> OpenRouterAPI
    LLMConfig --> NvidiaAPI
    LLMConfig --> TogetherAPI
    LLMConfig --> OllamaAPI
    LLMConfig --> MockProvider
```

---

## 2. 7-Stage Workflow Pipeline

The recruitment pipeline executes seven strictly ordered stages, ensuring that textual integrity is evaluated before interview generation and hiring recommendations:

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter / Hiring Team
    participant S0 as Stage 0: PDF Extraction
    participant S1 as Stage 1: Resume Parser (LLM)
    participant S2 as Stage 2: Skills Analysis (LLM)
    participant S3 as Stage 3: Resume Integrity Engine (Code)
    participant S4 as Stage 4: Scoring Engine (Rubric)
    participant S5 as Stage 5: Interview Questions (LLM)
    participant S6 as Stage 6: Recommendation (LLM)
    participant S7 as Stage 7: Report Assembler (Code)

    Recruiter->>S0: Upload PDF Resume + Job Description
    S0->>S0: Verify %PDF- Magic Bytes & Extract Text (<100k chars)
    S0->>S1: Raw Resume Text
    S1->>S1: Parse structured Candidate Profile (Zod Validated)
    S1->>S2: Structured Candidate Profile + JD Text
    S2->>S2: Map Skills & Verify Verbatim Resume Grounding Quotes
    S2->>S3: Profile + JD + Requirement Matches + Raw Text

    rect rgb(240, 248, 255)
        Note over S3: Stage 3: Deterministic Integrity Engine (Pure Code)<br/>Scans for repetition, JD copying, uncorroborated claims, prompt injection
        S3->>S3: Calculate Heuristic Metrics & Assign Flags
    end

    S3-->>S4: (Capability Score Insulated: Integrity Data NOT passed to Scoring)
    S2->>S4: Profile + Grounded Requirement Matches
    S4->>S4: Calculate Deterministic 0-100 Capability Score

    rect rgb(255, 250, 240)
        Note over S3,S5: Conditional Verification Routing:<br/>If risk is medium/high, pass affected skills & uncorroborated claims
        S3->>S5: Conditional Integrity Findings
    end
    S4->>S5: Score, Strengths & Gaps
    S5->>S5: Synthesize Questions + Targeted Verification Probes

    S4->>S6: Total Score & Breakdown
    S3->>S6: Advisory Integrity Summary
    S6->>S6: Apply Score Guardrails + Human Review Guidance

    S1->>S7: All Validated Stage Outputs
    S2->>S7: ...
    S3->>S7: ...
    S4->>S7: ...
    S5->>S7: ...
    S6->>S7: ...
    S7->>S7: Assemble Final JSON & Markdown Report
    S7-->>Recruiter: Audit-Ready Candidate Evaluation Report
```

---

## 3. Resume Evidence & Grounding Flow

```mermaid
flowchart TD
    RawResume["Original Extracted PDF Resume Text"] --> ParserAgent["Resume Parser Agent"]
    ParserAgent --> CandidateProfile["Candidate Profile Object"]

    CandidateProfile --> SkillsAgent["Skills Analysis Agent"]
    RawResume --> SkillsAgent
    JobDesc["Target Job Description"] --> SkillsAgent

    SkillsAgent --> ExtractedSkills["Skills with Evidence Quotes"]

    subgraph GroundingEngine ["Deterministic Evidence Grounding Engine"]
        ExtractedSkills --> SubstringCheck{"Evidence snippet exists as<br/>verbatim substring in Raw Resume?"}
        SubstringCheck -->|Yes: Exact / Normalized Match| GroundedEvidence["Evidence Verified & Grounded"]
        SubstringCheck -->|No: Hallucinated / Speculative| Downgrade["Downgrade Requirement Match to MISSING"]
    end

    GroundedEvidence --> ScoringEngine["Deterministic Scoring Engine"]
    Downgrade --> ScoringEngine
```

---

## 4. Resume Integrity Analysis Flow

```mermaid
flowchart TD
    InputData["Input: Raw Resume Text, Candidate Profile, Job Description"] --> Preprocess["Tokenize & Build Evidence Corpora"]

    subgraph EvidenceCorpusSeparation ["Evidence Corpus Classification"]
        Preprocess --> StrongCorpus["Strong Evidence: Work Experience & Concrete Projects"]
        Preprocess --> ModerateCorpus["Moderate Evidence: Education Degree / Field & Achievements"]
        Preprocess --> WeakCorpus["Weak Claims: Self-Declared Summary & Skills Lists<br/>(EXCLUDED from supporting evidence corpus)"]
    end

    subgraph ModularHeuristics ["Deterministic Heuristic Modules"]
        StrongCorpus & ModerateCorpus --> ModA["Module A: Term Repetition<br/>(Discounts verified work experience terms)"]
        StrongCorpus & ModerateCorpus --> ModB["Module B: JD Contiguous Phrase Copying<br/>(3-to-6-gram matching on contiguous tokens)"]
        StrongCorpus & ModerateCorpus --> ModC["Module C: Unsupported Skill Claims<br/>(Exact token boundary matching + explicit aliases)"]
        Preprocess --> ModD["Module D: Prompt Injection Scanning<br/>(System override detection)"]
        Preprocess --> ModE["Module E: Generic Template Language<br/>(Buzzword boilerplate detection)"]
    end

    ModA & ModB & ModC & ModD & ModE --> RiskAggregator["Fairness-First Risk Aggregator"]

    subgraph FairnessSafeguards ["Fairness Rules & Safeguards"]
        RiskAggregator --> Rule1{"Are there >= 2 independent<br/>strong signals?"}
        Rule1 -->|Yes| HighRisk["Risk Level: HIGH<br/>reviewRequired = true"]
        Rule1 -->|No: Only 1 strong signal| MedRisk["Risk Level: MEDIUM<br/>reviewRequired = (hasPromptInjection || >=8 unsupported)"]
        Rule1 -->|No: Zero strong signals| LowRisk["Risk Level: LOW<br/>reviewRequired = false"]

        HighDenseCheck{"Legitimate High Technical Density?"}
        HighDenseCheck -->|All skills corroborated in experience| LowRisk
    end
```

---

## 5. Conditional Verification-Question & Recommendation Routing

```mermaid
flowchart TD
    IntegrityResult["Resume Integrity Analysis Output"] --> RiskDecision{"riskLevel === 'medium' || 'high'<br/>OR reviewRequired === true?"}

    RiskDecision -->|Yes: Elevated Risk Signal| RouteIntegrity["Inject Neutral Verification Directive<br/>into Interview Questions Agent Context"]
    RiskDecision -->|No: Standard Candidate| RouteStandard["Standard Question Generation<br/>(Technical, Project, Behavioral, Gaps)"]

    RouteIntegrity --> QuestionAgent["Interview Questions Agent"]
    RouteStandard --> QuestionAgent

    QuestionAgent --> QuestionGuide["Output Question Guide with<br/>Category: 'verification' targeting uncorroborated skills"]

    IntegrityResult --> RecDecision{"riskLevel === 'high'?"}
    RecDecision -->|Yes| AdvisoryRec["Inject Human Verification Advisory into<br/>Recommendation Key Risks & Suggested Next Steps.<br/>Cap confidence at 'medium'.<br/>(NEVER forces 'No Hire')"]
    RecDecision -->|No| StandardRec["Standard Recommendation based on<br/>Score Guardrails (Hire/Maybe/No)"]
```

---

## 6. Error Handling & Safe Fallback Architecture

```mermaid
flowchart TD
    StageTrigger["Execute Stage: resumeIntegrity"] --> TryCatch{"Execution throws unexpected<br/>fault or regex timeout?"}

    TryCatch -->|Normal Execution| Success["Emit Validated Output JSON<br/>(riskLevel, metrics, flags)"]

    TryCatch -->|Catastrophic Error| SafeFallback["Trigger Safe Fallback Handler<br/>(recruitment.workflow.js)"]

    SafeFallback --> FallbackPayload["Emit Fallback Record:<br/>riskLevel: 'low'<br/>confidence: 0<br/>reviewRequired: true<br/>flag: 'INTEGRITY_ANALYSIS_UNAVAILABLE'<br/>summary: 'Analysis unavailable. Manual review required.'"]

    FallbackPayload --> ContinuePipeline["Log Warning & Continue Downstream Pipeline<br/>(Stage 4 Scoring -> Stage 5 Questions -> Stage 6 Rec -> Stage 7 Report)"]

    FallbackPayload --> FrontendUI["Frontend Displays Amber Notice:<br/>'Analysis Unavailable - Manual Review Required'<br/>(Never displays false-reassurance green badge)"]
```

---

## 7. Security Trust Boundaries

```mermaid
graph LR
    subgraph UntrustedZone ["Untrusted External Zone"]
        CandidateResume["Candidate PDF Resume"]
        RecruiterJD["Job Description Text"]
    end

    subgraph PerimeterZone ["Perimeter Sanitization Boundary"]
        MagicByteCheck["Magic Byte Validator (%PDF-)"]
        SizeValidator["5MB & 100k Char Cap"]
        TextSanitizer["Untrusted Content Sanitizer<br/>(Delimiter Breakout Neutralization)"]
    end

    subgraph InternalApplicationZone ["Internal Trust Zone"]
        PIIRedactor["PII Redaction Service<br/>(Email, Phone, Address Redacted)"]
        DeterministicEngines["Deterministic Code Engines<br/>(Integrity, Scoring, Assembler)"]
        DatabaseStore[("MongoDB / In-Memory Fallback")]
    end

    subgraph ExternalProviderZone ["Third-Party Cloud Boundary"]
        CloudLLMs["External LLM APIs (OpenAI, Groq, OpenRouter, Together)"]
    end

    CandidateResume --> MagicByteCheck --> SizeValidator --> TextSanitizer
    RecruiterJD --> TextSanitizer
    TextSanitizer --> PIIRedactor
    TextSanitizer --> DeterministicEngines
    PIIRedactor -->|Redacted Prompts Only| CloudLLMs
    CloudLLMs --> DeterministicEngines
    DeterministicEngines --> DatabaseStore
```
