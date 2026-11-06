import React from 'react';
import { Layers, ShieldCheck, Database, Cpu, CheckCircle2, ArrowDown, FileText, AlertTriangle } from 'lucide-react';

const stages = [
  {
    step: '0',
    name: 'PDF Text Extraction & Security Ingestion',
    type: 'Code (pdf-parse) + PII Redaction',
    desc: 'Extracts clean, unformatted raw text, page count, and character counts from candidate PDFs. Enforces magic-byte (%PDF-) validation, a 5MB buffer ceiling, rejects empty/scanned files, and applies automatic candidate PII masking prior to agent ingestion.',
    input: 'PDF Binary stream / file path',
    output: '{ rawText, pageCount, charCount, redactedCorpus }',
    purpose: 'Document sanitization, security boundary enforcement & PII privacy protection'
  },
  {
    step: '1',
    name: 'Resume Parser Agent',
    type: 'LLM Agent + Zod',
    desc: 'Extracts candidate demographics, education, professional experience, key projects, listed skills, and achievements into a strictly typed candidate profile with zero hallucinated dates or grades.',
    input: 'Sanitized rawText',
    output: 'Structured Profile (education, experience, projects, skillsListed)',
    purpose: 'Zero-hallucination structured candidate profile extraction'
  },
  {
    step: '2',
    name: 'Skills Analysis Agent',
    type: 'LLM Agent + Zod',
    desc: 'Categorizes technical skills across 9 domains, attaches verbatim textual evidence from the resume, and maps qualifications against the target Job Description into mandatory (required) and preferred qualifications (match, partial, missing).',
    input: 'Structured Profile + Job Description + rawText',
    output: 'Categorized Skills + Requirement Matches with Grounded Evidence',
    purpose: 'Evidence-grounded qualification verification with strict missing-means-missing rules'
  },
  {
    step: '3',
    name: 'Resume Integrity Engine',
    type: 'Deterministic Code Heuristics (< 2ms CPU)',
    desc: 'A pure, blazing-fast deterministic analysis engine executing 4 forensic tests: keyword stuffing detection, contiguous verbatim JD copy matching (≥ 8-word spans), uncorroborated skill inflation detection, and dual-signal fairness safeguards (no penalty without dual corroborated signals).',
    input: 'Raw Resume Text + Target Job Description + Parsed Profile',
    output: 'Integrity Score (0-100), Risk Level (Low/Medium/High), Detected Anomalies & Evidence',
    purpose: 'Forensic detection of resume gaming, AI prompt injection & keyword cramming with score insulation'
  },
  {
    step: '4',
    name: 'Candidate Scoring Engine',
    type: 'Deterministic Code Rubric (Score Insulation Guarantee)',
    desc: 'A transparent mathematical rubric computes a 0-100 candidate score: Required Skills (35%), Experience (25%), Projects (20%), Preferred Skills (10%), and Education (10%). The LLM generates concise, evidence-grounded strengths and gap explanations without inventing numerical scores.',
    input: 'Requirement Matches + Profile + Deterministic Rubric Weights',
    output: '0-100 Score, Dimension Breakdown, Grounded Strengths & Gaps',
    purpose: 'Transparent, reproducible candidate evaluation with absolute score insulation from LLM drift'
  },
  {
    step: '5',
    name: 'Adaptive Interview Question Agent',
    type: 'LLM Agent + Zod + Conditional Routing',
    desc: 'Constructs targeted interview questions directly cross-referenced to candidate gaps, verified portfolio projects, and soft skills. Conditionally injects targeted technical probing questions if uncorroborated skills or integrity flags are detected.',
    input: 'Profile + Skills Analysis + Scoring Gaps + Integrity Flags',
    output: 'Technical, Project-based, Behavioral, and Adaptive Integrity Verification Questions',
    purpose: 'Adaptive, interview-ready candidate verification guide'
  },
  {
    step: '6',
    name: 'Hiring Recommendation Agent',
    type: 'LLM Agent + Guardrail Code',
    desc: 'Synthesizes an advisory recommendation (Strong Hire, Hire, Maybe, or Reject) with confidence score, key risks, and next steps. Hard code-level guardrails strictly prevent candidates scoring below 65 from receiving a Hire recommendation.',
    input: 'All prior stage outputs (Profile, Matches, Score, Integrity, Questions)',
    output: 'Recommendation (Strong Hire/Hire/Maybe/Reject), Risks, Next Steps, Human Advisory Disclaimer',
    purpose: 'Objective hiring summary with mandatory Human-in-the-Loop advisory guardrails'
  },
  {
    step: '7',
    name: 'Final Report Assembler',
    type: 'Deterministic Code',
    desc: 'Compiles all agent outputs, deterministic score breakdowns, integrity findings, and interview guides into a consolidated JSON deliverable and a downloadable Markdown audit report with execution trace logs.',
    input: 'Outputs from stages 0 through 6',
    output: 'Final Candidate Report (Audit-Ready JSON & Downloadable Markdown)',
    purpose: 'Auditable, traceable recruiting deliverable for HR and engineering hiring managers'
  }
];

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          How TalentFlow AI Works
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '720px', margin: '0 auto' }}>
          A transparent 7-stage multi-agent pipeline combining deterministic code rubrics with structured LLM reasoning and real-time resume integrity heuristics.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
            <Layers size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Custom Orchestrator</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Agents never call each other directly. A centralized sequential workflow controls execution, manages state, handles retries, and enforces stage boundaries.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--success)' }}>
            <ShieldCheck size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Deterministic Scoring</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            The LLM never invents numbers. The 0-100 candidate score is computed purely by transparent code evaluating match states against a mathematical rubric (35/25/20/10/10).
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: '#d97706' }}>
            <AlertTriangle size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Resume Integrity</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Sub-2ms deterministic heuristics detect keyword stuffing, verbatim JD copying, and uncorroborated skills with dual-signal fairness and score insulation.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--info)' }}>
            <Cpu size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Evidence Grounding</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Every identified skill, strength, and gap is tied directly to verbatim quotes extracted from the resume, preventing hallucinations and recruiting bias.
          </p>
        </div>
      </div>

      {/* Pipeline Flow Diagram Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Cpu size={18} color="var(--primary)" />
            Sequential 7-Stage Agent Workflow & Data Flow
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {stages.map((st, idx) => (
            <div key={st.step}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                padding: '1.2rem',
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: st.step === '3' ? '#d97706' : 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  {st.step}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{st.name}</div>
                    <span className="badge" style={{
                      background: st.step === '3' ? '#fef3c7' : '#e2e8f0',
                      color: st.step === '3' ? '#92400e' : '#334155',
                      border: st.step === '3' ? '1px solid #fde68a' : 'none'
                    }}>
                      {st.type}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    {st.desc}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Input: </span>
                      <code>{st.input}</code>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Output: </span>
                      <code>{st.output}</code>
                    </div>
                  </div>
                </div>
              </div>

              {idx < stages.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0.25rem 0' }}>
                  <ArrowDown size={18} color="var(--primary)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
