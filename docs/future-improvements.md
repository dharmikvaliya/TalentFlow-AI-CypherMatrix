# Future Improvements & Production Engineering Roadmap

**Document Status:** Complete & Prioritized  
**System:** TalentFlow AI (CypherMatrix)  
**Planning Horizon:** 2026 – 2027  

---

## 1. Roadmap Prioritization Framework

Future enhancements for TalentFlow AI are structured into four priority tiers:
- **P0: Immediate Production Security & Compliance** (Prerequisites for processing real candidate data).
- **P1: Evaluation Accuracy & Forensic Detection** (Advanced textual and visual verification).
- **P2: Scalability, Performance & Multi-Tenancy** (Enterprise deployment readiness).
- **P3: Experimental Research & Candidate Experience** (Advanced AI capabilities).

---

## 2. Priority Breakdown

### P0: Immediate Production Security & Compliance

1. **Enterprise Authentication & RBAC:**
   - Integrate OAuth 2.0 / OpenID Connect (OIDC) with enterprise identity providers (Okta, Microsoft Entra ID, Google Workspace).
   - Implement role-based access control (Admin, Senior Recruiter, Hiring Manager, Technical Interviewer, Auditor).
2. **Organization-Level Multi-Tenancy:**
   - Partition MongoDB collections and in-memory caches by `tenantId` to ensure zero cross-organization data leakage.
   - Separate rate limits and billing quotas on a per-tenant basis.
3. **Automated Audit Logging & Tamper Evidence:**
   - Implement append-only cryptographic audit logs recording every workflow stage transition, configuration edit, and recruiter viewing event.
   - Maintain compliance with GDPR Article 22 (automated decision-making) and EU AI Act high-risk AI system mandates.
4. **Data Retention & Candidate Erasure (Right to be Forgotten):**
   - Provide automated 30/60/90-day data retention lifecycles with hard database deletion of candidate resumes, extracted text, and generated reports upon request.

---

### P1: Evaluation Accuracy & Forensic Detection

1. **PDF Render-Layer Forensics:**
   - Implement a headless rasterization engine (e.g. `pdf2pic` / `pdf.js` worker) to detect microscopic fonts (< 1pt), white text rendered on white canvas backgrounds, and content drawn outside visible viewport boundaries.
2. **OCR Integration for Scanned & Photograph Resumes:**
   - Add an optional sandboxed OCR service (Tesseract.js or cloud OCR adapter) with pre-processing (deskewing, binarization) to support scanned paper resumes without crashing.
3. **Semantic Embedding Similarity for Paraphrase Detection:**
   - Complement exact n-gram matching with dense sentence transformer vector embeddings (e.g. `all-MiniLM-L6-v2`) to catch semantic paraphrasing of job description requirements.
4. **Dynamic Threshold Auto-Calibration:**
   - Build a feedback loop where recruiter interview outcomes ("Candidate genuinely possessed skill" vs "Candidate lacked skill") dynamically calibrate unsupported skill and phrase overlap thresholds across distinct job families.

---

### P2: Scalability, Performance & Multi-Tenancy

1. **Asynchronous Message Queue Architecture:**
   - Migrate synchronous in-process workflow execution to a distributed worker queue (BullMQ with Redis, or AWS SQS / RabbitMQ).
   - Decouple multi-minute document processing from HTTP request-response cycles with WebSocket progress streaming.
2. **Job Description Entity & Cache Optimization:**
   - Extract Job Descriptions into dedicated first-class database entities with pre-computed requirement embeddings and n-gram catalogs, avoiding repeated parsing when evaluating hundreds of candidates against the same job opening.
3. **Configurable Scoring Rubrics per Department:**
   - Provide a recruiter admin UI to customize the mathematical rubric weights (e.g. 50% technical skills for senior roles vs 30% projects for campus intern roles).
4. **Multi-Model Routing & Cost Optimization:**
   - Dynamically route simple stages (`resumeParser`) to ultra-fast, low-cost models (Groq Llama 3.1 8B) while routing complex stages (`recommendation`) to frontier reasoning models (OpenAI `gpt-4o`).

---

### P3: Experimental Research & Ecosystem Integration

1. **Live ATS Integration Connectors:**
   - Build standard bi-directional webhooks and connectors for major ATS platforms: Greenhouse, Lever, Workday, and Ashby.
2. **Interactive Recruiter-in-the-Loop Interview Assistant:**
   - Real-time technical interview sidecar assisting interviewers with live question suggestions, follow-up probes based on candidate answers, and automated rubric scoring assistance.
3. **Multilingual Resume & JD Support:**
   - Native cross-lingual skills extraction and integrity evaluation for non-English documents (German, Spanish, French, Japanese, Mandarin).
4. **Credential & GitHub Repository Verification:**
   - Optional candidate-authorized integration with GitHub APIs, Kaggle, and credential verification providers (Credly) to cross-reference declared code repositories and certificates against actual public commits and badges.
