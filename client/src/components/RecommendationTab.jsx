import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, Award } from 'lucide-react';

export default function RecommendationTab({ recommendation, score }) {
  if (!recommendation) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Hiring recommendation is pending execution...
      </div>
    );
  }

  const {
    recommendation: rec = 'Maybe',
    confidence = 'medium',
    reasoning = '',
    keyRisks = [],
    suggestedNextSteps = [],
    disclaimer = ''
  } = recommendation;

  let badgeClass = 'badge-maybe';
  if (rec === 'Hire') badgeClass = 'badge-hire';
  else if (rec === 'No') badgeClass = 'badge-no';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Advisory Decision Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
              Advisory Recommendation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <span className={`badge ${badgeClass}`} style={{ fontSize: '1.25rem', padding: '0.4rem 1rem' }}>
                {rec.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Confidence: <strong style={{ textTransform: 'uppercase', color: 'var(--text-main)' }}>{confidence}</strong>
              </span>
            </div>
          </div>

          {score !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Objective Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {score} / 100
              </div>
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.4rem' }}>Executive Synthesis</h4>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            {reasoning}
          </p>
        </div>
      </div>

      {/* Risks & Next Steps Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Key Risks */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} color="var(--warning)" />
              Key Risks & Trade-offs ({keyRisks.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {keyRisks.map((risk, idx) => (
              <div key={idx} style={{ background: '#fef2f2', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', fontSize: '0.875rem', color: '#991b1b', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700' }}>•</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Next Steps */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 size={18} color="var(--primary)" />
              Suggested Next Steps ({suggestedNextSteps.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {suggestedNextSteps.map((step, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Responsible Hiring Advisory Disclaimer */}
      <div className="alert alert-info" style={{ marginBottom: 0, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
        <ShieldAlert size={20} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
          <strong>Responsible AI Hiring Disclaimer: </strong>
          {disclaimer}
        </div>
      </div>
    </div>
  );
}
