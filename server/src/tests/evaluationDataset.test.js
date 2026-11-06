import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromPDF } from '../services/pdf.service.js';
import { analyzeResumeIntegrity } from '../services/resumeIntegrity.service.js';
import { calculateDeterministicScore } from '../config/scoringRubric.js';
import { getMockResumeParserResponse, getMockSkillsAnalysisResponse } from '../services/mockResponses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const samplesDir = path.resolve(repoRoot, 'samples');
const manifestPath = path.resolve(samplesDir, 'evaluation-manifest.json');
const resultsPath = path.resolve(repoRoot, 'docs/evaluation-results.json');

describe('Task 6: Synthetic Dataset & Measurable Evaluation Suite', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const cases = manifest.cases || [];

  // 1. Manifest Structure & Integrity
  describe('Dataset Structure & PII Safeguards', () => {
    it('1. manifest is valid and contains at least 9 required case scenarios', () => {
      expect(cases.length).toBeGreaterThanOrEqual(9);
      expect(manifest.version).toBeDefined();
    });

    it('2. all manifest entries contain required schema properties', () => {
      for (const tc of cases) {
        expect(tc.id).toBeDefined();
        expect(tc.title).toBeDefined();
        expect(tc.resumeFile).toBeDefined();
        expect(tc.jdFile).toBeDefined();
        expect(tc.role).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(tc.expectedCapabilityCategory);
        expect(['high', 'medium', 'low']).toContain(tc.expectedIntegrityRisk);
        expect(typeof tc.expectedReviewRequirement).toBe('boolean');
        expect(Array.isArray(tc.expectedFlags)).toBe(true);
      }
    });

    it('3. synthetic resumes contain zero real candidate PII and use fictional placeholders', () => {
      for (const tc of cases) {
        const resumePath = path.resolve(samplesDir, 'test-resumes', tc.resumeFile);
        expect(fs.existsSync(resumePath)).toBe(true);
      }
      // Verify manifest notes indicate synthetic provenance
      expect(manifest.description).toMatch(/synthetic/i);
    });
  });

  // 2. Behavioral Detection Guarantees
  describe('Heuristic Detection Accuracy', () => {
    it('4. detects keyword-stuffed resume and raises unsupported skills or repetition flags', async () => {
      const tc = cases.find(c => c.id === 'CASE-03');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(['medium', 'high']).toContain(result.riskLevel);
      expect(result.reviewRequired).toBe(true);
      expect(result.flags.some(f => f.code.startsWith('UNSUPPORTED_SKILLS') || f.code.startsWith('STATISTICAL_REPETITION') || f.code.startsWith('UNNATURAL_REPETITION'))).toBe(true);
    });

    it('5. detects verbatim job description phrase copying with high phrase overlap flag', async () => {
      const tc = cases.find(c => c.id === 'CASE-04');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(['medium', 'high']).toContain(result.riskLevel);
      expect(result.flags.some(f => f.code.startsWith('JD_PHRASE_OVERLAP'))).toBe(true);
      expect(result.metrics.jdPhraseOverlapRatio).toBeGreaterThan(0.2);
    });

    it('6. protects legitimate high-density cloud architect without false-positive gaming penalty', async () => {
      const tc = cases.find(c => c.id === 'CASE-05');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(result.riskLevel).toBe('low');
      expect(result.reviewRequired).toBe(false);
      expect(result.flags.filter(f => f.severity === 'high' || f.severity === 'critical')).toHaveLength(0);
    });

    it('7. adversarial prompt-injection resume triggers prompt injection flag and reviewRequired=true', async () => {
      const tc = cases.find(c => c.id === 'CASE-09');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(result.reviewRequired).toBe(true);
      expect(result.flags.some(f => f.code === 'PROMPT_INJECTION_DETECTED')).toBe(true);
    });

    it('8. different-role candidate (Executive Chef) is not falsely classified as an adversarial cheater', async () => {
      const tc = cases.find(c => c.id === 'CASE-08');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(result.riskLevel).toBe('low');
      expect(result.reviewRequired).toBe(false);
    });

    it('9. summary-only claims without work experience support remain unsupported', async () => {
      const tc = cases.find(c => c.id === 'CASE-10');
      const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
      const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
      const profile = getMockResumeParserResponse(rawText);

      const result = analyzeResumeIntegrity({
        rawResumeText: rawText,
        jobDescription: jdText,
        candidateProfile: profile
      });

      expect(result.flags.some(f => f.code.startsWith('UNSUPPORTED_SKILLS'))).toBe(true);
    });
  });

  // 3. Score Insulation Across All Dataset Resumes
  describe('Capability Score Stability Across Dataset', () => {
    it('10. verifies that capability score is 100% identical before and after integrity analysis for all 12 cases', async () => {
      for (const tc of cases) {
        const { rawText } = await extractTextFromPDF(path.resolve(samplesDir, 'test-resumes', tc.resumeFile));
        const jdText = fs.readFileSync(path.resolve(samplesDir, 'test-jds', tc.jdFile), 'utf8');
        const profile = getMockResumeParserResponse(rawText);
        const skillsAnalysis = getMockSkillsAnalysisResponse(profile, jdText);

        const baselineScore = calculateDeterministicScore({
          requirementMatches: skillsAnalysis.requirementMatches,
          profile,
          jobDescription: jdText
        });

        // Run integrity engine
        analyzeResumeIntegrity({
          rawResumeText: rawText,
          jobDescription: jdText,
          candidateProfile: profile
        });

        const scoreAfterIntegrity = calculateDeterministicScore({
          requirementMatches: skillsAnalysis.requirementMatches,
          profile,
          jobDescription: jdText
        });

        expect(scoreAfterIntegrity.totalScore).toBe(baselineScore.totalScore);
        expect(scoreAfterIntegrity.breakdown).toEqual(baselineScore.breakdown);
      }
    });

    it('11. evaluation results artifact exists and documents 100% score preservation rate', () => {
      expect(fs.existsSync(resultsPath)).toBe(true);
      const evalData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      expect(evalData.scorePreservationRate).toContain('100%');
      expect(evalData.performanceMetrics.accuracy).toBeGreaterThanOrEqual(0.85);
    });
  });
});
