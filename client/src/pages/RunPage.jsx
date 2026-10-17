import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Tag,
  Award,
  HelpCircle,
  CheckCircle2,
  Layers,
  FileCheck2
} from 'lucide-react';
import { getWorkflowRun, retryWorkflowStage } from '../services/api';
import PipelineView from '../components/PipelineView';
import CandidateInfoTab from '../components/CandidateInfoTab';
import SkillsTab from '../components/SkillsTab';
import EvaluationTab from '../components/EvaluationTab';
import QuestionsTab from '../components/QuestionsTab';
import RecommendationTab from '../components/RecommendationTab';
import AgentTraceTab from '../components/AgentTraceTab';
import FinalReportTab from '../components/FinalReportTab';

export default function RunPage() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('candidateInfo');

  const fetchRun = useCallback(async () => {
    try {
      const data = await getWorkflowRun(id);
      setRun(data.run);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch workflow run');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
    // Poll every 1.5 seconds if in progress
    const interval = setInterval(() => {
      setRun((prevRun) => {
        if (prevRun && (prevRun.status === 'completed' || prevRun.status === 'failed')) {
          clearInterval(interval);
          return prevRun;
        }
        fetchRun();
        return prevRun;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [id, fetchRun]);

  const handleRetryStage = async (stageKey) => {
    try {
      setError(null);
      await retryWorkflowStage(id, stageKey);
      await fetchRun();
    } catch (err) {
      setError(err.message || `Failed to retry stage ${stageKey}`);
    }
  };

  if (loading && !run) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading recruitment workflow...</p>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
        <Link to="/" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back to Upload
        </Link>
      </div>
    );
  }

  // Extract stage outputs
  const parserOutput = run?.stages?.find(s => s.key === 'resumeParser')?.output;
  const skillsOutput = run?.stages?.find(s => s.key === 'skillsAnalysis')?.output;
  const scoringOutput = run?.stages?.find(s => s.key === 'scoring')?.output;
  const questionsOutput = run?.stages?.find(s => s.key === 'interviewQuestions')?.output;
  const recommendationOutput = run?.stages?.find(s => s.key === 'recommendation')?.output;
  const finalReportOutput = run?.finalReport;

  const candidateName = parserOutput?.name || run?.candidateId?.fileName || 'Candidate';

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            <ArrowLeft size={14} /> Back to Upload
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>Candidate Analysis:</span>
            <span style={{ color: 'var(--primary)' }}>{candidateName}</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {run?.workflowTrace?.provider && (
            <span
              className={`badge-mock ${run.workflowTrace.provider === 'mock' ? 'is-mock' : 'is-live'}`}
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
            >
              {run.workflowTrace.provider === 'mock'
                ? 'MOCK DATA'
                : `LIVE (${(run.workflowTrace.provider || 'OPENAI').toUpperCase()} - ${run.workflowTrace.model || 'model'})`}
            </span>
          )}
          <span className={`badge badge-${run?.status || 'pending'}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
            {run?.status === 'running' && <div className="spinner" style={{ width: '12px', height: '12px', marginRight: '5px' }} />}
            {run?.status}
          </span>
          <button
            type="button"
            onClick={fetchRun}
            className="btn btn-outline btn-sm"
            title="Refresh pipeline status"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Pipeline View Component */}
      <PipelineView stages={run?.stages || []} onRetryStage={handleRetryStage} />

      {/* Navigation Tabs Header */}
      <div className="tabs-header">
        <button
          type="button"
          onClick={() => setActiveTab('candidateInfo')}
          className={`tab-btn ${activeTab === 'candidateInfo' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={15} /> Candidate Info
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Tag size={15} /> Skills ({skillsOutput?.skills?.length || 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evaluation')}
          className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Award size={15} /> Evaluation {scoringOutput ? `(${scoringOutput.totalScore}/100)` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <HelpCircle size={15} /> Questions
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recommendation')}
          className={`tab-btn ${activeTab === 'recommendation' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={15} /> Recommendation {recommendationOutput ? `(${recommendationOutput.recommendation})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agentTrace')}
          className={`tab-btn ${activeTab === 'agentTrace' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={15} /> Agent Trace ({run?.stages?.length || 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finalReport')}
          className={`tab-btn ${activeTab === 'finalReport' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileCheck2 size={15} /> Final Report
          </span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'candidateInfo' && <CandidateInfoTab profile={parserOutput} />}
        {activeTab === 'skills' && <SkillsTab skillsAnalysis={skillsOutput} />}
        {activeTab === 'evaluation' && <EvaluationTab scoring={scoringOutput} />}
        {activeTab === 'questions' && <QuestionsTab questions={questionsOutput} />}
        {activeTab === 'recommendation' && <RecommendationTab recommendation={recommendationOutput} score={scoringOutput?.totalScore} />}
        {activeTab === 'agentTrace' && <AgentTraceTab stages={run?.stages || []} />}
        {activeTab === 'finalReport' && <FinalReportTab report={finalReportOutput} runId={id} />}
      </div>
    </div>
  );
}
