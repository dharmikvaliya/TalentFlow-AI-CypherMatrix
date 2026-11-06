import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, RefreshCw, AlertCircle, ArrowDownRight, Layers } from 'lucide-react';

const STAGE_TRANSITIONS = {
  resumeParser: {
    purpose: 'Extract candidate demographics, education, experience, and projects from raw PDF text.',
    feedsInto: 'Feeds structured profile into Stage 2 (Skills Analysis) and Stage 3 (Scoring).'
  },
  skillsAnalysis: {
    purpose: 'Categorize skills with resume evidence and map qualifications against JD requirements.',
    feedsInto: 'Feeds requirement matches into Stage 3 (Resume Integrity) and Stage 4 (Scoring).'
  },
  resumeIntegrity: {
    purpose: 'Deterministic heuristic analysis of textual signals (keyword repetition, JD phrase copying, unsupported skills, prompt injection).',
    feedsInto: 'Feeds verification context into Stage 5 (Questions), Stage 6 (Recommendation), and Stage 7 (Final Report).'
  },
  scoring: {
    purpose: 'Compute deterministic 0-100 rubric score and generate grounded strengths & gaps explanation.',
    feedsInto: 'Feeds score, strengths, and gaps into Stage 4 (Questions) and Stage 5 (Recommendation).'
  },
  interviewQuestions: {
    purpose: 'Generate targeted technical, project, behavioral, and gap-probing interview questions.',
    feedsInto: 'Feeds structured question guide into Stage 5 (Recommendation) and Stage 6 (Final Report).'
  },
  recommendation: {
    purpose: 'Synthesize hiring decision (Hire/Maybe/No) with score guardrails, risks, and next steps.',
    feedsInto: 'Feeds advisory recommendation and risks into Stage 6 (Final Report Assembler).'
  },
  report: {
    purpose: 'Deterministically assemble consolidated final candidate report in JSON and Markdown.',
    feedsInto: 'Delivers audit-ready candidate report to recruiter dashboard and Markdown export.'
  }
};

export default function AgentTraceTab({ stages = [] }) {
  const [expandedStages, setExpandedStages] = useState({
    resumeParser: false,
    skillsAnalysis: false,
    resumeIntegrity: false,
    scoring: false,
    interviewQuestions: false,
    recommendation: false,
    report: false
  });

  const toggleExpand = (key) => {
    setExpandedStages(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Layers size={20} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Full Agent Trace & Workflow Observability</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Inspect input parameters, structured output JSON, durations, and state transitions across all pipeline stages.
            </p>
          </div>
        </div>
      </div>

      {stages.map((st, idx) => {
        const isExpanded = expandedStages[st.key];
        const meta = STAGE_TRANSITIONS[st.key] || { purpose: st.name, feedsInto: 'Next stage' };

        return (
          <div key={st.key} className="card" style={{ marginBottom: 0 }}>
            {/* Stage Header */}
            <div
              onClick={() => toggleExpand(st.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: st.status === 'success' ? '#dcfce7' : st.status === 'running' ? '#e0f2fe' : '#f1f5f9',
                  color: st.status === 'success' ? '#15803d' : st.status === 'running' ? '#0369a1' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700'
                }}>
                  {idx + 1}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {st.name}
                    <span className={`badge badge-${st.status}`} style={{ fontSize: '0.7rem' }}>
                      {st.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {meta.purpose}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} /> {st.durationMs > 0 ? `${st.durationMs}ms` : '—'}
                </span>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>

            {/* Stage Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.825rem'
            }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Input Summary: </strong>
                <div style={{
                  marginTop: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem'
                }}>
                  {st.inputSummary || 'N/A'}
                </div>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Provider & Model: </strong>
                <span>{st.provider ? `${st.provider.toUpperCase()} (${st.model || 'N/A'})${st.fallbackUsed ? ' [Fallback]' : ''}` : '—'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Retries: </strong>
                <span>{st.retries || 0}</span>
              </div>
              <div style={{ gridColumn: '1 / -1', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowDownRight size={15} />
                <span><strong>Data Flow Transition: </strong>{meta.feedsInto}</span>
              </div>
            </div>

            {/* Error Message if Failed */}
            {st.error && (
              <div className="alert alert-danger" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <AlertCircle size={16} />
                <span>{st.error}</span>
              </div>
            )}

            {/* Collapsible Structured Output JSON */}
            {isExpanded && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Validated Output JSON Schema
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(st.output, null, 2))}
                  >
                    Copy JSON
                  </button>
                </div>
                <pre style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  lineHeight: 1.4
                }}>
                  {st.output ? JSON.stringify(st.output, null, 2) : '// No output generated yet'}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
