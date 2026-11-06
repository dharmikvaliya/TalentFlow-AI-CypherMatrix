import { finalReportSchema } from '../validators/agentSchemas.js';

/**
 * Escapes HTML metacharacters and Markdown table/link delimiters to prevent injection.
 *
 * @param {string} text - Raw string
 * @returns {string} Sanitized string safe for Markdown and HTML rendering
 */
export function escapeMarkdownAndHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Assembles the final candidate report purely in deterministic code.
 * Ensures zero facts are modified or hallucinated at report time.
 *
 * @param {Object} outputs - Object containing validated stage outputs
 * @param {Array} stageTraces - Execution trace metrics
 * @returns {Object} Validated final report object
 */
export function assembleFinalReport(outputs, stageTraces = []) {
  const {
    parser = {},
    skills = {},
    integrity = null,
    scoring = {},
    questions = {},
    recommendation = {}
  } = outputs;

  const totalDurationMs = stageTraces.reduce((sum, s) => sum + (s.durationMs || 0), 0);
  const primaryProvider = stageTraces.find(s => s.provider && s.provider !== 'code')?.provider || 'mock';
  const primaryModel = stageTraces.find(s => s.model && s.model !== 'deterministic-assembler')?.model || 'mock-deterministic';
  const fallbackUsed = stageTraces.some(s => s.fallbackUsed);

  const rawReport = {
    candidateSummary: {
      name: parser.name || 'Candidate',
      email: parser.email || null,
      phone: parser.phone || null,
      headline: parser.summary ? parser.summary.substring(0, 120) + '...' : null,
      overview: parser.summary || 'Candidate profile extracted successfully from resume.'
    },
    identifiedSkills: skills.skills || [],
    jobMatchResults: {
      jobRequirements: skills.jobRequirements || { required: [], preferred: [], experienceLevel: null },
      requirementMatches: skills.requirementMatches || []
    },
    scoreAndBreakdown: {
      totalScore: scoring.totalScore || 0,
      breakdown: scoring.breakdown || [],
      scoreExplanation: scoring.scoreExplanation || ''
    },
    strengths: scoring.strengths || [],
    skillGaps: scoring.gaps || [],
    interviewQuestions: questions || { technical: [], projectBased: [], behavioral: [], gapProbing: [] },
    resumeIntegrity: integrity || null,
    recommendation: recommendation || {
      recommendation: 'Maybe',
      confidence: 'medium',
      reasoning: 'Evaluation complete.',
      keyRisks: [],
      suggestedNextSteps: [],
      disclaimer: 'Advisory only. Human recruiter decision required.'
    },
    workflowTrace: {
      totalDurationMs,
      provider: primaryProvider,
      model: primaryModel,
      fallbackUsed,
      stages: stageTraces.map(s => ({
        key: s.key,
        name: s.name,
        status: s.status,
        durationMs: s.durationMs || 0,
        provider: s.provider || null,
        model: s.model || null,
        fallbackUsed: Boolean(s.fallbackUsed)
      }))
    },
    disclaimer: 'This candidate evaluation report was generated autonomously by TalentFlow AI using deterministic scoring rubrics and verified evidence grounding. The hiring recommendation is strictly advisory.'
  };

  return finalReportSchema.parse(rawReport);
}

/**
 * Converts a final report object into clean, formatted Markdown with escaped text.
 *
 * @param {Object} report - Validated final report object
 * @returns {string} Markdown text
 */
