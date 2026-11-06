import React from 'react';
import { Layers, ShieldCheck, Database, Cpu, CheckCircle2, ArrowDown, FileText, AlertTriangle, Binary, Sparkles, Scale } from 'lucide-react';

const preprocessingStep = {
  step: '0',
  badgeLabel: 'Deterministic Preprocessing (Code)',
  name: 'PDF Text Extraction & Security Ingestion',
  type: 'Code (pdf-parse) + PII Redaction',
  desc: 'Extracts clean, unformatted raw text, page count, and character counts from candidate PDFs. Enforces magic-byte (%PDF-) validation, a 5MB buffer ceiling, rejects empty/scanned files, and applies automatic candidate PII masking prior to agent ingestion.',
  input: 'PDF Binary stream / file path',
  output: '{ rawText, pageCount, charCount, redactedCorpus }',
  purpose: 'Document sanitization, security boundary enforcement & PII privacy protection'
};

const stages = [
  {
    step: '1',
    badgeLabel: 'Stage 1 • LLM Agent + Zod',
    name: 'Resume Parser Agent',
    type: 'LLM Agent + Zod Runtime Schema',
    desc: 'Extracts candidate demographics, education, professional experience, key projects, listed skills, and achievements into a strictly typed candidate profile with zero hallucinated dates or grades.',
    input: 'Sanitized rawText',
    output: 'Structured Profile (education, experience, projects, skillsListed, achievements)',
    purpose: 'Zero-hallucination structured candidate profile extraction'
  },
  {
    step: '2',
    badgeLabel: 'Stage 2 • LLM Agent + Zod',
    name: 'Skills Analysis Agent',
    type: 'LLM Agent + Zod Evidence Grounding',
    desc: 'Categorizes technical skills across 9 domains, attaches verbatim textual evidence from the resume, and maps qualifications against the target Job Description into mandatory (required) and preferred qualifications (match, partial, missing) with strict missing-means-missing rules.',
    input: 'Structured Profile + Job Description + rawText',
    output: 'Categorized Skills + Requirement Matches with Grounded Verbatim Evidence',
    purpose: 'Evidence-grounded qualification verification with strict missing-means-missing enforcement'
  },
  {
    step: '3',
    badgeLabel: 'Stage 3 • Deterministic Engine (< 2ms)',
    name: 'Resume Integrity Engine',
    type: 'Deterministic Code Heuristics (< 2ms CPU)',
    desc: 'Pure, blazing-fast deterministic analysis engine executing 4 forensic tests: keyword stuffing detection (term frequency thresholds), contiguous verbatim JD copy matching (≥ 8-word spans), uncorroborated skill inflation detection (skills in header absent from experience/projects), and dual-signal fairness safeguards (no penalty without dual corroborated signals). Yields an Integrity Score (0–100) and Risk Rating: Low (85–100), Medium (60–84), High (< 60).',
    input: 'Raw Resume Text + Target Job Description + Parsed Profile',
    output: 'Integrity Score (0-100), Risk Level (Low/Medium/High), Detected Anomalies & Evidence',
    purpose: 'Forensic detection of resume gaming, AI prompt injection & keyword cramming with score insulation'
  },
  {
    step: '4',
    badgeLabel: 'Stage 4 • Deterministic Rubric',
    name: 'Candidate Scoring Engine',
    type: 'Deterministic Code Rubric (Score Insulation Guarantee)',
    desc: 'A transparent mathematical rubric computes a 0-100 candidate score: Required Skills (40%), Relevant Experience (20%), Preferred Skills (15%), Relevant Projects (15%), and Education Fit (10%) totaling 100%. The LLM generates concise, evidence-grounded strengths and gap explanations without inventing numerical scores. Score Insulation Guarantee: Integrity flags never subtract points from this capability score.',
    input: 'Requirement Matches + Profile + Deterministic Rubric Weights (40/20/15/15/10)',
    output: '0-100 Capability Score, 5-Dimension Breakdown, Grounded Strengths & Gaps',
    purpose: 'Transparent, reproducible candidate evaluation with absolute score insulation from LLM drift'
  },
  {
    step: '5',
    badgeLabel: 'Stage 5 • LLM Agent + Adaptive Routing',
    name: 'Interview Question Agent',
    type: 'LLM Agent + Zod + Conditional Routing',
    desc: 'Constructs targeted interview questions directly cross-referenced to candidate gaps, verified portfolio projects, and soft skills. Adaptive Routing: Conditionally injects targeted technical probing questions if uncorroborated skills or integrity flags are detected in Stage 3.',
    input: 'Profile + Skills Analysis + Scoring Gaps + Integrity Flags',
    output: 'Technical, Project-based, Behavioral, and Adaptive Integrity Verification Questions',
    purpose: 'Adaptive, interview-ready candidate verification guide'
  },
  {
    step: '6',
    badgeLabel: 'Stage 6 • LLM Agent + Guardrails',
    name: 'Hiring Recommendation Agent',
    type: 'LLM Agent + Code Guardrails',
    desc: 'Synthesizes an advisory recommendation (Strong Hire, Hire, Maybe / Further Review, or Reject) with confidence score, key risks, and next steps. Hard code-level guardrails strictly prevent candidates scoring below 65 from receiving a Hire recommendation.',
    input: 'All prior stage outputs (Profile, Matches, Score, Integrity, Questions)',
    output: 'Recommendation (Strong Hire/Hire/Maybe/Reject), Confidence (0-1), Risks, Next Steps, Human Advisory Disclaimer',
    purpose: 'Objective hiring summary with mandatory Human-in-the-Loop advisory guardrails'
  },
  {
    step: '7',
    badgeLabel: 'Stage 7 • Deterministic Code',
    name: 'Final Report Assembler',
    type: 'Deterministic Code',
    desc: 'Compiles all agent outputs, deterministic score breakdowns, integrity findings, and interview guides into a consolidated JSON deliverable and a downloadable Markdown audit report retaining millisecond execution trace logs for all stages.',
    input: 'Outputs from preprocessing Step 0 through Stage 6',
    output: 'Final Candidate Report (Audit-Ready JSON & Downloadable Markdown Dossier)',
    purpose: 'Auditable, traceable recruiting deliverable for HR and engineering hiring managers'
  }
];

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          How TalentFlow AI Works
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '740px', margin: '0 auto', lineHeight: 1.6 }}>
          A transparent multi-agent architecture combining deterministic document preprocessing, evidence-grounded LLM reasoning, sub-2ms resume integrity heuristics, and an explainable 5-dimension capability rubric.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
            <Layers size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Custom Orchestrator</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Agents never call each other directly. A centralized sequential workflow controls execution, manages state, handles retries, and enforces stage boundaries.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--success)' }}>
            <Scale size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Deterministic Scoring</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            The LLM never invents numbers. The 0-100 score is computed purely by transparent code evaluating match states against the 5-dimension rubric (40/20/15/15/10 = 100%).
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: '#d97706' }}>
            <AlertTriangle size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Resume Integrity</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sub-2ms deterministic heuristics detect keyword stuffing, verbatim JD copying, and uncorroborated skills with dual-signal fairness and score insulation.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--info)' }}>
            <ShieldCheck size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Evidence Grounding</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Every identified skill, strength, and gap is tied directly to verbatim quotes extracted from the resume, preventing hallucinations and recruiting bias.
          </p>
        </div>
      </div>

      {/* Scoring Rubric Summary Table Card */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
            <Scale size={18} color="var(--primary)" />
            Verified Deterministic Scoring Rubric (Backend Implementation)
          </h2>
          <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: '700' }}>
            Total Weight: 100 Points
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '30%' }}>Evaluation Component</th>
                <th style={{ width: '15%' }}>Weight</th>
                <th style={{ width: '55%' }}>Deterministic Calculation & Evidence Criteria</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Required Skills Match</strong></td>
                <td><span className="badge badge-primary" style={{ fontWeight: '700' }}>40% (40 pts)</span></td>
                <td>Averaged match score across all mandatory JD requirements (match = 1.0, partial = 0.5, missing = 0.0) grounded with verbatim resume quotes.</td>
              </tr>
              <tr>
                <td><strong>Relevant Industry Experience</strong></td>
                <td><span className="badge badge-info" style={{ fontWeight: '700' }}>20% (20 pts)</span></td>
                <td>Evaluates cumulative software engineering tenure, career trajectory, and alignment with target role seniority level.</td>
              </tr>
              <tr>
                <td><strong>Preferred Skills Match</strong></td>
                <td><span className="badge badge-secondary" style={{ fontWeight: '700' }}>15% (15 pts)</span></td>
                <td>Evaluates nice-to-have technologies and bonus tooling listed in the requisition (match = 1.0, partial = 0.5, missing = 0.0).</td>
              </tr>
              <tr>
                <td><strong>Project Portfolio Alignment</strong></td>
                <td><span className="badge badge-secondary" style={{ fontWeight: '700' }}>15% (15 pts)</span></td>
                <td>Assesses hands-on technical projects demonstrating required technology stack, architecture complexity, and production readiness.</td>
              </tr>
              <tr>
                <td><strong>Education & Academic Fit</strong></td>
                <td><span className="badge badge-secondary" style={{ fontWeight: '700' }}>10% (10 pts)</span></td>
                <td>Evaluates relevant STEM / CS degree field, academic standing, and foundational engineering coursework.</td>
              </tr>
              <tr style={{ background: '#f1f5f9', fontWeight: '700' }}>
                <td>TOTAL OBJECTIVE SCORE</td>
                <td><span style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>100% (100 pts)</span></td>
                <td>Sum of weighted deterministic components. Absolutely insulated from LLM hallucination and integrity findings.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Preprocessing Step 0 Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Binary size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
            Deterministic Document Preprocessing (Step 0)
          </h2>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '1.25rem',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#475569',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '1.1rem',
            flexShrink: 0
          }}>
            0
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>{preprocessingStep.name}</div>
              <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b', fontWeight: '600' }}>
                {preprocessingStep.badgeLabel}
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {preprocessingStep.desc}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Input: </span>
                <code>{preprocessingStep.input}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Output: </span>
                <code>{preprocessingStep.output}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0 1.5rem' }}>
        <ArrowDown size={22} color="var(--primary)" />
      </div>

      {/* Sequential 7-Stage Multi-Agent Pipeline */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
            <Cpu size={20} color="var(--primary)" />
            Autonomous 7-Stage Agent Pipeline (Execution Stages 1 to 7)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Matches 1-to-1 with the 7 stages executed and visualized on the Candidate Analysis dashboard.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
          {stages.map((st, idx) => {
            const isIntegrity = st.step === '3';
            const isScoring = st.step === '4';

            return (
              <div key={st.step}>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: isIntegrity ? '#fffbeb' : isScoring ? '#f0fdf4' : '#f8fafc',
                  border: isIntegrity ? '1px solid #fde68a' : isScoring ? '1px solid #bbf7d0' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isIntegrity ? '#d97706' : isScoring ? '#16a34a' : 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    {st.step}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '1.1rem', color: isIntegrity ? '#92400e' : isScoring ? '#166534' : 'var(--text-main)' }}>
                        Stage {st.step}: {st.name}
                      </div>
                      <span className="badge" style={{
                        background: isIntegrity ? '#fef3c7' : isScoring ? '#dcfce7' : '#e2e8f0',
                        color: isIntegrity ? '#92400e' : isScoring ? '#166534' : '#334155',
                        border: isIntegrity ? '1px solid #fde68a' : isScoring ? '1px solid #86efac' : 'none',
                        fontWeight: '700'
                      }}>
                        {st.badgeLabel}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.55 }}>
                      {st.desc}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                    <ArrowDown size={18} color="var(--primary)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
