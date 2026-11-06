# 14. Known Engineering & Algorithmic Limitations

## TalentFlow AI – Cypher Matrix
### Explicit Boundary Conditions, Algorithmic Constraints & Technical Trade-offs

**Author:** Dharmik Valiya  
**Target Organization:** Cypher Matrix  
**Date of Record:** November 6, 2026  
**Status:** Transparent Engineering Disclosure  

---

## 1. Document Extraction & PDF Parsing Boundaries

### 1.1 Multi-Column and Complex Layout Flattening
- **Current Limitation:** TalentFlow AI utilizes `pdf-parse`, which extracts text streams based on the physical ordering of text elements inside the PDF content stream. 
- **Impact:** Resumes formatted in intricate multi-column layouts, floating sidebars, or magazine-style graphics can occasionally have their text streams interleaved or flattened out of chronological order (e.g., a left sidebar skill list intermingled with work experience bullets).
- **Mitigation:** The parser agent utilizes contextual heuristic re-assembly, but in extreme layout cases, experience duration matching may be slightly degraded.

### 1.2 Scanned Raster PDFs & Absence of Native OCR
- **Current Limitation:** The platform does not currently bundle a Tesseract or cloud-based optical character recognition (OCR) engine.
- **Impact:** Resumes submitted as flattened scanned bitmap images or exported as vector graphics without embedded text fonts return zero extracted characters, causing an HTTP 400 "Empty or unparseable text" error.
- **Mitigation:** The frontend displays an explicit error message prompting candidates to upload text-based PDFs generated from Word, Google Docs, or LaTeX.

---

## 2. Integrity Detection Algorithmic Boundaries

### 2.1 Cross-Language & Multi-Lingual Limitations
- **Current Limitation:** The statistical keyword density counter, sliding-window n-gram matcher, and technical skill taxonomy are currently calibrated primarily for English-language resumes and requisitions.
- **Impact:** Resumes submitted in German, French, Spanish, or Hindi may not trigger stop-word discounting accurately, potentially causing slightly higher or lower term density calculations.

### 2.2 Standard Industry Boilerplate in Verbatim Matching
- **Current Limitation:** Certain compliance phrases (e.g., *"Equal Opportunity Employer"*, *"participated in daily Agile standups and sprint planning meetings"*) appear identically across hundreds of resumes and job descriptions.
- **Mitigation:** The verbatim copying engine incorporates a stop-word preservation filter and a minimum phrase length threshold ($n \ge 3$). However, resumes that repeat standard boilerplate may accumulate minor false-positive n-gram overlaps ($< 15\%$). The dual-signal rule ensures these overlaps never trigger high-risk classifications.

---

## 3. Provider & Infrastructure Constraints

### 3.1 Local Workstation Hardware Constraints (Ollama)
- **Current Limitation:** On workstations lacking dedicated NVIDIA GPU tensor cores, executing 7B or 8B parameter models locally on dual-core CPUs requires 60 to 90 seconds per stage.
- **Mitigation:** Expanded HTTP client timeouts to 180 seconds (`OLLAMA_TIMEOUT_MS=180000`) and recommended lightweight 1B/3B models (`llama3.2:1b`, `llama3.2:3b`) for instant local execution.

### 3.2 Shared Free-Tier API Rate Limits (OpenRouter)
- **Current Limitation:** The `openrouter/free` endpoint utilizes a shared public queue. During peak global hours, upstream providers occasionally return HTTP 429 (Rate Limit Exceeded) or HTTP 503 (Provider Capacity Exhausted).
- **Mitigation:** Implemented dynamic exponential backoff and transparent error messaging to prevent silent failures.

### 3.3 Synthetic Corpus Scope
- **Current Limitation:** The 100% precision and recall metrics reported in the evaluation suite were achieved on a curated 12-case synthetic development benchmark.
- **Disclosure:** While these cases were rigorously engineered to stress-test known manipulation vectors, they represent internal developer benchmark validation rather than a population-scale clinical hiring trial across thousands of real-world resumes.