export function generateMarkdownReport(report) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const providerLabel = (report.workflowTrace?.provider || 'mock').toUpperCase();
  const modelLabel = report.workflowTrace?.model || 'deterministic';
  const fallbackNotice = report.workflowTrace?.fallbackUsed ? ' *(Fallback Engaged)*' : '';

  let md = `# TalentFlow AI — Candidate Evaluation Report

**Candidate Name:** ${escapeMarkdownAndHtml(report.candidateSummary.name)}  
**Contact:** ${[report.candidateSummary.email, report.candidateSummary.phone].filter(Boolean).map(escapeMarkdownAndHtml).join(' | ') || 'N/A'}  
**Date of Analysis:** ${dateStr}  
**Execution Mode:** **${providerLabel}** (\`${modelLabel}\`)${fallbackNotice}  
**Overall Recommendation:** **${report.recommendation.recommendation.toUpperCase()}** (${report.recommendation.confidence} confidence)  
**Deterministic Score:** **${report.scoreAndBreakdown.totalScore} / 100**  

---

## 1. Executive Summary
${escapeMarkdownAndHtml(report.candidateSummary.overview)}

> **Advisory Disclaimer:** ${escapeMarkdownAndHtml(report.disclaimer)}

---

## 2. Objective Rubric Score Breakdown

| Component | Weight | Earned Score | Evaluation Criteria / Explanation |
| :--- | :---: | :---: | :--- |
${report.scoreAndBreakdown.breakdown.map(b => `| **${escapeMarkdownAndHtml(b.component)}** | ${b.weight} pts | **${b.earned}** pts | ${escapeMarkdownAndHtml(b.explanation)} |`).join('\n')}
| **TOTAL** | **100 pts** | **${report.scoreAndBreakdown.totalScore} pts** | *Computed via deterministic mathematical scoring engine* |

### Scoring Narrative
${escapeMarkdownAndHtml(report.scoreAndBreakdown.scoreExplanation)}

---

## 3. Key Strengths (Evidence Grounded)
${report.strengths.map((s, idx) => {
  const cleanPoint = escapeMarkdownAndHtml((s.point || '').replace(/^[-•*\d.]+\s*/, ''));
  const cleanEvidence = escapeMarkdownAndHtml(s.evidence || '');
  return `${idx + 1}. **${cleanPoint}**  \n   *Verified Resume Evidence:* "${cleanEvidence}"`;
}).join('\n\n')}

---

## 4. Skill Gaps & Potential Concerns
${report.skillGaps.map((g, idx) => {
  const cleanPoint = escapeMarkdownAndHtml((g.point || '').replace(/^[-•*\d.]+\s*/, ''));
  const cleanEvidence = g.evidence ? `"${escapeMarkdownAndHtml(g.evidence)}"` : 'Not documented in candidate profile';
  return `${idx + 1}. **${cleanPoint}** [Severity: **${g.severity.toUpperCase()}**]  \n   *Note:* ${cleanEvidence}`;
}).join('\n\n')}

---

## 5. Job Description Requirement Alignment

| Requirement | Type | Status | Verified Evidence / Reasoning |
| :--- | :---: | :---: | :--- |
${report.jobMatchResults.requirementMatches.map(m => {
  const req = escapeMarkdownAndHtml(m.requirement);
  const reasoning = escapeMarkdownAndHtml(m.reasoning || '');
  const evidence = m.evidence ? `*(Evidence: "${escapeMarkdownAndHtml(m.evidence)}")*` : '';
  return `| ${req} | \`${m.type}\` | **${m.status.toUpperCase()}** | ${reasoning} ${evidence} |`;
}).join('\n')}

---

## 6. Targeted Interview Questions

### Technical Deep Dive
${report.interviewQuestions.technical.map((q, idx) => {
  const cleanQ = escapeMarkdownAndHtml((q.question || '').replace(/^[-•*\d.]+\s*/, ''));
  const target = escapeMarkdownAndHtml(q.targetSkill || '');
  const reason = escapeMarkdownAndHtml(q.reason || '');
  const lookFor = escapeMarkdownAndHtml(q.whatToLookFor || '');
  return `${idx + 1}. **${cleanQ}** [Difficulty: *${q.difficulty}* | Target: *${target}*]  \n   - *Why this question:* ${reason}  \n   - *What to look for:* ${lookFor}`;
}).join('\n\n')}

### Project-Based Inquiries
${report.interviewQuestions.projectBased.map((q, idx) => {
  const cleanQ = escapeMarkdownAndHtml((q.question || '').replace(/^[-•*\d.]+\s*/, ''));
  const proj = escapeMarkdownAndHtml(q.relatedProject || '');
  const reason = escapeMarkdownAndHtml(q.reason || '');
  const lookFor = escapeMarkdownAndHtml(q.whatToLookFor || '');
  return `${idx + 1}. **${cleanQ}** [Project: *${proj}*]  \n   - *Reason:* ${reason}  \n   - *What to look for:* ${lookFor}`;
}).join('\n\n')}

### Behavioral & Alignment
${report.interviewQuestions.behavioral.map((q, idx) => {
  const cleanQ = escapeMarkdownAndHtml((q.question || '').replace(/^[-•*\d.]+\s*/, ''));
  const reason = escapeMarkdownAndHtml(q.reason || '');
  return `${idx + 1}. **${cleanQ}**  \n   - *Reason:* ${reason}`;
}).join('\n\n')}

