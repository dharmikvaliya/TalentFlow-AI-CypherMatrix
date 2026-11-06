import OpenAI from 'openai';
import {
  getMockResumeParserResponse,
  getMockSkillsAnalysisResponse,
  getMockScoringExplanation,
  getMockInterviewQuestions,
  getMockRecommendation
} from './mockResponses.js';
import {
  resolveProviderConfig,
  getActiveProviderName,
  PROVIDER_REGISTRY,
  ALLOWED_PROVIDERS
} from '../config/llmProviders.js';
import { redactCandidatePII } from './piiRedaction.service.js';

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
 * Redacts any detected API key patterns from error messages or logs.
 */
export function redactSecretPatterns(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, '[REDACTED_API_KEY]')
    .replace(/gsk_[a-zA-Z0-9_-]{10,}/g, '[REDACTED_API_KEY]')
    .replace(/nvapi-[a-zA-Z0-9_-]{10,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]{20,}/gi, 'Bearer [REDACTED_TOKEN]');
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

/**
 * Repairs truncated or malformed JSON (common with free-tier / small LLMs hitting token limits).
 */
export function repairTruncatedJSON(str) {
  if (typeof str !== 'string' || !str.trim()) return null;
  let text = str.trim();

  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch {}

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const startIdx = (firstBrace === -1)
    ? firstBracket
    : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));

  if (startIdx === -1) return null;
  text = text.substring(startIdx);

  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' && stack.length > 0 && stack[stack.length - 1] === '{') {
        stack.pop();
      } else if (ch === ']' && stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  let repaired = text;
  if (inString) {
    repaired += '"';
  }

  repaired = repaired.replace(/,\s*([\}\]])/g, '$1');
  repaired = repaired.replace(/,\s*$/, '');

  while (stack.length > 0) {
    const openChar = stack.pop();
    repaired += openChar === '{' ? '}' : ']';
  }

  try {
    return JSON.parse(repaired);
  } catch {
    const lastComma = text.lastIndexOf(',');
    if (lastComma > 0) {
      let trimmed = text.substring(0, lastComma);
      const restack = [];
      let trimInString = false;
      let trimEscaped = false;

      for (let i = 0; i < trimmed.length; i++) {
        const c = trimmed[i];
        if (trimInString) {
          if (trimEscaped) trimEscaped = false;
          else if (c === '\\') trimEscaped = true;
          else if (c === '"') trimInString = false;
        } else {
          if (c === '"') trimInString = true;
          else if (c === '{' || c === '[') restack.push(c);
          else if (c === '}' && restack[restack.length - 1] === '{') restack.pop();
          else if (c === ']' && restack[restack.length - 1] === '[') restack.pop();
        }
      }

      if (trimInString) trimmed += '"';
      trimmed = trimmed.replace(/,\s*$/, '');
      while (restack.length > 0) {
        trimmed += restack.pop() === '{' ? '}' : ']';
      }

      try {
        return JSON.parse(trimmed);
      } catch {}
    }
    return null;
  }
}

class LLMService {
  constructor() {
    this._clients = new Map();
    this.lastMetadata = null;
    this.lastProviderStatus = null;
    this._lastRepairedTruncation = false;
  }

  get provider() {
    try {
      return resolveProviderConfig().provider;
    } catch {
      return getActiveProviderName();
    }
  }

  get apiKey() {
    try {
      const cfg = resolveProviderConfig();
      return cfg.apiKey;
    } catch {
      return (process.env.OPENAI_API_KEY || '').trim();
    }
  }

  get modelName() {
    try {
      return resolveProviderConfig().model;
    } catch {
      return 'mock-deterministic';
    }
  }

  get ollamaBaseUrl() {
    try {
      return resolveProviderConfig('ollama').baseURL;
    } catch {
      return (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim().replace(/\/+$/, '');
    }
  }

  get isMock() {
    try {
      return resolveProviderConfig().isMock;
    } catch {
      return true;
    }
  }

  get allowMockFallback() {
    // Production strictly prohibits mock fallback
    if (process.env.NODE_ENV === 'production' && process.env.LLM_ALLOW_MOCK_FALLBACK === 'true') {
      throw new Error('Mock fallback is not permitted in production.');
    }
    // Permitted only in explicit non-production demo mode
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.LLM_ALLOW_MOCK_FALLBACK === 'true' &&
      process.env.TALENTFLOW_DEMO_MODE === 'true'
    );
  }

  isMockMode() {
    return this.isMock;
  }

  getLastMetadata() {
    return this.lastMetadata;
  }

