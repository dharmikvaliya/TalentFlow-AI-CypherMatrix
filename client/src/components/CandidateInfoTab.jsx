import React from 'react';
import { User, Mail, Phone, ExternalLink, GraduationCap, Briefcase, FolderGit2, Award } from 'lucide-react';

export default function CandidateInfoTab({ profile }) {
  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        Candidate profile is pending extraction...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Profile Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: '700'
          }}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'C'}
          </div>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {profile.name}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {profile.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} /> {profile.email}
                </span>
              )}
              {profile.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} /> {profile.phone}
                </span>
              )}
              {profile.links?.map((link, idx) => (
                <a key={idx} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ExternalLink size={13} /> {link.replace(/^https?:\/\//, '')}
                </a>
              ))}
            </div>
          </div>
        </div>

        {profile.summary && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.925rem', color: 'var(--text-main)' }}>
            <strong>Summary: </strong> {profile.summary}
          </div>
        )}
      </div>

      {/* Experience Section */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3 className="card-title">
            <Briefcase size={18} color="var(--primary)" />
            Professional Experience ({profile.experience?.length || 0})
          </h3>
        </div>

        {profile.experience?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No formal experience records listed.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {profile.experience?.map((exp, idx) => (
              <div key={idx} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>
                    {exp.role} <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>at {exp.company}</span>
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {exp.startDate || 'N/A'} — {exp.endDate || 'Present'}
                  </span>
                </div>
                {exp.description && (
                  <p style={{ fontSize: '0.875rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
                    {exp.description}
                  </p>
                )}
                {exp.highlights?.length > 0 && (
                  <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                    {exp.highlights.map((h, hIdx) => (
                      <li key={hIdx} style={{ marginBottom: '0.2rem' }}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3 className="card-title">
            <FolderGit2 size={18} color="var(--primary)" />
            Key Projects ({profile.projects?.length || 0})
          </h3>
        </div>

        {profile.projects?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No individual projects documented.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {profile.projects?.map((proj, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.975rem', fontWeight: '600', marginBottom: '0.35rem' }}>{proj.name}</h4>
                {proj.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    {proj.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
                  {proj.technologies?.map((t, tIdx) => (
                    <span key={tIdx} style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      {t}
                    </span>
                  ))}
                </div>
                {proj.highlights?.length > 0 && (
                  <ul style={{ paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    {proj.highlights.map((h, hIdx) => (
                      <li key={hIdx} style={{ marginBottom: '0.2rem' }}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education & Achievements Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <GraduationCap size={18} color="var(--primary)" />
              Education
            </h3>
          </div>
          {profile.education?.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.925rem' }}>{edu.degree} in {edu.field || 'General Studies'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{edu.institution}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {edu.startYear || ''} — {edu.endYear || ''} {edu.grade ? `• ${edu.grade}` : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Award size={18} color="var(--warning)" />
              Skills & Achievements
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {profile.skillsListed?.map((s, idx) => (
              <span key={idx} style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                {s}
              </span>
            ))}
          </div>
          {profile.achievements?.length > 0 && (
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
              {profile.achievements.map((a, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