### Gap Probing
${report.interviewQuestions.gapProbing.map((q, idx) => {
  const cleanQ = escapeMarkdownAndHtml((q.question || '').replace(/^[-•*\d.]+\s*/, ''));
  const gap = escapeMarkdownAndHtml(q.relatedGap || '');
  const reason = escapeMarkdownAndHtml(q.reason || '');
  return `${idx + 1}. **${cleanQ}** [Investigating: *${gap}*]  \n   - *Reason:* ${reason}`;
}).join('\n\n')}

---

## 7. Recommendation & Next Steps
- **Confidence Rating:** ${report.recommendation.confidence.toUpperCase()}
- **Synthesis:** ${escapeMarkdownAndHtml(report.recommendation.reasoning)}

### Key Risks
${report.recommendation.keyRisks.map(r => `- ${escapeMarkdownAndHtml(r.replace(/^[-•*\d.]+\s*/, ''))}`).join('\n')}

### Suggested Next Steps
${report.recommendation.suggestedNextSteps.map((s, idx) => `${idx + 1}. ${escapeMarkdownAndHtml(s.replace(/^[-•*\d.]+\s*/, ''))}`).join('\n')}

---

${report.resumeIntegrity ? `---

## Resume Integrity Analysis
- **Risk Level:** **${(report.resumeIntegrity.riskLevel || 'low').toUpperCase()}**
- **Integrity Confidence:** **${report.resumeIntegrity.confidence}%**
- **Human Review Required:** **${report.resumeIntegrity.reviewRequired ? 'YES' : 'NO'}**

### Summary
${escapeMarkdownAndHtml(report.resumeIntegrity.summary)}

### Detected Signals & Flags
${(report.resumeIntegrity.flags || []).length === 0 ? '_No suspicious integrity signals or anomalies detected._' : report.resumeIntegrity.flags.map(f => {
  const code = escapeMarkdownAndHtml(f.code);
  const title = escapeMarkdownAndHtml(f.title);
  const explanation = escapeMarkdownAndHtml(f.explanation);
  const skills = (f.affectedSkills || []).map(escapeMarkdownAndHtml).join(', ');
  const evidenceList = (f.evidence || []).slice(0, 3).map(e => `     - "${escapeMarkdownAndHtml(e.length > 120 ? e.substring(0, 117) + '...' : e)}"`).join('\n');
  return `- **[${f.severity.toUpperCase()}] ${title}** (\`${code}\`)\n  - *Details:* ${explanation}${skills ? `\n  - *Affected Skills:* ${skills}` : ''}${evidenceList ? `\n  - *Evidence Samples:*\n${evidenceList}` : ''}`;
}).join('\n\n')}

### Integrity Metrics
- Total Resume Words: **${report.resumeIntegrity.metrics.totalWords}**
- Unique Vocabulary Ratio: **${(report.resumeIntegrity.metrics.uniqueWordRatio * 100).toFixed(1)}%**
- Overlapping JD Phrase Ratio: **${(report.resumeIntegrity.metrics.jdPhraseOverlapRatio * 100).toFixed(1)}%**
- Uncorroborated Skill Claim Ratio: **${(report.resumeIntegrity.metrics.unsupportedSkillRatio * 100).toFixed(1)}%**
- Prompt Injection Indicators: **${report.resumeIntegrity.metrics.promptInjectionIndicatorCount}**

### Limitations & Separation Notice
> **Important Distinction:** The capability score evaluates candidate job fit based on verified qualifications. Resume integrity analysis identifies textual risk signals that warrant human interview verification. An elevated integrity risk does NOT prove dishonesty, intent to deceive, or incompetence, and does not automatically deduct points from the capability score.

${(report.resumeIntegrity.limitations || []).map(l => `- *${escapeMarkdownAndHtml(l)}*`).join('\n')}

` : ''}## 8. Workflow Execution Trace

| Stage | Name | Status | Execution Duration |
| :--- | :--- | :---: | :---: |
${report.workflowTrace.stages.map(st => `| \`${st.key}\` | ${st.name} | \`${st.status}\` | ${(st.durationMs / 1000).toFixed(2)}s |`).join('\n')}
| **Total Duration** | | | **${(report.workflowTrace.totalDurationMs / 1000).toFixed(2)}s** |

---
*Report generated by TalentFlow AI Orchestrator v1.0.0*
`;

  return md;
}
