import React from 'react';
import { Layers, ShieldCheck, Database, Cpu, CheckCircle2, ArrowDown, FileText } from 'lucide-react';

const stages = [
  {
    step: '0',
    name: 'PDF Text Extraction',
    type: 'Code (pdf-parse)',
    desc: 'Extracts clean, unformatted raw text, page count, and character counts from the uploaded candidate PDF. Detects and rejects scanned/empty documents.',
    input: 'PDF Binary stream / file path',
    output: '{ rawText, pageCount, charCount }',
    purpose: 'Text normalization & document validity check'
  },
  {
    step: '1',
    name: 'Resume Parser Agent',
    type: 'LLM Agent + Zod',
    desc: 'Extracts candidate demographics, education, professional experience, key projects, listed skills, and achievements into a strictly typed candidate profile.',
    input: 'rawText',
    output: 'Structured Profile (education, experience, projects, skills)',
    purpose: 'Profile structuring with zero hallucinated dates or grades'
  },
  {
    step: '2',
    name: 'Skills Analysis Agent',
    type: 'LLM Agent + Zod',
    desc: 'Categorizes technical skills across 9 domains, attaches verbatim textual evidence from the resume, and maps qualifications against the target Job Description (match, partial, missing).',
    input: 'Structured Profile + Job Description',
    output: 'Categorized Skills + Requirement Matches with Evidence',
    purpose: 'Evidence-grounded qualification verification'
  },
  {
    step: '3',
    name: 'Candidate Scoring Engine',
    type: 'Deterministic Code Rubric + LLM',
    desc: 'A transparent, weighted mathematical rubric computes a 0-100 score based on required skills (40%), preferred skills (15%), experience (20%), projects (15%), and education (10%). An LLM generates concise strengths and gap explanations grounded in evidence.',
    input: 'Requirement Matches + Profile + Rubric Weights',
    output: '0-100 Score, Rubric Breakdown, Strengths & Gaps',
    purpose: 'Transparent, reproducible scoring with zero LLM score drift'
  },
  {
    step: '4',
    name: 'Interview Question Generator',
    type: 'LLM Agent + Zod',
    desc: 'Constructs targeted interview questions directly cross-referenced to the candidate’s documented gaps, strengths, and specific portfolio projects.',
    input: 'Profile + Skills Analysis + Strengths & Gaps + JD',
    output: 'Technical, Project-based, Behavioral, and Gap-probing questions',
    purpose: 'Tailored interviewer preparation guide'
  },
  {
    step: '5',
    name: 'Hiring Recommendation Agent',
    type: 'LLM Agent + Guardrail Code',
    desc: 'Synthesizes an advisory recommendation (Hire / Maybe / No) with confidence rating, key risks, and next steps. Enforces code-level guardrails preventing low scores from recommending Hire.',
    input: 'All prior stage outputs',
    output: 'Recommendation (Hire/Maybe/No), Risks, Next Steps, Disclaimer',
    purpose: 'Executive summary with human-in-the-loop advisory disclaimer'
  },
  {
    step: '6',
    name: 'Report Assembler',
    type: 'Deterministic Code',
    desc: 'Assembles a consolidated candidate report in both structured JSON and downloadable Markdown format, retaining full execution trace logs and durations.',
    input: 'Outputs from stages 0 through 5',
    output: 'Final Candidate Report (JSON & Downloadable Markdown)',
    purpose: 'Traceable, audit-ready consolidated deliverable'
  }
];

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          How TalentFlow AI Works
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          A transparent multi-agent pipeline combining deterministic code rubrics with structured LLM reasoning.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
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
            The LLM never invents numbers. The 0-100 candidate score is computed purely by transparent code evaluating match states against a defined rubric.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--info)' }}>
            <Cpu size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Evidence Grounding</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Every identified skill, strength, and gap is tied directly to textual quotes extracted from the resume, preventing hallucinations and bias.
          </p>
        </div>
      </div>

      {/* Pipeline Flow Diagram Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Cpu size={18} color="var(--primary)" />
            Sequential Agent Workflow & Data Flow
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
                  background: 'var(--primary)',
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
                    <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>
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