  /**
   * Resolves OpenAI SDK client for openai-compatible providers.
   * Caches by provider name, baseURL, and apiKey.
   */
  getOpenAI(providerKey = null) {
    const config = resolveProviderConfig(providerKey || this.provider);
    const cacheKey = `${config.provider}:${config.baseURL}:${config.apiKey}`;

    if (!this._clients.has(cacheKey)) {
      if (config.apiKey) {
        const clientOptions = {
          apiKey: config.apiKey
        };
        if (config.baseURL) {
          clientOptions.baseURL = config.baseURL;
        }
        if (config.defaultHeaders && Object.keys(config.defaultHeaders).length > 0) {
          clientOptions.defaultHeaders = config.defaultHeaders;
        }
        this._clients.set(cacheKey, new OpenAI(clientOptions));
      } else {
        return null;
      }
    }
    return this._clients.get(cacheKey);
  }

  /**
   * Generates structured JSON from the configured provider.
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
    context = {},
    provider = null,
    model = null
  }) {
    this._lastRepairedTruncation = false;
    const config = resolveProviderConfig(provider, model);

    // 1. Pure Mock Mode
    if (config.isMock) {
      console.log(`[LLM Service] [Mock Mode] Generating dynamic response for ${agentName}`);
      this.lastMetadata = {
        provider: 'mock',
        model: 'mock-deterministic',
        fallbackUsed: false,
        repairedTruncation: false,
        rawOutputComplete: true
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
    if (config.provider === 'ollama') {
      try {
        const parsedJson = await this._callOllamaWithRetry({
          config,
          agentName,
          systemPrompt,
          userPrompt,
          temperature
        });
        this.lastMetadata = {
          provider: 'ollama',
          model: config.model,
          fallbackUsed: false,
          repairedTruncation: Boolean(this._lastRepairedTruncation),
          rawOutputComplete: !this._lastRepairedTruncation
        };
        this.lastProviderStatus = {
          provider: 'ollama',
          status: 'ok',
          lastUsedAt: new Date().toISOString()
        };
        return parsedJson;
      } catch (err) {
        const safeErrMsg = redactSecretPatterns(err.message);
        this.lastProviderStatus = {
          provider: 'ollama',
          status: 'error',
          lastError: safeErrMsg,
          lastUsedAt: new Date().toISOString()
        };
        if (this.allowMockFallback) {
          console.warn(`[LLM Service] [Fallback Engaged] Ollama failed (${safeErrMsg}). Falling back to mock generator.`);
          this.lastMetadata = {
            provider: 'mock',
            model: 'mock-deterministic',
            fallbackUsed: true,
            repairedTruncation: false
          };
          return this._generateMockResponse(agentName, context);
        }
        throw err;
      }
    }

    // 3. OpenAI-Compatible Providers (OpenAI, OpenRouter, Groq, NVIDIA NIM)
    try {
      const parsedJson = await this._callOpenAICompatibleWithRetry({
        config,
        agentName,
        systemPrompt,
        userPrompt,
        temperature
      });
      this.lastMetadata = {
        provider: config.provider,
        model: config.model,
        fallbackUsed: false,
        repairedTruncation: Boolean(this._lastRepairedTruncation),
        rawOutputComplete: !this._lastRepairedTruncation
      };
      this.lastProviderStatus = {
        provider: config.provider,
        status: 'ok',
        lastUsedAt: new Date().toISOString()
      };
      return parsedJson;
    } catch (err) {
      const safeErrMsg = redactSecretPatterns(err.message);
      this.lastProviderStatus = {
        provider: config.provider,
        status: 'error',
        lastError: safeErrMsg,
        lastUsedAt: new Date().toISOString()
      };
      if (this.allowMockFallback) {
        console.warn(`[LLM Service] [Fallback Engaged] Live ${config.name} call failed (${safeErrMsg}). Falling back to mock generator.`);
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

  async _callOpenAICompatibleWithRetry({ config, agentName, systemPrompt, userPrompt, temperature }) {
    const client = this.getOpenAI(config.provider);
    if (!client) {
      throw new LLMProviderError({
        provider: config.provider,
        status: 401,
        message: `No ${config.apiKeyEnv} configured for live ${config.name} calls.`
      });
    }

    console.log(`[LLM Service] [Live ${config.name}] Calling model "${config.model}" for agent "${agentName}"...`);

    let attempt = 0;
    const maxAttempts = 3;
    let dropResponseFormat = false;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const safeUserPrompt = redactCandidatePII(userPrompt);
        const payload = {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: safeUserPrompt }
          ],
          temperature,
          max_tokens: 4096
        };

        if (config.supportsStructuredOutput && !dropResponseFormat) {
          payload.response_format = { type: 'json_object' };
        }

        const completion = await client.chat.completions.create(payload, { timeout: 60000 });

        const messageObj = completion.choices?.[0]?.message || {};
        let content = (messageObj.content || '').trim();
        // Fallback to reasoning_content if content is empty (common in reasoning models e.g. Nemotron/DeepSeek)
        if (!content && (messageObj.reasoning_content || messageObj.reasoning)) {
          content = (messageObj.reasoning_content || messageObj.reasoning).trim();
        }

        if (!content) {
          throw new LLMProviderError({
            provider: config.provider,
            status: 422,
            message: `${config.name} returned empty message content for agent "${agentName}"`
          });
        }

        // Strip thinking blocks <think>...</think> if present
        if (content.includes('<think>')) {
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        }

        if (content.startsWith('```')) {
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        try {
          return JSON.parse(content);
        } catch (initialJsonErr) {
          const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch (innerErr) {
              // ignore and try repair below
            }
          }

          // Try automatic repair for truncated JSON outputs (handles token-limited models)
          const repaired = repairTruncatedJSON(content);
          if (repaired && typeof repaired === 'object') {
            this._lastRepairedTruncation = true;
            console.warn(`[LLM Service] [${config.name}] Successfully repaired truncated JSON for agent "${agentName}".`);
            return repaired;
          }

          throw new LLMProviderError({
            provider: config.provider,
            status: 422,
            message: `${config.name} returned invalid JSON for agent "${agentName}": ${initialJsonErr.message}`,
            cause: initialJsonErr
          });
        }
      } catch (err) {
        if (err instanceof LLMProviderError) throw err;

        const safeMessage = redactSecretPatterns(err.message || '');
        const status = err.status || err.statusCode || 500;

        if (
          status === 400 &&
          (/failed to generate json/i.test(safeMessage) ||
           /response_format|json_object|not supported|schema/i.test(safeMessage)) &&
          attempt < maxAttempts
        ) {
          console.warn(`[LLM Service] [${config.name}] Constrained JSON mode failed for agent "${agentName}"; retrying without response_format constraint...`);
          dropResponseFormat = true;
          continue;
        }
        const isRateLimit = status === 429 || safeMessage.includes('429');
        const isQuotaExceeded =
          err.code === 'insufficient_quota' ||
          (/quota|insufficient_quota|exceeded your current quota/i.test(safeMessage) && isRateLimit);
        const retryDelaySecs = extractRetryDelaySeconds(err);

        // 429 Rate Limit Handling
        if (isRateLimit) {
          if (isQuotaExceeded || (retryDelaySecs && retryDelaySecs > 60)) {
            const delay = retryDelaySecs || 3600;
            const hours = Math.round(delay / 3600);
            const timeDesc = hours > 0 ? `~${hours}h` : `${Math.round(delay / 60)}m`;
            throw new LLMProviderError({
              provider: config.provider,
              status: 429,
              retryAfterSeconds: delay,
              message: `${config.name} quota limit reached (${safeMessage || 'insufficient_quota'}). Please check your account and billing details. Retry after ${timeDesc}.`,
              cause: err
            });
          }

          if (attempt < maxAttempts) {
            const waitMs = (retryDelaySecs || 3) * 1000;
            console.warn(`[LLM Service] Short rate limit on ${agentName}, waiting ${waitMs / 1000}s before retry...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          throw new LLMProviderError({
            provider: config.provider,
            status: 429,
            retryAfterSeconds: retryDelaySecs,
            message: `${config.name} rate limit exceeded for agent "${agentName}": ${safeMessage}`,
            cause: err
          });
        }

        const is500or503 = status === 500 || status === 503 || safeMessage.includes('500') || safeMessage.includes('503');
        const isTimeout = safeMessage.includes('timed out') || err.name === 'APIConnectionTimeoutError';

        if ((is500or503 || isTimeout) && attempt < maxAttempts) {
          const backoffMs = Math.min(10000, Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500));
          console.warn(`[LLM Service] Transient ${is500or503 ? '500/503' : 'timeout'} on ${agentName} (attempt ${attempt}), retrying in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        throw new LLMProviderError({
          provider: config.provider,
          status,
          retryAfterSeconds: retryDelaySecs,
          message: `${config.name} call failed for agent "${agentName}": ${safeMessage}`,
          cause: err
        });
      }
    }
  }

  async _callOllamaWithRetry({ config, agentName, systemPrompt, userPrompt, temperature }) {
    const baseUrl = config.baseURL || this.ollamaBaseUrl;
    console.log(`[LLM Service] [Ollama] Calling model "${config.model}" at "${baseUrl}" for agent "${agentName}"...`);

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS || '180000', 10);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
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

        try {
          return JSON.parse(cleanText);
        } catch (ollamaParseErr) {
          const repaired = repairTruncatedJSON(cleanText);
          if (repaired && typeof repaired === 'object') {
            this._lastRepairedTruncation = true;
            console.warn(`[LLM Service] [Ollama] Repaired truncated JSON for agent "${agentName}".`);
            return repaired;
          }
          throw ollamaParseErr;
        }
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
          message: `Failed to communicate with Ollama at ${baseUrl} for agent "${agentName}": ${err.message}`,
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
          context.gaps,
          context.integrityFindings
        );
      case 'recommendation':
        return getMockRecommendation(
          context.totalScore,
          context.skillsAnalysis,
          context.interviewQuestions,
          context.profile,
          context.integritySummary
        );
      default:
        return {};
    }
  }
}

export const llmService = new LLMService();
export default llmService;
