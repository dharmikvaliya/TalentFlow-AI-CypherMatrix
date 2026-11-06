import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Cpu,
  Zap,
  Shield,
  Key,
  Globe
} from 'lucide-react';
import { uploadResume, createWorkflowRun, getAvailableProviders, updateActiveProvider } from '../services/api';

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

const FALLBACK_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'High Accuracy',
    hasKey: true,
    defaultModel: 'gpt-4.1-mini',
    models: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o']
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: 'Ultra Fast (~300 tok/s)',
    hasKey: true,
    defaultModel: 'openai/gpt-oss-120b',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'llama-3.3-70b-versatile'
    ]
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: '12 Free Models / 200+ Total',
    hasKey: true,
    defaultModel: 'openrouter/free',
    models: [
      'openrouter/free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'google/gemma-4-31b-it:free',
      'meta-llama/llama-3.3-70b-instruct'
    ]
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    badge: 'Enterprise Privacy (84 Models)',
    hasKey: true,
    defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
    models: [
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'openai/gpt-oss-20b',
      'mistralai/mistral-7b-instruct-v0.3'
    ]
  },
  {
    id: 'ollama',
    name: 'Ollama',
    badge: '100% Local / Free',
    hasKey: true,
    defaultModel: 'llama3:latest',
    models: ['llama3:latest', 'llama3.2', 'mistral', 'phi3']
  },
  {
    id: 'mock',
    name: 'Mock Engine',
    badge: '100% Offline / Fast Test',
    hasKey: true,
    defaultModel: 'mock-deterministic',
    models: ['mock-deterministic']
  }
];

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

  // Model & Provider Selection State
  const [providers, setProviders] = useState(FALLBACK_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-mini');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  // Fetch available providers & active configured provider from server
  useEffect(() => {
    let isMounted = true;
    async function loadProviders() {
      try {
        const res = await getAvailableProviders();
        if (isMounted && res && res.providers && res.providers.length > 0) {
          setProviders(res.providers);
          const active = res.activeProvider || 'openai';
          const matched = res.providers.find(p => p.id === active) || res.providers[0];
          setSelectedProvider(matched.id);
          setSelectedModel(matched.defaultModel || matched.models[0] || '');
        }
      } catch (err) {
        console.warn('Could not fetch providers from server; using defaults:', err);
      }
    }
    loadProviders();
    return () => { isMounted = false; };
  }, []);

  const handleProviderSelect = async (prov) => {
    setSelectedProvider(prov.id);
    const targetModel = prov.defaultModel || (prov.models && prov.models[0]) || '';
    setSelectedModel(targetModel);
    setIsCustomModel(false);
    setCustomModelName('');

    try {
      await updateActiveProvider(prov.id, targetModel);
      window.dispatchEvent(new CustomEvent('provider-changed', {
        detail: {
          provider: prov.id,
          model: targetModel,
          llmMockMode: prov.id === 'mock'
        }
      }));
    } catch (err) {
      console.warn('Could not update active provider on server:', err);
    }
  };

  const currentProviderObj = providers.find(p => p.id === selectedProvider) || providers[0];

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

    const finalModel = (isCustomModel && customModelName.trim())
      ? customModelName.trim()
      : selectedModel;

    setIsStartingRun(true);
    setError(null);

    try {
      const res = await createWorkflowRun({
        candidateId: candidate.candidateId,
        jobDescription: jobDescription.trim(),
        provider: selectedProvider,
        model: finalModel
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

      {/* Step 3: AI Provider & Model Configuration */}
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
            }}>3</span>
            AI Provider &amp; Model Selection
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Interactive Multi-Provider Selection
          </span>
        </div>

        {/* Provider Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          {providers.map((prov) => {
            const isSelected = selectedProvider === prov.id;
            return (
              <div
                key={prov.id}
                onClick={() => handleProviderSelect(prov)}
                style={{
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary-light)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                    {prov.name}
                  </span>
                  {isSelected && (
                    <span style={{
                      background: 'var(--primary)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: '700'
                    }}>
                      ✓
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.725rem',
                    background: isSelected ? '#ffffff' : '#f1f5f9',
                    color: 'var(--text-main)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    {prov.badge}
                  </span>
                  {prov.hasKey ? (
                    <span style={{ fontSize: '0.725rem', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      ● Key Ready
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.725rem', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      ○ No Key in .env
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Model Selection Row */}
        {currentProviderObj && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>
                Target Model for {currentProviderObj.name}:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modelMode"
                    checked={!isCustomModel}
                    onChange={() => setIsCustomModel(false)}
                  />
                  Curated List
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modelMode"
                    checked={isCustomModel}
                    onChange={() => setIsCustomModel(true)}
                  />
                  Custom Model ID
                </label>
              </div>
            </div>

            {!isCustomModel ? (
              <select
                className="form-textarea"
                style={{ minHeight: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}
                value={selectedModel}
                onChange={async (e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  try {
                    await updateActiveProvider(selectedProvider, newModel);
                    window.dispatchEvent(new CustomEvent('provider-changed', {
                      detail: {
                        provider: selectedProvider,
                        model: newModel,
                        llmMockMode: selectedProvider === 'mock'
                      }
                    }));
                  } catch (err) {
                    console.warn('Could not update active model on server:', err);
                  }
                }}
              >
                {(currentProviderObj.models || [currentProviderObj.defaultModel]).map((m) => (
                  <option key={m} value={m}>
                    {m} {m === currentProviderObj.defaultModel ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-textarea"
                style={{ minHeight: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                placeholder={`Enter any ${currentProviderObj.name} model ID (e.g. ${currentProviderObj.defaultModel})`}
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
              />
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                Active Execution: <strong>{currentProviderObj.name}</strong> • Model: <code>{isCustomModel && customModelName.trim() ? customModelName.trim() : selectedModel}</code>
              </span>
              {selectedProvider === 'mock' && (
                <span style={{ color: '#d97706', fontWeight: '500' }}>Offline deterministic fixtures (0 API costs)</span>
              )}
            </div>
          </div>
        )}
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
