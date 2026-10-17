# TalentFlow AI — System Architecture & Workflow Specifications

This document outlines the system architecture, sequential agent pipeline, and interaction sequence of **TalentFlow AI**.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph ClientLayer ["Frontend Client (React + Vite)"]
        UI["Recruiter Dashboard UI"]
        UploadView["Resume Upload & JD Input"]
        LivePipeline["Pipeline Status & Polling"]
        ReportViewer["Markdown / JSON Report Viewer"]
    end

    subgraph APILayer ["Backend Server (Node.js + Express)"]
        Router["REST API Router (/api)"]
        CandidatesCtrl["Candidates Controller"]
        RunsCtrl["Runs & Report Controller"]
        SecMiddleware["Helmet, Rate Limiter & CORS"]
        MulterService["Multer Upload Middleware"]
    end

    subgraph OrchestratorLayer ["Autonomous Multi-Agent Orchestrator"]
        PipelineRunner["Sequential Pipeline Runner"]
        StateStore["Shared Run State & Trace Store"]
        
        S0["Stage 0: PDF Text Extraction (code)"]
        S1["Stage 1: Resume Parser Agent (LLM + Zod)"]
        S2["Stage 2: Skills Analysis Agent (LLM + Zod)"]
        S3["Stage 3: Candidate Scoring Engine (Code Rubric + LLM)"]
        S4["Stage 4: Interview Question Agent (LLM + Zod)"]
        S5["Stage 5: Recommendation Agent (LLM + Guardrail)"]
        S6["Stage 6: Report Assembler (Code)"]
    end

    subgraph ServiceLayer ["External Services & LLM Providers"]
        LLMService["LLM Provider Abstraction"]
        OpenAIAPI["OpenAI API (gpt-4.1-mini)"]
        OllamaAPI["Local Ollama API (llama3.2)"]
        MockProvider["Deterministic Mock Provider"]
    end

    subgraph DataLayer ["Persistence Layer"]
        MongoDB[("MongoDB Database")]
        FileStorage[("Local PDF Storage /uploads")]
        MemoryCache[("In-Memory Resilience Fallback")]
    end

    UI --> Router
    Router --> SecMiddleware
    SecMiddleware --> CandidatesCtrl
    SecMiddleware --> RunsCtrl
    CandidatesCtrl --> MulterService
    MulterService --> FileStorage
    CandidatesCtrl --> S0
    RunsCtrl --> PipelineRunner

    PipelineRunner --> S1 --> S2 --> S3 --> S4 --> S5 --> S6
    PipelineRunner <--> StateStore

    S1 & S2 & S3 & S4 & S5 --> LLMService
    LLMService --> OpenAIAPI
    LLMService --> OllamaAPI
    LLMService --> MockProvider

    StateStore --> MongoDB
    StateStore --> MemoryCache
```

---

## 2. Pipeline Data Flow

```mermaid
flowchart TD
    PDF["Candidate PDF Resume"] & JD["Target Job Description"]
    
    PDF --> S0["[0] PDF Text Extraction\n(pdf-parse code)"]
    S0 -->|"rawText, pageCount, charCount"| S1["[1] Resume Parser Agent\n(OpenAI LLM + Zod)"]
    
    S1 -->|"Structured Profile\n(education, experience, projects, skills)"| S2["[2] Skills Analysis Agent\n(OpenAI LLM + Zod)"]
    JD --> S2
    
    S2 -->|"Categorized Skills + Requirement Matches\nwith Verifiable Quotes"| S3["[3] Candidate Scoring Engine\n(Code Rubric + LLM Explanation)"]
    S1 --> S3
    
    S3 -->|"0-100 Score, Breakdown,\nStrengths & Gaps"| S4["[4] Interview Question Agent\n(OpenAI LLM + Zod)"]
    S1 & S2 & JD --> S4
    
    S4 -->|"Targeted Technical, Project,\nBehavioral & Gap Questions"| S5["[5] Hiring Recommendation Agent\n(OpenAI LLM + Code Guardrails)"]
    S1 & S2 & S3 --> S5
    
    S5 -->|"Advisory Recommendation (Hire/Maybe/No),\nKey Risks, Next Steps"| S6["[6] Final Report Assembler\n(Deterministic Code)"]
    S0 & S1 & S2 & S3 & S4 --> S6
    
    S6 --> ReportJSON["Structured Report JSON"]
    S6 --> ReportMD["Downloadable Markdown Report (.md)"]
