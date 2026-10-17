import React from 'react';
import { Award, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';

export default function EvaluationTab({ scoring }) {
  if (!scoring) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Candidate scoring evaluation is pending execution...
      </div>
    );
  }

  const { totalScore = 0, breakdown = [], strengths = [], gaps = [], scoreExplanation = '' } = scoring;

  // Determine score color
  let scoreColor = 'var(--danger)';
  if (totalScore >= 75) scoreColor = 'var(--success)';
  else if (totalScore >= 50) scoreColor = 'var(--warning)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Score Gauge & Narrative */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Circular/Large Score Card */}
          <div style={{
            minWidth: '150px',
            textAlign: 'center',
            padding: '1.25rem',
            background: '#f8fafc',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1, color: scoreColor }}>
              {totalScore}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '0.35rem' }}>
              OUT OF 100
            </div>
            <div style={{
              width: '100%',
              background: '#e2e8f0',
              height: '6px',
              borderRadius: '9999px',
              marginTop: '0.65rem',
              overflow: 'hidden'
            }}>
              <div style={{ width: `${totalScore}%`, height: '100%', background: scoreColor, transition: 'width 1s' }} />
            </div>
          </div>

          {/* Scoring Narrative */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              <TrendingUp size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Deterministic Rubric Evaluation</h3>
            </div>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              {scoreExplanation}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--success)" />
              <span>Score calculated via deterministic code rubric. Demographic attributes stripped prior to evaluation.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Breakdown Table */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3 className="card-title">
            <Award size={18} color="var(--primary)" />
            Mathematical Rubric Breakdown
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            Max Weight: 100 Pts
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Evaluation Component</th>
                <th style={{ width: '15%' }}>Weight</th>
                <th style={{ width: '15%' }}>Earned Score</th>
                <th style={{ width: '40%' }}>Calculation Logic & Criteria</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '600' }}>{b.component}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.weight} pts</td>
                  <td>
                    <strong style={{
                      color: b.earned >= b.weight * 0.75 ? 'var(--success)' : b.earned >= b.weight * 0.5 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {b.earned} pts
                    </strong>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{b.explanation}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                <td>TOTAL OBJECTIVE SCORE</td>
                <td>100 pts</td>
                <td style={{ color: scoreColor }}>{totalScore} pts</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sum of weighted evaluation components</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Strengths & Gaps Two-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Strengths */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 size={18} color="var(--success)" />
              Candidate Strengths ({strengths.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {strengths.map((s, idx) => (
              <div key={idx} style={{ background: 'var(--success-bg)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#14532d', marginBottom: '0.35rem' }}>
                  {s.point}
                </div>
                {s.evidence && (
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontStyle: 'italic', background: '#ffffff', padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                    "{s.evidence}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skill Gaps / Risks */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} color="var(--warning)" />
              Skill Gaps & Probing Areas ({gaps.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {gaps.map((g, idx) => {
              const isHigh = g.severity === 'high';
              return (
                <div key={idx} style={{
                  background: isHigh ? 'var(--danger-bg)' : 'var(--warning-bg)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: isHigh ? '1px solid #fecaca' : '1px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: isHigh ? '#991b1b' : '#92400e' }}>
                      {g.point}
                    </div>
                    <span className="badge" style={{
                      background: isHigh ? '#fee2e2' : '#fef3c7',
                      color: isHigh ? '#b91c1c' : '#b45309',
                      fontSize: '0.7rem'
                    }}>
                      {g.severity}
                    </span>
                  </div>
                  {g.evidence && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', background: '#ffffff', padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      "{g.evidence}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
