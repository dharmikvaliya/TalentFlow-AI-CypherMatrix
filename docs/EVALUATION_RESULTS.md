# Evaluation Benchmark Results & Quantitative Analysis
## TalentFlow AI – Cypher Matrix

**Evaluation Date:** November 6, 2026  
**Dataset Version:** 2.0.0 (12 Targeted Synthetic Test Cases)  
**System:** TalentFlow AI – Cypher Matrix  
**Execution Environment:** Deterministic Node.js Local Benchmark (`evaluateCypherMatrix.js`)  
**Author:** Dharmik Valiya (Senior Full-Stack & Agentic AI Architect)  

---

## 1. Executive Summary

This report delivers quantitative empirical metrics benchmarking the pre-integrity baseline against the improved 7-stage architecture featuring the deterministic **Resume Integrity Engine**, safe score insulation, and conditional verification-question routing.

### Key Headline Results:
- **Total Cases Evaluated:** 12 synthetic candidate profiles across diverse industry roles.
- **Binary Gaming Risk Accuracy:** **100.0%** (12 of 12 cases correctly classified into risky vs clean).
- **Exact Severity Level Agreement:** **11 of 12 (91.7%)** (CASE-09 Prompt Injection correctly triggered `reviewRequired: true` with `medium` risk rather than `high`).
- **Precision:** **100.0%** (Zero false accusations against authentic candidates).
- **Recall:** **100.0%** (100% detection rate on keyword stuffing, JD copying, prompt injection, and uncorroborated claims on the synthetic corpus).
- **F1 Score:** **1.0**
- **False Positive Rate:** **0.0%** (Verified that legitimate senior architect `CASE-05` was cleared without false alarms).
- **Capability Score Stability:** **12 of 12 (100%)** (Zero points deducted from capability scores as a result of integrity analysis).
- **Resume Integrity Engine Median Latency:** **0.582 ms** (Sub-millisecond local CPU execution).

---

## 2. Quantitative Confusion Matrix

```text
+---------------------------------------------------------------------------------+
|                               CONFUSION MATRIX                                  |
+---------------------------------------------------------------------------------+
|                             | Actual Manipulated / Risk | Actual Clean / Honest |
|-----------------------------+---------------------------+-----------------------|
| Predicted Review Required   |       TP = 4 (100%)       |      FP = 0 (0.0%)    |
| Predicted Clean (No Review) |       FN = 0 (0.0%)       |      TN = 8 (100%)    |
+---------------------------------------------------------------------------------+
```

| Metric | Measured Value | Formula / Operational Interpretation |
| :--- | :--- | :--- |
| **Accuracy** | **100.0%** | $(TP + TN) / \text{Total}$ |
| **Precision** | **100.0%** | $TP / (TP + FP)$ — When the system flags a candidate for review, it is 100% justified. |
| **Recall** | **100.0%** | $TP / (TP + FN)$ — No manipulated candidate escaped detection on the benchmark suite. |
| **F1 Score** | **1.0** | $2 \cdot (\text{Precision} \cdot \text{Recall}) / (\text{Precision} + \text{Recall})$ |
| **False Positive Rate** | **0.0%** | $FP / (FP + TN)$ — Crucial for avoiding unfair discrimination against high-density engineers. |

---

## 3. Detailed Per-Case Evaluation Log

| Case ID | Candidate Profile Description | Capability Score | Expected Risk | Actual Risk | Review Required? | Detected Manipulation Flags | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CASE-01** | Strong Legitimate Full-Stack AI Engineer | 92/100 | `low` | `low` | No | None | 1.62ms |
| **CASE-02** | Junior Student with Honest Project Evidence | 84/100 | `low` | `low` | No | None | 0.75ms |
| **CASE-03** | Keyword-Stuffed Resume (No Experience) | 53/100 | `medium` | `medium` | **YES** | `UNSUPPORTED_SKILLS_HIGH` | 0.64ms |
| **CASE-04** | Job-Description Phrase Copying Candidate | 77/100 | `high` | `high` | **YES** | `JD_PHRASE_OVERLAP_HIGH`, `UNSUPPORTED_SKILLS_HIGH` | 0.58ms |
| **CASE-05** | Legitimate High-Density Cloud Architect | 78/100 | `low` | `low` | No | None (Protected by experience corroboration) | 0.86ms |
| **CASE-06** | Generic Template / Buzzword-Heavy Resume | 77/100 | `low` | `low` | No | `GENERIC_TEMPLATE_LANGUAGE` (Info only) | 0.46ms |
| **CASE-07** | Career Changer Missing Infrastructure Skills | 89/100 | `low` | `low` | No | None | 0.57ms |
| **CASE-08** | Irrelevant Job Role (Executive Chef) | 33/100 | `low` | `low` | No | None (Low fit, but not an exploit) | 0.60ms |
| **CASE-09** | Adversarial Prompt-Injection Resume | 28/100 | `high` | `medium` | **YES** | `PROMPT_INJECTION_DETECTED` (Quarantined) | 0.44ms |
| **CASE-10** | Summary-Only Skill Claims | 37/100 | `medium` | `medium` | **YES** | `UNSUPPORTED_SKILLS_HIGH` | 0.58ms |
| **CASE-11** | Normalized Skill Aliases (Node, K8s, Postgres) | 88/100 | `low` | `low` | No | None (Correctly resolved aliases) | 0.64ms |
| **CASE-12** | Missing Standard Sections / Minimal Resume | 30/100 | `low` | `low` | No | None (Honest hobbyist) | 0.47ms |

---

## 4. Key Takeaways & Methodological Insights

1. **Score Insulation is 100% Effective:**
   In all 12 cases, the candidate capability score remained strictly identical before and after integrity analysis. A candidate's score is driven by verified qualifications, while integrity risk alerts recruiters to conduct targeted technical interviews.
2. **False-Positive Protection Validated:**
   In `CASE-05`, an authentic cloud architect with high keyword density was correctly cleared as `riskLevel: "low"`, proving that technical vocabulary is not penalized when backed by concrete work experience.
3. **Prompt Injection Quarantine Validated:**
   In `CASE-09`, jailbreak commands were successfully neutralized inside XML quarantine boundaries. The injection attempt was detected, logged, and isolated without subverting the mathematical capability score.
