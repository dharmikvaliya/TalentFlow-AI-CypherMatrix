import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bot, PlayCircle, History, BookOpen, ChevronDown, Check, Zap, Cpu, Globe, Shield } from 'lucide-react';
import { getHealthStatus, updateActiveProvider } from '../services/api';

const QUICK_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4.1-mini', icon: Cpu, isMock: false },
  { id: 'groq', name: 'Groq (Ultra-Fast)', model: 'openai/gpt-oss-120b', icon: Zap, isMock: false },
  { id: 'openrouter', name: 'OpenRouter (Free)', model: 'google/gemma-4-31b-it:free', icon: Globe, isMock: false },
  { id: 'mock', name: 'Mock Engine (Offline)', model: 'mock-deterministic', icon: Shield, isMock: true }
];

export default function Navbar() {
  const [health, setHealth] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const checkHealth = () => {
      getHealthStatus()
        .then(res => {
          if (isMounted) setHealth(res);
        })
        .catch(() => {
          if (isMounted) setHealth(null);
        });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Listen to provider change events dispatched across pages
  useEffect(() => {
    const handleProviderChanged = (e) => {
      if (e.detail) {
        setHealth((prev) => ({
          ...prev,
          environment: {
            ...prev?.environment,
            configuredProvider: e.detail.provider,
            modelConfigured: e.detail.model,
            llmMockMode: e.detail.llmMockMode
          }
        }));
      }
    };
    window.addEventListener('provider-changed', handleProviderChanged);
    return () => window.removeEventListener('provider-changed', handleProviderChanged);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectQuickProvider = async (p) => {
    setDropdownOpen(false);
    try {
      const res = await updateActiveProvider(p.id, p.model);
      setHealth((prev) => ({
        ...prev,
        environment: {
          ...prev?.environment,
          configuredProvider: p.id,
          modelConfigured: p.model,
          llmMockMode: p.isMock
        }
      }));
      window.dispatchEvent(new CustomEvent('provider-changed', {
        detail: {
          provider: p.id,
          model: p.model,
          llmMockMode: p.isMock
        }
      }));
    } catch (err) {
      console.warn('Failed to switch provider from Navbar:', err);
    }
  };

  const isMock = health?.environment?.llmMockMode;
  const currentProvider = (health?.environment?.configuredProvider || 'OPENAI').toUpperCase();
  const currentModel = health?.environment?.modelConfigured || '';

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        <div className="navbar-inner">
          <NavLink to="/" className="brand">
            <div className="brand-icon">
              <Bot size={20} />
            </div>
            <span>TalentFlow AI</span>
          </NavLink>

          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <PlayCircle size={16} /> New Analysis
              </span>
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <History size={16} /> Past Runs
              </span>
            </NavLink>
            <NavLink to="/how-it-works" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={16} /> How It Works
              </span>
            </NavLink>

            {health && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(prev => !prev)}
                  className={`badge-mock ${isMock ? 'is-mock' : 'is-live'}`}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: 'none',
                    fontFamily: 'inherit'
                  }}
                  title="Click to switch active AI Provider / Mode"
                >
                  <span>{isMock ? 'MOCK DATA (OFFLINE)' : `LIVE (${currentProvider} - ${currentModel})`}</span>
                  <ChevronDown size={14} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '260px',
                    background: '#181b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                    padding: '6px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', fontWeight: '700' }}>
                      Switch AI Provider Mode
                    </div>

                    {QUICK_PROVIDERS.map(qp => {
                      const Icon = qp.icon;
                      const isActive = (isMock && qp.id === 'mock') || (!isMock && health?.environment?.configuredProvider === qp.id);
                      return (
                        <button
                          key={qp.id}
                          type="button"
                          onClick={() => handleSelectQuickProvider(qp)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 10px',
                            background: isActive ? '#21262d' : 'transparent',
                            border: '1px solid ' + (isActive ? '#388bfd' : 'transparent'),
                            borderRadius: '6px',
                            color: '#c9d1d9',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#21262d'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon size={16} color={qp.id === 'mock' ? '#f0883e' : '#3fb950'} />
                            <div>
                              <div style={{ fontWeight: isActive ? '700' : '500', color: '#f0f6fc' }}>{qp.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>{qp.model}</div>
                            </div>
                          </div>
                          {isActive && <Check size={14} color="#58a6ff" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
      {isMock && (
        <div className="mock-banner">
          <span>⚠️ <strong>MOCK DATA, not a real analysis</strong> — System is operating in local mock mode with deterministic test generators.</span>
        </div>
      )}
    </header>
  );
}
