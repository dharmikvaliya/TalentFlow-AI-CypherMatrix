import React from 'react';
import { CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

export default function PipelineView({ stages = [], onRetryStage }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
        <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
          Autonomous Execution Pipeline
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {stages.filter(s => s.status === 'success').length} of {stages.length} stages completed
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem',
        alignItems: 'stretch'
      }}>
        {stages.map((st, index) => {
          let badgeClass = 'badge-pending';
          let icon = <Clock size={13} />;

          if (st.status === 'running') {
            badgeClass = 'badge-running';
            icon = <div className="spinner" style={{ width: '11px', height: '11px' }} />;
          } else if (st.status === 'success') {
            badgeClass = 'badge-success';
            icon = <CheckCircle2 size={13} />;
          } else if (st.status === 'failed') {
            badgeClass = 'badge-failed';
            icon = <XCircle size={13} />;
          } else if (st.status === 'skipped') {
            badgeClass = 'badge-skipped';
            icon = <AlertTriangle size={13} />;
          }

          return (
            <div
              key={st.key}
              style={{
                border: st.status === 'running' ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 0.75rem',
                background: st.status === 'running' ? 'var(--primary-light)' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                    Stage {index + 1}
                  </span>
                  <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                    {icon} {st.status}
                  </span>
                </div>

                <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {st.name}
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {st.durationMs > 0 ? `${(st.durationMs / 1000).toFixed(2)}s` : '—'}
                </span>

                {st.status === 'failed' && onRetryStage && (
                  <button
                    type="button"
                    onClick={() => onRetryStage(st.key)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                    title="Retry this failed stage"
                  >
                    <RotateCcw size={11} /> Retry
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
