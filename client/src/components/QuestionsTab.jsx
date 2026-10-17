import React, { useState } from 'react';
import { HelpCircle, Code2, FolderGit2, Users, Search } from 'lucide-react';

export default function QuestionsTab({ questions }) {
  const [activeCategory, setActiveCategory] = useState('technical');

  if (!questions) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Interview questions are pending generation...
      </div>
    );
  }

  const {
    technical = [],
    projectBased = [],
    behavioral = [],
    gapProbing = []
  } = questions;

  const totalQuestions = technical.length + projectBased.length + behavioral.length + gapProbing.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Subcategory Pill Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveCategory('technical')}
          className={`btn btn-sm ${activeCategory === 'technical' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Code2 size={15} /> Technical ({technical.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('projectBased')}
          className={`btn btn-sm ${activeCategory === 'projectBased' ? 'btn-primary' : 'btn-outline'}`}
        >
          <FolderGit2 size={15} /> Project Deep Dive ({projectBased.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('gapProbing')}
          className={`btn btn-sm ${activeCategory === 'gapProbing' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Search size={15} /> Gap Probing ({gapProbing.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('behavioral')}
          className={`btn btn-sm ${activeCategory === 'behavioral' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Users size={15} /> Behavioral ({behavioral.length})
        </button>
      </div>

      {/* Questions List */}
      <div className="card" style={{ marginBottom: 0 }}>
        {activeCategory === 'technical' && (
          <div>
            <div className="card-header">
              <h3 className="card-title">
                <Code2 size={18} color="var(--primary)" />
                Technical Questions ({technical.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {technical.map((q, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.975rem', color: 'var(--text-main)' }}>
                      {idx + 1}. {q.question}
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize', flexShrink: 0 }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Target Skill: <strong style={{ color: 'var(--text-main)' }}>{q.targetSkill}</strong> • Reason: {q.reason}
                  </div>
                  <div style={{ fontSize: '0.825rem', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--primary)', color: '#334155' }}>
                    <strong>What to look for: </strong> {q.whatToLookFor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'projectBased' && (
          <div>
            <div className="card-header">
              <h3 className="card-title">
                <FolderGit2 size={18} color="var(--primary)" />
                Project-Based Questions ({projectBased.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {projectBased.map((q, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.975rem', marginBottom: '0.4rem' }}>
                    {idx + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Related Project: <strong style={{ color: 'var(--primary)' }}>{q.relatedProject}</strong> • Reason: {q.reason}
                  </div>
                  <div style={{ fontSize: '0.825rem', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--info)', color: '#334155' }}>
                    <strong>Evaluation criteria: </strong> {q.whatToLookFor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'gapProbing' && (
          <div>
            <div className="card-header">
              <h3 className="card-title">
                <Search size={18} color="var(--warning)" />
                Skill Gap Probing Questions ({gapProbing.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {gapProbing.map((q, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.975rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    {idx + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fffbeb', padding: '0.35rem 0.6rem', borderRadius: '4px', marginBottom: '0.4rem' }}>
                    Investigating Gap: <strong>{q.relatedGap}</strong>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <strong>Interviewer Reason: </strong> {q.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'behavioral' && (
          <div>
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} color="var(--primary)" />
                Behavioral & Teamwork Questions ({behavioral.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {behavioral.map((q, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.975rem', marginBottom: '0.4rem' }}>
                    {idx + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <strong>Context & Goal: </strong> {q.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
