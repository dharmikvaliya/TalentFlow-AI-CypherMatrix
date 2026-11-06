import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

describe('Privacy Audit & Data Sanitization Suite', () => {
  const liveResultsPath = path.resolve(repoRoot, 'docs/live-results.json');

  it('1. docs/live-results.json exists and is valid JSON', () => {
    expect(fs.existsSync(liveResultsPath)).toBe(true);
    const raw = fs.readFileSync(liveResultsPath, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(raw);
    expect(Array.isArray(data)).toBe(true);
  });

  it('2. all records are explicitly classified as synthetic data', () => {
    const raw = fs.readFileSync(liveResultsPath, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(raw);
    data.forEach(r => {
      expect(r.dataClassification).toBe('synthetic');
      expect(r.containsRealCandidateData).toBe(false);
      expect(r.candidateName).toMatch(/^Synthetic Candidate/);
    });
  });

  it('3. docs/live-results.json contains zero real candidate names', () => {
    const raw = fs.readFileSync(liveResultsPath, 'utf8');
    expect(raw).not.toMatch(/Dharmik/i);
    expect(raw).not.toMatch(/Valiya/i);
  });

  it('4. docs/live-results.json contains zero private email addresses or phone numbers', () => {
    const raw = fs.readFileSync(liveResultsPath, 'utf8');
    // Reject real email addresses (allow only none or placeholder)
    const emailMatches = raw.match(/[a-zA-Z0-9._%+-]+@(?!example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    expect(emailMatches).toBeNull();

    // Reject real phone patterns
    const phoneMatches = raw.match(/\+?[1-9]\d{1,4}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g);
    expect(phoneMatches).toBeNull();
  });

  it('5. docs/live-results.json contains zero API keys or tokens', () => {
    const raw = fs.readFileSync(liveResultsPath, 'utf8');
    expect(raw).not.toMatch(/sk-proj-[a-zA-Z0-9_-]{20,}/);
    expect(raw).not.toMatch(/gsk_[a-zA-Z0-9_-]{20,}/);
    expect(raw).not.toMatch(/nvapi-[a-zA-Z0-9_-]{20,}/);
  });

  it('6. docs/live-results.json contains zero MongoDB connection strings or database credentials', () => {
    const raw = fs.readFileSync(liveResultsPath, 'utf8');
    expect(raw).not.toMatch(/mongodb(\+srv)?:\/\/[^\s"']+/);
  });
});
