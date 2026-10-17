import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { uploadResume, createWorkflowRun } from '../services/api';

const SAMPLE_JD = `Job Title: Full-Stack AI Engineer / AI Automation Intern
Company: Cypher Matrix Technologies
Location: Remote / Hybrid

About the Role:
We are seeking an enthusiastic and talented Full-Stack AI Engineer to design and implement cutting-edge agentic workflows, LLM orchestration pipelines, and scalable recruitment automation systems. You will work on real-world generative AI products combining React, Node.js, and multi-agent coordination.

Key Responsibilities:
- Build reliable, end-to-end full-stack web applications using React, Node.js, Express, and MongoDB.
- Architect multi-step agentic workflows and pipeline orchestration consuming structured JSON schemas.
- Implement LLM provider integrations (OpenAI, Ollama) with robust prompt engineering and schema validation.
- Design transparent, rubric-based deterministic scoring engines with evidence grounding.
- Create responsive recruiter dashboards featuring workflow execution traces and candidate evaluation reports.

Required Qualifications & Skills:
- Proficiency in JavaScript/TypeScript, Node.js, and Express (ES modules).
- Strong hands-on experience with React, Vite, state management, and modern CSS.
- Experience with MongoDB/Mongoose or PostgreSQL database design.
- Practical experience integrating LLM APIs using structured output / JSON mode.
- Familiarity with runtime schema validation libraries (Zod).

Preferred / Nice-to-Have:
- Experience building RAG applications with embeddings and vector databases.
- Familiarity with workflow orchestration frameworks (LangGraph or custom state machines).
- Experience with Docker, automated testing (Vitest, Jest) and Python scripting.`;

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  // File drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    setError(null);
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('Only PDF resumes are supported. Please select a valid .pdf file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit.');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);

    try {
      const res = await uploadResume(selectedFile);
      setCandidate(res);
    } catch (err) {
      setError(err.message || 'Failed to parse resume PDF. Please check file format.');
      setFile(null);
      setCandidate(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSampleJD = () => {
    if (jobDescription && jobDescription.trim().length > 0) {
      const confirmed = window.confirm(
        'A job description is already entered. Do you want to replace it with the sample JD?'
      );
      if (!confirmed) return;
    }
    setJobDescription(SAMPLE_JD);
  };

  const handleRunAnalysis = async () => {
    if (!candidate?.candidateId) {
      setError('Please upload and extract a candidate resume first.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 20) {
      setError('Please enter a detailed job description (at least 20 characters).');
      return;
    }

    setIsStartingRun(true);
    setError(null);

    try {
      const res = await createWorkflowRun({
        candidateId: candidate.candidateId,
        jobDescription: jobDescription.trim()
      });
      // Navigate to the live run dashboard
      navigate(`/runs/${res.runId}`);
    } catch (err) {
      setError(err.message || 'Failed to initialize recruitment workflow.');
      setIsStartingRun(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Autonomous Recruitment Pipeline
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
          Upload a candidate resume and target job description to trigger our 6-stage AI agent evaluation workflow.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Error: </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step 1: Upload Resume */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem'
            }}>1</span>
            Candidate Resume (PDF)
          </h2>
          {candidate && (
            <span className="badge badge-success">
              <CheckCircle2 size={13} /> Text Extracted
            </span>
          )}
        </div>

        {!candidate ? (
          <div
            className={`dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="dropzone-icon">
              {isUploading ? <div className="spinner" style={{ width: '32px', height: '32px' }} /> : <UploadCloud size={44} />}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {isUploading ? 'Extracting text from PDF (Stage 0)...' : 'Click or drag PDF resume here'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              PDF format only, maximum 5 MB
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--primary-light)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={24} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{candidate.fileName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {candidate.pageCount} page(s) • {candidate.charCount} characters extracted
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setCandidate(null);
                  setFile(null);
                }}
              >
                Change PDF
              </button>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Extracted Raw Text Preview (Stage 0 Output)
              </label>
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                fontSize: '0.825rem',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {candidate.rawTextPreview}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Job Description */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem'
            }}>2</span>
            Target Job Description
          </h2>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleLoadSampleJD}
          >
            <Sparkles size={14} color="var(--primary)" />
            Load Sample JD
          </button>
        </div>

        <div className="form-group">
          <textarea
            className="form-textarea"
            placeholder="Paste the target job description, requirements, and responsibilities here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Minimum 20 characters</span>
            <span>{jobDescription.length} characters</span>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
          disabled={!candidate || !jobDescription || jobDescription.trim().length < 20 || isStartingRun}
          onClick={handleRunAnalysis}
        >
          {isStartingRun ? (
            <>
              <div className="spinner" /> Initializing Pipeline...
            </>
          ) : (
            <>
              Run Analysis <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
