import OpenAI from 'openai';
import {
  getMockResumeParserResponse,
  getMockSkillsAnalysisResponse,
  getMockScoringExplanation,
  getMockInterviewQuestions,
  getMockRecommendation
} from './mockResponses.js';

export class LLMProviderError extends Error {
  constructor({ provider, status = 500, retryAfterSeconds = null, message, cause = null }) {
    super(message);
    this.name = 'LLMProviderError';
    this.provider = provider;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.cause = cause;
  }
}

/**
 * Extracts retryDelay in seconds from error objects, headers, messages, or payload strings.
 */
export function extractRetryDelaySeconds(err) {
  if (!err) return null;

  // Direct header inspection if available on OpenAI error response
  if (err.headers && typeof err.headers.get === 'function') {
    const headerVal = err.headers.get('retry-after');
    if (headerVal) {
      const parsed = parseInt(headerVal, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }

  const str = `${err.message || ''} ${JSON.stringify(err.errorDetails || '')} ${JSON.stringify(err)}`;

  // 1. Check for standard HTTP header "retry-after: 30"
  const matchHeader = str.match(/retry-after:\s*(\d+)/i);
  if (matchHeader) {
    return parseInt(matchHeader[1], 10);
  }

  // 2. Check for "retryDelay": "35386s"
  const matchDelay = str.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
  if (matchDelay) {
    return parseInt(matchDelay[1], 10);
  }

  // 3. Check for "Please retry in 9h49m46s"
  const matchHms = str.match(/Please retry in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
  if (matchHms && (matchHms[1] || matchHms[2] || matchHms[3])) {
    const hours = parseInt(matchHms[1] || '0', 10);
    const mins = parseInt(matchHms[2] || '0', 10);
    const secs = parseFloat(matchHms[3] || '0');
    return Math.ceil(hours * 3600 + mins * 60 + secs);
  }

  return null;
}

class LLMService {
  constructor() {
    this._openai = null;
    this._cachedApiKey = null;
    this.lastMetadata = null;
    this.lastProviderStatus = null;
  }

  get provider() {
    if (process.env.LLM_MOCK === 'true') return 'mock';
    if (process.env.LLM_PROVIDER) {
      return process.env.LLM_PROVIDER.trim().toLowerCase();
    }
    if (this.apiKey) return 'openai';
    return 'mock';
  }

  get apiKey() {
    return (process.env.OPENAI_API_KEY || '').trim();
  }

  get modelName() {
    if (this.provider === 'ollama') {
      return (process.env.OLLAMA_MODEL || 'llama3.2').trim();
    }
    if (this.provider === 'mock') {
      return 'mock-deterministic';
    }
    return (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  }

  get ollamaBaseUrl() {
    return (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim().replace(/\/+$/, '');
  }

  get isMock() {
    return this.provider === 'mock';
  }

  get allowMockFallback() {
    return process.env.LLM_ALLOW_MOCK_FALLBACK === 'true';
  }

  isMockMode() {
    return this.isMock;
  }

  getLastMetadata() {
    return this.lastMetadata;
  }

  getOpenAI() {
    if (!this._openai || this._cachedApiKey !== this.apiKey) {
      if (this.apiKey) {
        this._openai = new OpenAI({ apiKey: this.apiKey });
        this._cachedApiKey = this.apiKey;
      }
    }
    return this._openai;
  }

  /**
   * Generates structured JSON from the configured provider (openai | ollama | mock).
   *
   * @param {Object} options
   * @param {string} options.agentName - Identifier for calling agent
   * @param {string} options.systemPrompt - System instructions
   * @param {string} options.userPrompt - User prompt
   * @param {number} [options.temperature=0.1] - Sampling temperature
   * @param {Object} [options.context={}] - Context for mock generators / fallbacks
   * @returns {Promise<Object>} Parsed JSON
   */
  async generateStructuredJSON({
    agentName,
    systemPrompt,
    userPrompt,
    temperature = 0.1,
    context = {}
  }) {
    // 1. Pure Mock Mode
    if (this.isMock) {
      console.log(`[LLM Service] [Mock Mode] Generating dynamic response for ${agentName}`);
      this.lastMetadata = {
        provider: 'mock',
        model: 'mock-deterministic',
        fallbackUsed: false
      };
      this.lastProviderStatus = {
        provider: 'mock',
        status: 'ok',
        lastUsedAt: new Date().toISOString()
      };
      await new Promise((r) => setTimeout(r, 600));
      return this._generateMockResponse(agentName, context);
    }

    // 2. Ollama Provider
    if (this.provider === 'ollama') {
      try {
        const parsedJson = await this._callOllamaWithRetry({
          agentName,
          systemPrompt,
          userPrompt,
          temperature
        });
        this.lastMetadata = {
          provider: 'ollama',
          model: this.modelName,
          fallbackUsed: false
        };
        this.lastProviderStatus = {
          provider: 'ollama',
          status: 'ok',
          lastUsedAt: new Date().toISOString()
        };
        return parsedJson;
      } catch (err) {
        this.lastProviderStatus = {
          provider: 'ollama',
          status: 'error',
          lastError: err.message,
          lastUsedAt: new Date().toISOString()
        };
        if (this.allowMockFallback) {
          console.warn(`[LLM Service] [Fallback Engaged] Ollama failed (${err.message}). Falling back to mock generator.`);
          this.lastMetadata = {
            provider: 'mock',
            model: 'mock-deterministic',
            fallbackUsed: true
          };
          return this._generateMockResponse(agentName, context);
        }
        throw err;
      }
    }

    // 3. OpenAI Provider
    try {
      const parsedJson = await this._callOpenAIWithRetry({
        agentName,
        systemPrompt,
        userPrompt,
        temperature
      });
      this.lastMetadata = {
        provider: 'openai',
        model: this.modelName,
        fallbackUsed: false
      };
      this.lastProviderStatus = {
        provider: 'openai',
        status: 'ok',
        lastUsedAt: new Date().toISOString()
      };
      return parsedJson;
    } catch (err) {
      this.lastProviderStatus = {
        provider: 'openai',
        status: 'error',
        lastError: err.message,
        lastUsedAt: new Date().toISOString()
      };
      if (this.allowMockFallback) {
        console.warn(`[LLM Service] [Fallback Engaged] Live OpenAI call failed (${err.message}). Falling back to mock generator.`);
        this.lastMetadata = {
          provider: 'mock',
          model: 'mock-deterministic',
          fallbackUsed: true
        };
        return this._generateMockResponse(agentName, context);
      }
      throw err;
    }
  }

  async _callOpenAIWithRetry({ agentName, systemPrompt, userPrompt, temperature }) {
    const openai = this.getOpenAI();
    if (!openai) {
      throw new LLMProviderError({
        provider: 'openai',
        status: 401,
        message: 'No OPENAI_API_KEY configured for live OpenAI calls.'
      });
    }

    console.log(`[LLM Service] [Live OpenAI] Calling model "${this.modelName}" for agent "${agentName}"...`);

    let attempt = 0;
    const maxAttempts = 3; // Initial + up to 2 retries for 500/503 / timeouts

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const completion = await openai.chat.completions.create(
          {
            model: this.modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature
          },
          { timeout: 60000 }
        );

        let content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new LLMProviderError({
            provider: 'openai',
            status: 422,
            message: `OpenAI returned empty message content for agent "${agentName}"`
          });
        }

        if (content.startsWith('```')) {
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        try {
          return JSON.parse(content);
        } catch (jsonErr) {
          throw new LLMProviderError({
            provider: 'openai',
            status: 422,
            message: `OpenAI returned invalid JSON for agent "${agentName}": ${jsonErr.message}`,
            cause: jsonErr
          });
        }
      } catch (err) {
        if (err instanceof LLMProviderError) throw err;

        const status = err.status || err.statusCode || 500;
        const isRateLimit = status === 429 || (err.message && err.message.includes('429'));
        const isQuotaExceeded =
          err.code === 'insufficient_quota' ||
          (err.message && /quota|insufficient_quota|exceeded your current quota/i.test(err.message) && isRateLimit);
        const retryDelaySecs = extractRetryDelaySeconds(err);

        // 429 Rate Limit Handling
        if (isRateLimit) {
          // If quota is exhausted or retry delay is over 60 seconds, FAIL FAST with no retries!
          if (isQuotaExceeded || (retryDelaySecs && retryDelaySecs > 60)) {
            const delay = retryDelaySecs || 3600;
            const hours = Math.round(delay / 3600);
            const timeDesc = hours > 0 ? `~${hours}h` : `${Math.round(delay / 60)}m`;
            throw new LLMProviderError({
              provider: 'openai',
              status: 429,
              retryAfterSeconds: delay,
              message: `OpenAI quota limit reached (${err.message || 'insufficient_quota'}). Please check your OpenAI account and billing details. Retry after ${timeDesc}.`,
              cause: err
            });
          }

          // Short-term rate limit (<= 60s): retry once if attempts remaining
          if (attempt < maxAttempts) {
            const waitMs = (retryDelaySecs || 3) * 1000;
            console.warn(`[LLM Service] Short rate limit on ${agentName}, waiting ${waitMs / 1000}s before retry...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          throw new LLMProviderError({
            provider: 'openai',
            status: 429,
            retryAfterSeconds: retryDelaySecs,
            message: `OpenAI rate limit exceeded for agent "${agentName}": ${err.message}`,
            cause: err
          });
        }

        const is500or503 = status === 500 || status === 503 || (err.message && (err.message.includes('500') || err.message.includes('503')));
        const isTimeout = (err.message && err.message.includes('timed out')) || err.name === 'APIConnectionTimeoutError';

        // Retry 500/503 and timeouts at most 2 times with exponential backoff and jitter
        if ((is500or503 || isTimeout) && attempt < maxAttempts) {
          const backoffMs = Math.min(10000, Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500));
          console.warn(`[LLM Service] Transient ${is500or503 ? '500/503' : 'timeout'} on ${agentName} (attempt ${attempt}), retrying in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        // Fatal error or exhausted retries
        throw new LLMProviderError({
          provider: 'openai',
          status,
          retryAfterSeconds: retryDelaySecs,
          message: `OpenAI call failed for agent "${agentName}": ${err.message}`,
          cause: err
        });
      }
    }
  }

  async _callOllamaWithRetry({ agentName, systemPrompt, userPrompt, temperature }) {
    console.log(`[LLM Service] [Ollama] Calling model "${this.modelName}" at "${this.ollamaBaseUrl}" for agent "${agentName}"...`);

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            format: 'json',
            stream: false,
            options: { temperature }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const is503 = res.status === 503;
          if (is503 && attempt < maxAttempts) {
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }

          throw new LLMProviderError({
            provider: 'ollama',
            status: res.status,
            message: `Ollama HTTP ${res.status} error for agent "${agentName}": ${errText}`
          });
        }

        const data = await res.json();
        const content = data.message?.content?.trim();
        if (!content) {
          throw new LLMProviderError({
            provider: 'ollama',
            status: 422,
            message: `Ollama returned empty message content for agent "${agentName}"`
          });
        }

        let cleanText = content;
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        return JSON.parse(cleanText);
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('timed out'));

        if (isTimeout && attempt < maxAttempts) {
          const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[LLM Service] Ollama timeout on ${agentName} (attempt ${attempt}), retrying in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        if (err instanceof LLMProviderError) throw err;

        throw new LLMProviderError({
          provider: 'ollama',
          status: isTimeout ? 408 : 503,
          message: `Failed to communicate with Ollama at ${this.ollamaBaseUrl} for agent "${agentName}": ${err.message}`,
          cause: err
        });
      }
    }
  }

  _generateMockResponse(agentName, context = {}) {
    switch (agentName) {
      case 'resumeParser':
        return getMockResumeParserResponse(context.rawText || '');
      case 'skillsAnalysis':
        return getMockSkillsAnalysisResponse(context.profile, context.jobDescription);
      case 'scoring':
        return getMockScoringExplanation(context.breakdown, context.profile);
      case 'interviewQuestions':
        return getMockInterviewQuestions(
          context.profile,
          context.skillsAnalysis,
          context.strengths,
          context.gaps
        );
      case 'recommendation':
        return getMockRecommendation(
          context.totalScore,
          context.skillsAnalysis,
          context.interviewQuestions,
          context.profile
        );
      default:
        return {};
    }
  }
}

export const llmService = new LLMService();
export default llmService;