```

---

## 3. End-to-End Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Human Recruiter
    participant Client as React + Vite Client
    participant API as Express API Server
    participant Orch as Custom Orchestrator
    participant Agents as AI Agents (1-5)
    participant LLM as OpenAI API (gpt-4.1-mini)
    participant DB as MongoDB / Storage

    Recruiter->>Client: Uploads PDF & pastes Job Description
    Client->>API: POST /api/candidates/upload (multipart)
    API->>API: Validate file (PDF only, <= 5MB)
    API->>API: Extract text via pdf-parse (Stage 0)
    API->>DB: Save Candidate record
    API-->>Client: Returns candidateId + text preview

    Recruiter->>Client: Clicks "Run Analysis"
    Client->>API: POST /api/runs { candidateId, jobDescription }
    API->>DB: Initialize WorkflowRun (status: pending, stages: pending)
    API->>Orch: Start asynchronous background pipeline
    API-->>Client: Returns runId immediately (HTTP 201)

    loop Client Polling (every 1.5s)
        Client->>API: GET /api/runs/:runId
        API->>DB: Fetch latest run & stage trace status
        API-->>Client: Returns current run state
        Client->>Client: Updates PipelineView & active tab UI
    end

    Note over Orch,LLM: Sequential Pipeline Execution
    Orch->>Agents: Run Stage 1: Resume Parser
    Agents->>LLM: Prompt with rawText (JSON schema mode)
    LLM-->>Agents: Candidate profile JSON
    Agents->>Agents: Validate with Zod (retry once on error)
    Agents-->>Orch: Validated Profile
    Orch->>DB: Save Stage 1 trace (duration, output, status: success)

    Orch->>Agents: Run Stage 2: Skills Analysis
    Agents->>LLM: Profile + JD requirement matching
    LLM-->>Agents: Categorized skills with evidence quotes
    Agents->>Agents: Grounding check (verify quotes exist in text)
    Agents-->>Orch: Validated Skills Analysis
    Orch->>DB: Save Stage 2 trace

    Orch->>Orch: Run Stage 3: Deterministic Scoring Rubric (Code)
    Note over Orch: Computes 0-100 score: Required (40) + Preferred (15) + Exp (20) + Proj (15) + Edu (10)
    Orch->>LLM: Request grounded strengths & gaps explanation
    LLM-->>Orch: Strengths & gaps narrative
    Orch->>DB: Save Stage 3 trace

    Orch->>Agents: Run Stage 4: Interview Question Agent
    Agents->>LLM: Generate targeted questions linked to strengths & gaps
    LLM-->>Agents: Technical, project, behavioral & gap probing questions
    Agents-->>Orch: Validated Questions Guide
    Orch->>DB: Save Stage 4 trace

    Orch->>Agents: Run Stage 5: Recommendation Agent
    Agents->>LLM: Synthesize cumulative evaluation data
    LLM-->>Agents: Recommendation (Hire/Maybe/No), risks, next steps
    Agents->>Agents: Enforce Code Guardrails (score < 40 cannot yield Hire)
    Agents-->>Orch: Validated Advisory Recommendation
    Orch->>DB: Save Stage 5 trace

    Orch->>Orch: Run Stage 6: Report Assembler (Code)
    Note over Orch: Compiles final report JSON & Markdown without LLM hallucination
    Orch->>DB: Save WorkflowRun (status: completed, finalReport)

    Client->>API: GET /api/runs/:runId
    API-->>Client: Returns completed run with full report
    Client->>Client: Renders Final Report, Score Gauge, Questions & Traces

    Recruiter->>Client: Clicks "Download Markdown"
    Client->>API: GET /api/runs/:runId/report.md
    API-->>Recruiter: Downloads candidate-evaluation-report.md
```
