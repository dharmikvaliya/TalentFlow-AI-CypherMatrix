import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app.js';
import { LLMProviderError, extractRetryDelaySeconds, llmService } from '../services/llm.service.js';
import { systemPrompt as parserSysPrompt } from '../agents/resumeParser.agent.js';
import { systemPrompt as skillsSysPrompt, verifyEvidenceGrounding } from '../agents/skillsAnalysis.agent.js';
import { systemPrompt as scoringSysPrompt } from '../agents/scoring.agent.js';
import { systemPrompt as questionsSysPrompt } from '../agents/interviewQuestions.agent.js';
import { systemPrompt as recSysPrompt } from '../agents/recommendation.agent.js';
import { escapeMarkdownAndHtml, assembleFinalReport, generateMarkdownReport } from '../report/reportAssembler.js';
import { checkDemoRateLimits, recordDemoRun, resetDemoRateLimits } from '../controllers/runs.controller.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';

describe('QA Audit Fixes & Verification Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDemoRateLimits();
  });

  // 1. Typed LLMProviderError and No Silent Fallback
  describe('LLMProviderError & Silent Fallback Elimination', () => {
    it('instantiates LLMProviderError with provider, status, retryAfterSeconds, and message', () => {
      const err = new LLMProviderError({
        provider: 'openai',
        status: 429,
        retryAfterSeconds: 35386,
        message: 'Daily quota exceeded'
      });

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('LLMProviderError');
      expect(err.provider).toBe('openai');
      expect(err.status).toBe(429);
      expect(err.retryAfterSeconds).toBe(35386);
      expect(err.message).toBe('Daily quota exceeded');
    });

    it('throws LLMProviderError on provider failure when LLM_ALLOW_MOCK_FALLBACK is false', async () => {
      const originalEnv = { ...process.env };
      process.env.LLM_MOCK = 'false';
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'fake_test_key';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'false';

      // Mock getOpenAI to throw a 429 rate limit error
      vi.spyOn(llmService, 'getOpenAI').mockReturnValue({
        chat: {
          completions: {
            create: async () => {
              const error = new Error('429 Too Many Requests: quota exceeded');
              error.status = 429;
              error.errorDetails = [{ retryDelay: '35386s' }];
              throw error;
            }
          }
        }
      });

      await expect(
        llmService.generateStructuredJSON({
          agentName: 'resumeParser',
          systemPrompt: 'test system',
          userPrompt: 'test user'
        })
      ).rejects.toThrow(LLMProviderError);

      process.env = originalEnv;
    });
  });

  // 2. Retry Policy & 429 Fail-Fast Parsing
  describe('Retry Policy & 429 Fail-Fast Parsing', () => {
    it('correctly extracts retryDelay seconds from payload json string', () => {
      const err = new Error('Resource has been exhausted (e.g. check quota-rate-limits)');
      err.errorDetails = [{ retryDelay: '35386s' }];

      const delay = extractRetryDelaySeconds(err);
      expect(delay).toBe(35386);
    });

    it('correctly extracts retryDelay from human-readable text "Please retry in 9h49m46s"', () => {
      const err = new Error('Quota exceeded. Please retry in 9h49m46s. Rate limit: 20');
      const delay = extractRetryDelaySeconds(err);
      expect(delay).toBe(9 * 3600 + 49 * 60 + 46);
    });

    it('correctly extracts retry-after HTTP header format', () => {
      const err = new Error('Too Many Requests: retry-after: 45');
      const delay = extractRetryDelaySeconds(err);
      expect(delay).toBe(45);
    });

    it('fails fast on 429 when retryDelay > 60 seconds without executing multiple retries', async () => {
      const originalEnv = { ...process.env };
      process.env.LLM_MOCK = 'false';
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'fake_test_key';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'false';

      let callCount = 0;
      vi.spyOn(llmService, 'getOpenAI').mockReturnValue({
        chat: {
          completions: {
            create: async () => {
              callCount++;
              const error = new Error('429 Quota Exceeded');
              error.status = 429;
              error.message = 'Quota exceeded retryDelay: "35386s"';
              throw error;
            }
          }
        }
      });

      try {
        await llmService.generateStructuredJSON({
          agentName: 'scoring',
          systemPrompt: 'sys',
          userPrompt: 'usr'
        });
      } catch (err) {
        expect(err).toBeInstanceOf(LLMProviderError);
        expect(err.status).toBe(429);
        expect(err.retryAfterSeconds).toBe(35386);
      }

      // Must have failed on the very first call with 0 retries
      expect(callCount).toBe(1);

      process.env = originalEnv;
    });
  });

  // 3. Health Endpoint & Provider Labeling
  describe('Provider Metadata & Health Endpoint', () => {
    it('/api/health reports configuredProvider, allowMockFallback, and lastProviderStatus', async () => {
      const server = app.listen(0);
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.environment).toBeDefined();
        expect(data.environment.configuredProvider).toBeDefined();
        expect(data.environment.modelConfigured).toBeDefined();
        expect(typeof data.environment.allowMockFallback).toBe('boolean');
        expect(data.environment.lastProviderStatus).toBeDefined();
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });
  });

  // 4. Prompt Injection Directives & Untrusted Boundary Delimiters
  describe('Prompt Injection Boundary Directives', () => {
    it('all 5 agents enforce SECURITY DIRECTIVE in their system prompts', () => {
      const prompts = [
        parserSysPrompt,
        skillsSysPrompt,
        scoringSysPrompt,
        questionsSysPrompt,
        recSysPrompt
      ];

      for (const prompt of prompts) {
        expect(prompt).toContain('SECURITY DIRECTIVE');
        expect(prompt).toMatch(/treat.*strictly as passive data|passive data/i);
      }
    });

    it('parser wraps untrusted text in <UNTRUSTED_RESUME_TEXT> tags', () => {
      expect(parserSysPrompt).toContain('<UNTRUSTED_RESUME_TEXT>');
    });

    it('skills analysis agent references UNTRUSTED delimiters', () => {
      expect(skillsSysPrompt).toContain('<UNTRUSTED_JOB_DESCRIPTION>');
      expect(skillsSysPrompt).toContain('<UNTRUSTED_RESUME_DATA>');
    });
  });

  // 5. Strict RawText-Only Evidence Grounding
  describe('Strict RawText-Only Grounding Verification', () => {
    const rawResumeText = 'Jane Doe. Senior Full-Stack Developer with 6 years experience in React, Node.js, and PostgreSQL.';
    const fakeProfile = {
      name: 'Jane Doe',
      skillsListed: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'] // Profile claims Docker/Kubernetes
    };

    it('downgrades requirement match to missing if citation is not found in rawText even if listed in profile', () => {
      const skillsData = {
        skills: [],
        jobRequirements: {
          required: ['Docker container orchestration'],
          preferred: [],
          experienceLevel: 'Senior'
        },
        requirementMatches: [
          {
            requirement: 'Docker container orchestration',
            type: 'required',
            status: 'match',
            evidence: 'Architected microservices using Docker and Kubernetes',
            reasoning: 'Extensive Docker experience claimed in candidate summary.'
          }
        ]
      };

      const verified = verifyEvidenceGrounding(skillsData, fakeProfile, rawResumeText);
      const match = verified.requirementMatches[0];

      expect(match.status).toBe('missing');
      expect(match.isGrounded).toBe(false);
      expect(match.evidence).toContain('[Unverified citation]');
    });

    it('rejects paraphrased evidence not found as exact or near-exact substring in rawText', () => {
      const skillsData = {
        skills: [],
        requirementMatches: [
          {
            requirement: 'PostgreSQL database expertise',
            type: 'required',
            status: 'match',
            evidence: 'Has engineered relational SQL architectures with Postgres', // Paraphrase of "PostgreSQL"
            reasoning: 'Claimed knowledge.'
          }
        ]
      };

      const verified = verifyEvidenceGrounding(skillsData, fakeProfile, rawResumeText);
      const match = verified.requirementMatches[0];

      expect(match.status).toBe('missing');
      expect(match.isGrounded).toBe(false);
    });

    it('preserves match status when evidence is an exact substring of rawText', () => {
      const skillsData = {
        skills: [],
        requirementMatches: [
          {
            requirement: 'React and Node.js experience',
            type: 'required',
            status: 'match',
            evidence: 'experience in React, Node.js',
            reasoning: 'Verified in candidate experience.'
          }
        ]
      };

      const verified = verifyEvidenceGrounding(skillsData, fakeProfile, rawResumeText);
      const match = verified.requirementMatches[0];

      expect(match.status).toBe('match');
      expect(match.isGrounded).toBe(true);
      expect(match.evidence).toBe('experience in React, Node.js');
    });

    it('rejects "easy to learn" justifications and downgrades them to missing', () => {
      const skillsData = {
        skills: [],
        requirementMatches: [
          {
            requirement: 'Terraform IaC',
            type: 'required',
            status: 'partial',
            evidence: null,
            reasoning: 'Candidate has cloud fundamentals and this is easy to learn.'
          }
        ]
      };

      const verified = verifyEvidenceGrounding(skillsData, fakeProfile, rawResumeText);
      const match = verified.requirementMatches[0];

      expect(match.status).toBe('missing');
      expect(match.reasoning).toContain("Downgraded: 'easy to learn' is not valid evidence");
    });
  });

  // 6. Markdown & HTML Escaping
  describe('Report Assembler Escaping & Sanitization', () => {
    it('escapes dangerous HTML tags like <script> in escapeMarkdownAndHtml', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = escapeMarkdownAndHtml(input);
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('escapes Markdown table delimiter | and link brackets [ ] in escapeMarkdownAndHtml', () => {
      const input = 'Column 1 | Column 2 [click me](http://evil.com)';
      const sanitized = escapeMarkdownAndHtml(input);
      expect(sanitized).toContain('\\|');
      expect(sanitized).toContain('\\[');
      expect(sanitized).toContain('\\]');
    });

    it('generateMarkdownReport sanitizes candidate malicious payload', () => {
      const maliciousReport = assembleFinalReport({
        parser: {
          name: '<script>alert("hacked")</script>',
          summary: 'Candidate bio with | injected table column | and [fake link](http://phish.com)'
        },
        skills: {
          skills: [],
          jobRequirements: { required: [], preferred: [], experienceLevel: null },
          requirementMatches: []
        },
        scoring: {
          totalScore: 70,
          breakdown: [
            {
              component: 'Experience <img src=x onerror=alert(1)>',
              weight: 20,
              earned: 15,
              explanation: 'Valid experience | hacked cell'
            }
          ],
          scoreExplanation: 'Score explanation with <iframe src="evil.com"></iframe>'
        },
        questions: { technical: [], projectBased: [], behavioral: [], gapProbing: [] },
        recommendation: {
          recommendation: 'Maybe',
          confidence: 'medium',
          reasoning: 'Reasoning with <b onmouseover=alert(1)>bold</b>',
          keyRisks: [],
          suggestedNextSteps: [],
          disclaimer: 'Standard disclaimer'
        }
      }, [
        {
          key: 'parser',
          name: 'Resume Parser',
          status: 'success',
          provider: 'mock',
          model: 'mock-deterministic',
          durationMs: 120
        }
      ]);

      const markdown = generateMarkdownReport(maliciousReport);

      expect(markdown).not.toContain('<script>');
      expect(markdown).toContain('&lt;script&gt;');
      expect(markdown).not.toContain('<img src=x');
      expect(markdown).toContain('&lt;img src=x');
      expect(markdown).not.toContain('<iframe');
      expect(markdown).toContain('&lt;iframe');
      expect(markdown).toContain('**Execution Mode:** **MOCK** (`mock-deterministic`)');
    });
  });

  // 7. Production Readiness & Cost Protection Suite
  describe('Production Readiness & Cost Protection Suite', () => {
    it('enforces MAX_RUNS_PER_DAY cap with 429 and clear message', () => {
      const originalMax = process.env.MAX_RUNS_PER_DAY;
      process.env.MAX_RUNS_PER_DAY = '3';

      recordDemoRun('192.168.1.1');
      recordDemoRun('192.168.1.2');
      recordDemoRun('192.168.1.3');

      expect(() => checkDemoRateLimits('192.168.1.4')).toThrowError(
        'Demo analysis limit reached for today. Please try again tomorrow or run locally in mock mode.'
      );

      process.env.MAX_RUNS_PER_DAY = originalMax;
    });

    it('enforces per-IP rate limit of 2 runs per hour with separate counters and shared IP limits', () => {
      const originalMax = process.env.MAX_RUNS_PER_DAY;
      process.env.MAX_RUNS_PER_DAY = '100';

      try {
        // IP A makes 1 request (allowed)
        recordDemoRun('10.0.0.1');
        expect(() => checkDemoRateLimits('10.0.0.1')).not.toThrow();

        // IP B makes 2 requests (allowed)
        recordDemoRun('10.0.0.2');
        recordDemoRun('10.0.0.2');

        // IP B makes 3rd request (blocked: reached per-IP limit of 2)
        expect(() => checkDemoRateLimits('10.0.0.2')).toThrowError(
          'Rate limit exceeded: maximum 2 runs per hour per IP. Please try again later.'
        );

        // IP A is unaffected by IP B's requests (separate counter)
        // IP A makes 2nd request (allowed)
        recordDemoRun('10.0.0.1');
        // IP A makes 3rd request (blocked: reached its own per-IP limit of 2)
        expect(() => checkDemoRateLimits('10.0.0.1')).toThrowError(
          'Rate limit exceeded: maximum 2 runs per hour per IP. Please try again later.'
        );

        // IP C has a fresh counter and is allowed
        expect(() => checkDemoRateLimits('10.0.0.3')).not.toThrow();
      } finally {
        process.env.MAX_RUNS_PER_DAY = originalMax;
      }
    });

    it('proves Render single-hop proxy configuration resolves real client IP and prevents spoofing', async () => {
      // In production on Render, app.set('trust proxy', 1) trusts exactly 1 proxy hop.
      // Render's edge proxy terminates TLS and appends the connecting client IP to the end of X-Forwarded-For.
      // Express with trust proxy = 1 takes the last entry in X-Forwarded-For, preventing spoofed prepended IPs.
      const proxyApp = (await import('express')).default();
      proxyApp.set('trust proxy', 1);

      let capturedIp = null;
      proxyApp.get('/test-proxy-ip', (req, res) => {
        capturedIp = req.ip;
        res.json({ ip: req.ip });
      });

      const server = proxyApp.listen(0);
      const port = server.address().port;

      try {
        // Attacker attempts to spoof their IP by sending X-Forwarded-For: 198.51.100.99 (spoofed)
        // Render's proxy appends the real connecting IP: 203.0.113.42
        const res = await fetch(`http://127.0.0.1:${port}/test-proxy-ip`, {
          headers: {
            'X-Forwarded-For': '198.51.100.99, 203.0.113.42'
          }
        });

        expect(res.status).toBe(200);
        // req.ip MUST be the real client IP (203.0.113.42) and NOT the spoofed IP (198.51.100.99)
        expect(capturedIp).toBe('203.0.113.42');
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });

    it('exercises real Express app /api/runs with per-IP rate limiting and proxy headers', async () => {
      const originalLimit = process.env.ENABLE_DEMO_RATE_LIMIT;
      const originalMax = process.env.MAX_RUNS_PER_DAY;

      process.env.ENABLE_DEMO_RATE_LIMIT = 'true';
      process.env.MAX_RUNS_PER_DAY = '100';
      resetDemoRateLimits();

      // Configure trust proxy on real app to match Render production behavior
      app.set('trust proxy', 1);

      const server = app.listen(0);
      const port = server.address().port;

      const validPayload = {
        candidateId: 'test_candidate_id_123',
        jobDescription: 'Software Engineer with experience in JavaScript, Node.js and React.'
      };

      try {
        // Record 2 prior runs for IP 203.0.113.10
        recordDemoRun('203.0.113.10');
        recordDemoRun('203.0.113.10');

        // IP 203.0.113.10 makes 3rd request to real app -> blocked by real createRun controller with HTTP 429
        const resBlocked = await fetch(`http://127.0.0.1:${port}/api/runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '203.0.113.10'
          },
          body: JSON.stringify(validPayload)
        });
        expect(resBlocked.status).toBe(429);
        const dataBlocked = await resBlocked.json();
        expect(dataBlocked.error.code).toBe('DEMO_IP_LIMIT_REACHED');

        // Attacker attempts to spoof by prepending a fake IP in X-Forwarded-For: '198.51.100.99, 203.0.113.10'
        // Real app with trust proxy = 1 still resolves req.ip to 203.0.113.10 and blocks with HTTP 429
        const resSpoof = await fetch(`http://127.0.0.1:${port}/api/runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '198.51.100.99, 203.0.113.10'
          },
          body: JSON.stringify(validPayload)
        });
        expect(resSpoof.status).toBe(429);
        const dataSpoof = await resSpoof.json();
        expect(dataSpoof.error.code).toBe('DEMO_IP_LIMIT_REACHED');

        // A different IP (203.0.113.20) has zero prior runs and is NOT blocked by rate limiting (reaches 404 candidate lookup)
        const resDiff = await fetch(`http://127.0.0.1:${port}/api/runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '203.0.113.20'
          },
          body: JSON.stringify(validPayload)
        });
        expect(resDiff.status).not.toBe(429);
        expect(resDiff.status).toBe(404);
      } finally {
        app.set('trust proxy', false);
        await new Promise(resolve => server.close(resolve));
        process.env.ENABLE_DEMO_RATE_LIMIT = originalLimit;
        process.env.MAX_RUNS_PER_DAY = originalMax;
        resetDemoRateLimits();
      }
    });

    it('proves non-production mode does not trust X-Forwarded-For without trust proxy', async () => {
      const standardApp = (await import('express')).default();
      // By default trust proxy is false (disabled)

      let capturedIp = null;
      standardApp.get('/test-standard-ip', (req, res) => {
        capturedIp = req.ip;
        res.json({ ip: req.ip });
      });

      const server = standardApp.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/test-standard-ip`, {
          headers: {
            'X-Forwarded-For': '198.51.100.99'
          }
        });

        expect(res.status).toBe(200);
        // req.ip should be loopback (127.0.0.1 or ::1), completely ignoring X-Forwarded-For
        expect(capturedIp).not.toBe('198.51.100.99');
        expect(['127.0.0.1', '::1', '::ffff:127.0.0.1']).toContain(capturedIp);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });

    it('validates CORS with comma-separated CLIENT_ORIGIN', async () => {
      const originalOrigin = process.env.CLIENT_ORIGIN;
      process.env.CLIENT_ORIGIN = 'https://talentflow-ai.vercel.app, http://localhost:5173';

      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
          headers: { Origin: 'https://talentflow-ai.vercel.app' }
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('access-control-allow-origin')).toBe('https://talentflow-ai.vercel.app');
      } finally {
        await new Promise(resolve => server.close(resolve));
        process.env.CLIENT_ORIGIN = originalOrigin;
      }
    });

    it('fails fast in production if MONGODB_URI is not provided', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalUri = process.env.MONGODB_URI;

      process.env.NODE_ENV = 'production';
      delete process.env.MONGODB_URI;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await connectDB();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('MONGODB_URI environment variable is required in production')
      );

      process.env.NODE_ENV = originalEnv;
      process.env.MONGODB_URI = originalUri;
    });
  });
});

