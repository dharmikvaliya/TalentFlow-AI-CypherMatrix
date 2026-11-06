import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function ResumeIntegrityTab({ integrity, onSwitchToQuestions }) {
  // 1. Historical runs where resumeIntegrity was not collected
  if (!integrity) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: '#f1f5f9', borderRadius: '50%', marginBottom: '1rem' }}>
          <Info size={32} color="var(--text-muted)" />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Historical Workflow Record
        </h3>
        <p style={{ maxWidth: '540px', margin: '0 auto 1.5rem', color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Resume integrity analysis was not available for this historical run.
          Automated integrity risk evaluation was introduced in workflow revision 2.0. Historical workflow runs do not include an integrity evaluation.
        </p>
        <span className="badge badge-pending" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
          Legacy Record — No Integrity Data
        </span>
      </div>
    );
  }

  const {
    riskLevel = 'low',
    confidence = 0,
    reviewRequired = false,
    metrics = {},
    flags = [],
    summary = '',
    limitations = []
  } = integrity;

  // 2. Safe Fallback / Unavailable Condition
  const isUnavailable =
    confidence === 0 ||
    riskLevel === 'unavailable' ||
    flags.some(f => f.code === 'INTEGRITY_ANALYSIS_UNAVAILABLE');

  // Risk presentation mapping
  let riskBadgeClass = 'badge-success';
  let riskTitle = 'No significant textual integrity signals detected';
  let riskIcon = <ShieldCheck size={20} color="var(--success)" />;
  let riskColor = 'var(--success)';
  let riskBg = 'var(--success-bg)';

  if (isUnavailable) {
    riskBadgeClass = 'badge-skipped';
    riskTitle = 'Analysis unavailable — Manual review required';
    riskIcon = <AlertTriangle size={20} color="var(--warning)" />;
    riskColor = 'var(--warning)';
    riskBg = 'var(--warning-bg)';
  } else if (riskLevel === 'high') {
    riskBadgeClass = 'badge-failed';
    riskTitle = 'Human review required';
    riskIcon = <ShieldAlert size={20} color="var(--danger)" />;
    riskColor = 'var(--danger)';
    riskBg = 'var(--danger-bg)';
  } else if (riskLevel === 'medium') {
    riskBadgeClass = 'badge-skipped';
    riskTitle = 'Verification recommended';
    riskIcon = <AlertTriangle size={20} color="var(--warning)" />;
    riskColor = 'var(--warning)';
    riskBg = 'var(--warning-bg)';
  }

  // Deduplicate all affected skills across flags
  const allAffectedSkills = Array.from(
    new Set(
      flags.flatMap(f => (Array.isArray(f.affectedSkills) ? f.affectedSkills : []))
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Required Prominent Capability vs Integrity Separation Banner */}
      <div
        className="card"
        style={{
          marginBottom: 0,
          background: '#f8fafc',
          borderLeft: '4px solid var(--primary)',
          padding: '1.15rem 1.4rem'
        }}
        role="region"
        aria-label="Evaluation Separation Notice"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <Shield size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.925rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Capability Score & Integrity Risk Separation
            </div>
            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.55, margin: 0 }}>
              The capability score measures job-fit evidence. Resume-integrity analysis identifies textual signals that may require human verification. An elevated integrity risk does not prove dishonesty and does not automatically reduce the capability score.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Status Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              {riskIcon}
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                {riskTitle}
              </h2>
            </div>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', maxWidth: '680px', lineHeight: 1.5, marginTop: '0.35rem' }}>
              {summary || 'Automated textual heuristics scanned the document for pattern repetition, JD phrase copying, uncorroborated skill claims, and prompt injection.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span
                className={`badge ${riskBadgeClass}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', letterSpacing: '0.04em' }}
              >
                RISK: {isUnavailable ? 'UNAVAILABLE' : riskLevel.toUpperCase()}
              </span>
              <span
                className="badge"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.35rem 0.85rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1'
                }}
              >
                CONFIDENCE: {Math.round(confidence * 100)}%
              </span>
            </div>
            {reviewRequired && (
              <span
                className="badge"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1px solid #fecaca'
                }}
              >
                <AlertCircle size={13} /> HUMAN REVIEW REQUIRED
              </span>
            )}
          </div>
        </div>

        {/* Human Verification Advisory Guidance Box */}
        {reviewRequired && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.15rem',
              borderRadius: 'var(--radius-md)',
              background: riskBg,
              border: `1px solid ${riskColor}33`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', color: riskColor, fontSize: '0.95rem' }}>
                <AlertTriangle size={18} /> Human Verification Recommended
              </div>

              {onSwitchToQuestions && (
                <button
                  type="button"
                  onClick={onSwitchToQuestions}
                  className="btn btn-outline btn-sm"
                  style={{
                    background: '#ffffff',
                    borderColor: riskColor,
                    color: riskColor,
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  aria-label="Navigate to Interview Questions tab"
                >
                  <HelpCircle size={14} /> View Targeted Verification Questions <ArrowRight size={14} />
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.875rem', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>
              Use the generated interview questions to request concrete examples, responsibilities, decisions, outcomes, and trade-offs for the flagged skills.
            </p>

            {allAffectedSkills.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Skills Requiring Practical Evidence Verification ({allAffectedSkills.length}):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {allAffectedSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.775rem',
                        fontWeight: '600',
                        borderRadius: 'var(--radius-sm)',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: 'var(--text-main)'
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heuristic Metrics Grid */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
            <FileText size={18} color="var(--primary)" />
            Textual Integrity Metrics
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total Analyzed Words: {metrics.totalWords || 0}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem'
          }}
        >
          {/* Unique Vocabulary Ratio */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Unique Vocabulary Ratio
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {typeof metrics.uniqueWordRatio === 'number' ? `${(metrics.uniqueWordRatio * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Share of distinct normalized words in the resume.
            </div>
          </div>

          {/* Repeated-term Ratio */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Repeated-Term Ratio
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: (metrics.repeatedTermRatio || 0) > 0.08 ? 'var(--warning)' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {typeof metrics.repeatedTermRatio === 'number' ? `${(metrics.repeatedTermRatio * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Statistically unusual repetition after common-word filtering.
            </div>
          </div>

          {/* JD Phrase Overlap */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              JD Phrase Overlap
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: (metrics.jdPhraseOverlapRatio || 0) > 0.12 ? 'var(--danger)' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {typeof metrics.jdPhraseOverlapRatio === 'number' ? `${(metrics.jdPhraseOverlapRatio * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Contiguous normalized phrase overlap between the resume and job description.
            </div>
          </div>

          {/* Unsupported Skill Ratio */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Unsupported Skills Ratio
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: (metrics.unsupportedSkillRatio || 0) > 0.35 ? 'var(--warning)' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {typeof metrics.unsupportedSkillRatio === 'number' ? `${(metrics.unsupportedSkillRatio * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Listed skills lacking contextual evidence in experience, projects, achievements, or relevant education.
            </div>
          </div>

          {/* Prompt Injection Indicators */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Prompt Injection Signals
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: (metrics.promptInjectionIndicatorCount || 0) > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.2rem' }}>
              {metrics.promptInjectionIndicatorCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Instruction-like command overrides or jailbreak triggers.
            </div>
          </div>

          {/* Generic Phrases */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Generic Template Phrases
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {metrics.genericPhraseCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Common resume boilerplate and buzzwords.
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.85rem', marginBottom: 0 }}>
          Notice: Heuristic indicators are informational signals; no single metric alone proves intentional manipulation.
        </p>
      </div>

      {/* Flag Details Section */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
            Flagged Textual Signals ({flags.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {flags.length === 0 ? 'All Heuristic Checks Passed' : `${flags.length} signal(s) require review`}
          </span>
        </div>

        {flags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>No Adverse Integrity Signals Detected</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              The candidate's resume shows natural vocabulary variance, normal JD alignment, and grounded skill usage.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {flags.map((flag, idx) => {
              const isInjection =
                (flag.code && (flag.code.includes('INJECTION') || flag.code.includes('PROMPT'))) ||
                (flag.title && flag.title.toLowerCase().includes('injection'));

              let badgeStyle = { background: '#f1f5f9', color: '#475569' };
              if (flag.severity === 'critical') {
                badgeStyle = { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca' };
              } else if (flag.severity === 'warning') {
                badgeStyle = { background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid #fde68a' };
              } else if (flag.severity === 'info') {
                badgeStyle = { background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid #bae6fd' };
              }

              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {flag.title || flag.code}
                    </div>
                    <span className="badge" style={{ ...badgeStyle, fontSize: '0.7rem' }}>
                      {flag.severity ? flag.severity.toUpperCase() : 'INFO'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: '0 0 0.5rem 0' }}>
                    {flag.explanation}
                  </p>

                  {/* Redacted Prompt-Injection Evidence vs Bounded Safe Evidence */}
                  {isInjection ? (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: '#991b1b',
                        fontWeight: '600'
                      }}
                    >
                      Instruction-like text detected in uploaded resume.
                    </div>
                  ) : (
                    Array.isArray(flag.evidence) && flag.evidence.length > 0 && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Evidence Samples:
                        </span>
                        <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                          {flag.evidence.slice(0, 5).map((ev, evIdx) => {
                            const bounded = typeof ev === 'string' ? (ev.length > 160 ? `${ev.slice(0, 160)}…` : ev) : JSON.stringify(ev);
                            return <li key={evIdx} style={{ marginBottom: '0.2rem' }}>{bounded}</li>;
                          })}
                        </ul>
                      </div>
                    )
                  )}

                  {/* Affected Skills */}
                  {Array.isArray(flag.affectedSkills) && flag.affectedSkills.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                        Affected Skills:
                      </span>
                      {flag.affectedSkills.map((sk, skIdx) => (
                        <span
                          key={skIdx}
                          style={{
                            fontSize: '0.725rem',
                            padding: '0.15rem 0.45rem',
                            background: '#f1f5f9',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-main)',
                            fontWeight: '600'
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Limitations Section */}
      {Array.isArray(limitations) && limitations.length > 0 && (
        <div className="card" style={{ marginBottom: 0, background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            <Info size={17} color="var(--text-muted)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Known Methodology Boundaries</h4>
          </div>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
