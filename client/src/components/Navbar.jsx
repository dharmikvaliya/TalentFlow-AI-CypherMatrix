import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, PlayCircle, History, BookOpen } from 'lucide-react';
import { getHealthStatus } from '../services/api';

export default function Navbar() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealthStatus()
      .then(res => setHealth(res))
      .catch(() => setHealth(null));
  }, []);

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
              <span className={`badge-mock ${health.environment?.llmMockMode ? 'is-mock' : 'is-live'}`} title={`Model: ${health.environment?.modelConfigured || 'N/A'}`}>
                {health.environment?.llmMockMode ? 'MOCK DATA' : `LIVE (${(health.environment?.configuredProvider || 'OPENAI').toUpperCase()} - ${health.environment?.modelConfigured})`}
              </span>
            )}
          </nav>
        </div>
      </div>
      {health?.environment?.llmMockMode && (
        <div className="mock-banner">
          <span>⚠️ <strong>MOCK DATA, not a real analysis</strong> — System is operating in local mock mode with deterministic test generators.</span>
        </div>
      )}
    </header>
  );
}
