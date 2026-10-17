import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, ShieldCheck, Tag } from 'lucide-react';

export default function SkillsTab({ skillsAnalysis }) {
  const [filterCategory, setFilterCategory] = useState('all');

  if (!skillsAnalysis) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Skills analysis is pending execution...
      </div>
    );
  }

  const { jobRequirements = {}, skills = [], requirementMatches = [], summary = '' } = skillsAnalysis;

  const categories = ['all', ...new Set(skills.map(s => s.category))];
  const filteredSkills = filterCategory === 'all' ? skills : skills.filter(s => s.category === filterCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary Alert */}
      {summary && (
        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          <ShieldCheck size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Skills Analysis Summary: </strong>
            <span>{summary}</span>
          </div>
        </div>
      )}

      {/* Requirement Matches Table */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3 className="card-title">
            <CheckCircle2 size={18} color="var(--primary)" />
            Job Description Requirement Alignment ({requirementMatches.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Requirement</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '43%' }}>Verified Evidence & Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {requirementMatches.map((m, idx) => {
                let badgeStyle = { background: '#fef3c7', color: '#92400e' };
                let statusLabel = 'Partial';
                let Icon = HelpCircle;

                if (m.status === 'match') {
                  badgeStyle = { background: '#dcfce7', color: '#166534' };
                  statusLabel = 'Match';
                  Icon = CheckCircle2;
                } else if (m.status === 'missing') {
                  badgeStyle = { background: '#fee2e2', color: '#991b1b' };
                  statusLabel = 'Missing';
                  Icon = AlertCircle;
                }

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{m.requirement}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: m.type === 'required' ? '#eef2ff' : '#f1f5f9',
                        color: m.type === 'required' ? 'var(--primary)' : 'var(--text-muted)'
                      }}>
                        {m.type}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={badgeStyle}>
                        <Icon size={12} /> {statusLabel}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div style={{ marginBottom: '0.25rem', color: 'var(--text-main)' }}>{m.reasoning}</div>
                      {m.evidence && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#f8fafc', padding: '0.3rem 0.5rem', borderRadius: '4px', borderLeft: '2px solid var(--primary)' }}>
                          "{m.evidence}"
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extracted & Grounded Skills */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="card-title">
            <Tag size={18} color="var(--primary)" />
            Categorized Candidate Skills with Resume Evidence ({skills.length})
          </h3>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  border: filterCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: filterCategory === cat ? 'var(--primary)' : '#ffffff',
                  color: filterCategory === cat ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredSkills.map((s, idx) => (
            <div key={idx} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>{s.name}</strong>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', color: 'var(--primary)', background: '#eef2ff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  {s.proficiency}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                <span>Domain: <strong>{s.category}</strong></span>
                <span>•</span>
                <span>Source: <strong>{s.source}</strong></span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', background: '#ffffff', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                "{s.evidence}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
