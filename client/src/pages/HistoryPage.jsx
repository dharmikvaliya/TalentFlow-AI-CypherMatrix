import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRight, Clock, Award, AlertCircle } from 'lucide-react';
import { getWorkflowRunsHistory } from '../services/api';

export default function HistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getWorkflowRunsHistory()
      .then(res => setRuns(res.runs || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            Recruitment Analysis History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Browse and review past candidate evaluations and generated reports.
          </p>
        </div>
        <Link to="/" className="btn btn-primary btn-sm">
          New Analysis
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '28px', height: '28px' }} />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading runs history...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <History size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>No evaluations yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Upload your first candidate resume to trigger the autonomous workflow.
          </p>
          <Link to="/" className="btn btn-primary">
            Start New Evaluation
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Status</th>
                <th>Score</th>
                <th>Recommendation</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const rec = r.finalReport?.recommendation?.recommendation;
                const score = r.finalReport?.scoreAndBreakdown?.totalScore;
                const candidateName = r.finalReport?.candidateSummary?.name || 'Candidate';
                return (
                  <tr key={r._id}>
                    <td style={{ fontWeight: '600' }}>
                      {candidateName}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {score !== undefined ? (
                        <span style={{ fontWeight: '700', color: score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                          {score} / 100
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {rec ? (
                        <span className={`badge badge-${rec.toLowerCase()}`}>
                          {rec}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>In progress</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/runs/${r._id}`} className="btn btn-outline btn-sm">
                        View Report <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
