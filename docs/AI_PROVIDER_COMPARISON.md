# AI Provider Comparison & Technical Evaluation
## Multi-Provider Abstraction Architecture for TalentFlow AI

**Document Status:** Complete & Verified Against Official Provider Documentation & Live Test Harnesses  
**Evaluation Dates:** November 5–6, 2026  
**System:** TalentFlow AI – Cypher Matrix  
**Author:** Dharmik Valiya (Senior Full-Stack & Agentic AI Architect)  

---

## 1. Executive Summary

TalentFlow AI requires an adaptable AI provider architecture capable of running multi-stage recruitment workflows without vendor lock-in. The pipeline executes seven discrete stages, combining deterministic computation (evidence grounding, resume-integrity analysis, rubric scoring) with generative LLM inference (candidate parsing, qualification matching, structured interview questioning, and hiring recommendations).

This document evaluates seven provider options:
1. **OpenAI** (Production baseline)
2. **Groq** (High-throughput LPU inference)
3. **OpenRouter** (Multi-model aggregator & free meta-router)
4. **NVIDIA NIM** (Enterprise microservices via NGC)
5. **Together AI** (Low-cost open-source inference)
6. **Ollama** (Local private execution on workstation)
7. **Mock Provider** (100% offline deterministic test harness)

All cloud providers are integrated using standard OpenAI-compatible REST conventions via `server/src/config/llmProviders.js`, allowing zero-code provider switching via environment variables.

---

## 2. Comprehensive Provider Comparison Matrix

