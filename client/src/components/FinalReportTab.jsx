import React from 'react';
import { Download, FileText, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

export default function FinalReportTab({ report, runId }) {
  if (!report) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Final candidate report is being compiled by the orchestrator...
      </div>
    );
  }

  const handleDownloadMarkdown = () => {
    window.location.href = `${getApiBaseUrl()}/runs/${runId}/report.md`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Bar */}
      <div className="card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Final Consolidated Candidate Report</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Deterministic compilation of all validated agent outputs with full evidentiary traceability.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadMarkdown}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} /> Download Markdown (.md)
        </button>
      </div>

      {/* Rendered Report Document View */}
      <div className="card" style={{ marginBottom: 0, padding: '2.5rem', background: '#ffffff', border: '1px solid var(--border)' }}>
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--primary)', textTransform: 'uppercase' }}>
                TalentFlow AI Candidate Evaluation
              </span>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.2rem' }}>
                {report.candidateSummary?.name}
              </h1>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Contact: {[report.candidateSummary?.email, report.candidateSummary?.phone].filter(Boolean).join(' | ') || 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Execution Provider: <strong style={{ color: 'var(--primary)' }}>{report.workflowTrace?.provider?.toUpperCase() || 'MOCK'}</strong> ({report.workflowTrace?.model || 'deterministic'}){report.workflowTrace?.fallbackUsed ? ' [Fallback Engaged]' : ''}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>HIRING RECOMMENDATION</div>
              <span className={`badge badge-${report.recommendation?.recommendation?.toLowerCase()}`} style={{ fontSize: '1.1rem', padding: '0.35rem 0.85rem', marginTop: '0.3rem' }}>
                {report.recommendation?.recommendation?.toUpperCase()}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Objective Score: <strong>{report.scoreAndBreakdown?.totalScore}/100</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
            1. Executive Overview
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#334155' }}>
            {report.candidateSummary?.overview}
          </p>
        </div>

        {/* Section 2: Objective Scoring Breakdown */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
            2. Objective Rubric Score Breakdown ({report.scoreAndBreakdown?.totalScore}/100)
          </h3>
          <table className="custom-table" style={{ marginBottom: '0.75rem' }}>
            <thead>
              <tr>
                <th>Component</th>
                <th>Weight</th>
                <th>Earned</th>
                <th>Criteria / Explanation</th>
              </tr>
            </thead>
            <tbody>
              {report.scoreAndBreakdown?.breakdown?.map((b, idx) => (
                <tr key={idx}>
                  <td><strong>{b.component}</strong></td>
                  <td>{b.weight} pts</td>
                  <td><strong>{b.earned} pts</strong></td>
                  <td>{b.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {report.scoreAndBreakdown?.scoreExplanation}
          </p>
        </div>

        {/* Section 3: Strengths & Gaps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--success)' }}>
              Key Strengths (Evidence Grounded)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {report.strengths?.map((s, idx) => (
                <div key={idx} style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', fontSize: '0.875rem' }}>
                  <strong>{s.point}</strong>
                  <div style={{ fontSize: '0.775rem', color: '#166534', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    "{s.evidence}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--warning)' }}>
              Identified Skill Gaps
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {report.skillGaps?.map((g, idx) => (
                <div key={idx} style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{g.point}</strong>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '700', color: '#92400e' }}>{g.severity}</span>
                  </div>
                  {g.evidence && (
                    <div style={{ fontSize: '0.775rem', color: '#78350f', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      "{g.evidence}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Recommendation & Next Steps */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            4. Hiring Recommendation & Next Steps
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            {report.recommendation?.reasoning}
          </p>
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Suggested Next Steps:</strong>
            <ol style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
              {report.recommendation?.suggestedNextSteps?.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '0.2rem' }}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Responsible Hiring Advisory Disclaimer */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <strong>Responsible AI Notice: </strong> {report.disclaimer}
        </div>
      </div>
    </div>
  );
}