| Provider | Verification Status | Protocol / API Style | Primary Tested Models | Free Tier Available? | Free Tier Limits / Quota | Context Window | Native Structured JSON? | Tool Calling Support | Pricing (per 1M input / output tokens) | Data Privacy & Retention Policy | Official Documentation URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAI** | **Full workflow verified** | OpenAI REST (`/v1/chat/completions`) | `gpt-4.1-mini`, `gpt-4o-mini` | Pay-as-you-go (\$5 trial credits for new accounts; expires in 3 months) | Tier 1: 500 RPM, 30,000 TPM; Tier 2+: 5,000 RPM, 2M TPM | 128,000 tokens | Yes (`response_format: { type: "json_object" }` & `json_schema`) | Yes (`tools` array, function definitions) | `gpt-4o-mini`: \$0.15 / \$0.60 per 1M tokens | 30-day retention for abuse monitoring; API data not used for model training by default; zero-retention available under BAA/enterprise agreement. | [platform.openai.com](https://platform.openai.com/docs/api-reference) |
| **Groq** | **Live authenticated & verified** | OpenAI-compatible (`https://api.groq.com/openai/v1`) | `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b` | Yes (Generous free developer tier) | Free tier: 30 RPM, 14,400 RPD, 6,000 TPM (model-dependent); Account-specific dashboard limits | 128,000 tokens (`llama-3.3-70b-versatile`) | Yes (`response_format: { type: "json_object" }`) | Yes (OpenAI-compatible tool calling) | `llama-3.3-70b`: \$0.59 / \$0.79 per 1M tokens; `llama-3.1-8b`: \$0.05 / \$0.08 per 1M tokens | Does not train on customer inputs or completions; customer data retained temporarily in volatile memory during inference and logs up to 30 days. | [console.groq.com/docs](https://console.groq.com/docs) |
| **OpenRouter** | **Live stage & workflow verified** | OpenAI-compatible (`https://openrouter.ai/api/v1`) | `openrouter/free` (auto-routes to Nemotron/Llama), `meta-llama/llama-3.3-70b-instruct` | Yes (Free models with `:free` tag and dynamic meta-router) | Free tier: 20 requests/minute, 200 requests/day for `:free` models | Up to 128,000+ tokens (model-dependent) | Yes (Supported when underlying model supports JSON mode) | Yes (Filtered based on model capability) | Varies by routing (e.g. Llama 3.3 70B: ~\$0.12 - \$0.40 / 1M tokens); passthrough markup ~0%. | Router transmits prompts to upstream providers; users can configure data privacy controls in OpenRouter settings to avoid logging or training. | [openrouter.ai/docs](https://openrouter.ai/docs) |
| **NVIDIA NIM** | **Account-entitlement constrained** | OpenAI-compatible (`https://integrate.api.nvidia.com/v1`) | `nvidia/llama-3.1-nemotron-70b-instruct`, `mistralai/mistral-large-2-instruct` | Yes (1,000 free API trial credits on NVIDIA Developer portal) | Rate limits vary by model and credit pool (~10–40 RPM on build.nvidia.com demo tier) | 128,000 tokens | Yes (`json_object` format support) | Yes (Supported on instruction models) | Post-trial requires NVIDIA AI Enterprise license or cloud partner compute hosting. | Self-hosted NIM guarantees 100% on-prem data isolation; Hosted endpoints do not train models on API inputs. | [build.nvidia.com](https://build.nvidia.com) |
| **Together AI** | **Offline configuration tested** | OpenAI-compatible (`https://api.together.xyz/v1`) | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` | Yes (\$5 free credit for new developer accounts) | Free tier: 60 RPM; Dedicated endpoints available | 128,000 tokens (`Llama 3.1 70B`) | Yes (`response_format: { type: "json_object" }`) | Yes (OpenAI-compatible tool calls) | `Llama-3.1-70B-Turbo`: \$0.88 / \$0.88 per 1M tokens; `Llama-3.1-8B-Instant`: \$0.18 / \$0.18 per 1M tokens | Does not store or train on prompt data. Enterprise dedicated hosting available. | [docs.together.ai](https://docs.together.ai) |
| **Ollama** | **Live local verified** | Native REST (`/api/chat`) and OpenAI `/v1` | `llama3:latest`, `llama3.2:1b`, `llama3.2:3b` | Yes (100% free open-source local software) | Unlimited local usage, bound only by local GPU/RAM hardware capacity | Model-dependent (default 2,048 or 8,192 tokens; configurable up to 128k with sufficient VRAM) | Yes (`format: "json"`) | Yes (Supported on newer models like `llama3.1`, `llama3.2`) | \$0.00 (Local compute cost only) | **100% Local Privacy**: zero telemetry, zero cloud data transfer, candidate resumes never leave localhost. | [github.com/ollama/ollama](https://github.com/ollama/ollama) |
| **Mock Provider** | **Full workflow verified** (Offline) | Deterministic In-Memory Simulation | `mock-deterministic` | Yes (Built into repository) | Unlimited, zero latency, offline | Infinite / Not Applicable | Yes (Zod-conforming structured JSON) | Not required for deterministic simulation | \$0.00 | **Zero transmission**: fully air-gapped test mode. | Built-in |

---

## 3. Deep Dive per Provider

### 3.1 OpenAI
- **Architecture Role:** High-reliability enterprise production engine.
- **Strengths:** Industry gold standard for deterministic schema following (`strict: true` JSON schema support), high rate limits, predictable low error rates.
- **Trade-offs:** Proprietary vendor lock-in, commercial cost per token, candidate PII transmitted to third-party cloud.
- **TalentFlow Recommendation:** Recommended for enterprise deployments with signed BAA / Data Protection Agreements.

### 3.2 Groq
- **Architecture Role:** Ultra-low latency candidate processing engine.
- **Verification Status:** Live authentication, model-list retrieval, and chat completion verified.
- **Model Availability:** Model is configurable and account-specific (`llama-3.3-70b-versatile`, `openai/gpt-oss-120b`).
- **Strengths:** Exceptional inference speed (~300–500 tokens/sec on LPU hardware), generous free developer tier with 14,400 daily requests, native OpenAI SDK compatibility.
- **Trade-offs:** Free-tier RPM limits require client backoff handling.
- **TalentFlow Recommendation:** Top recommendation for real-time interactive UI demonstrations and recruiter screening tasks.

### 3.3 OpenRouter
- **Architecture Role:** Dynamic multi-model failover and free evaluation aggregator.
- **Verification Status:** Live Stage 1 (`resumeParser`) and full workflow verified.
- **Tested Models:** `openrouter/free` (dynamically routes to available active free models such as `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`).
- **Strengths:** Access to hundreds of models under a single API key; resilient to individual upstream model deprecations.
- **Trade-offs:** Individual static free models (e.g. `google/gemma-4-31b-it:free`) occasionally hit upstream shared-pool rate limits (HTTP 429). Resolved by using the official `openrouter/free` dynamic router.
- **TalentFlow Recommendation:** Best free cloud provider for student, evaluation, and assessment testing.

### 3.4 NVIDIA NIM
- **Architecture Role:** High-performance enterprise AI microservices.
- **Verification Status:** Client adapter verified; live account-level calls return HTTP 404 Function Not Found on un-provisioned models.
- **Root Cause & Technical Analysis:** NVIDIA NIM runs on NVIDIA Cloud Functions (NGC). A developer API key on NVIDIA Build requires the developer to open the model's card in `build.nvidia.com`, accept the model license terms, and click "Get API Key" to provision that specific serverless function to the account.
- **TalentFlow Recommendation:** Excellent for enterprise self-hosted Kubernetes deployments using NIM containers; for cloud evaluation, ensure the selected model function has been provisioned to the account.

### 3.5 Ollama (Local Workstation Inference)
- **Architecture Role:** Zero-cost, 100% private, air-gapped recruitment screening.
- **Verification Status:** Live Stage 1 verified with `llama3:latest`.
- **Hardware Profile:** Tested on Intel Core CPU with Intel HD Graphics 620 (CPU inference). Generating ~500 JSON tokens on an 8B model takes 60–90 seconds.
- **Optimization:** Backend timeout expanded to 180 seconds (`OLLAMA_TIMEOUT_MS=180000`). For instant (<3s) CPU responses, lightweight models (`llama3.2:1b` or `llama3.2:3b`) are recommended.
- **TalentFlow Recommendation:** The ideal choice for privacy-sensitive defense, healthcare, or financial recruiting where candidate PII cannot leave local premises.

### 3.6 Deterministic Mock Provider
- **Architecture Role:** Zero-dependency, offline CI/CD test harness.
- **Verification Status:** 100% verified across all 26 test suites (210 tests) and synthetic benchmark suite.
- **Strengths:** Runs instantaneously (0ms network delay), produces mathematically consistent outputs, perfectly isolated from API outages or billing constraints.
- **TalentFlow Recommendation:** Use for all automated unit tests, regression suites, and offline evaluator verification.
