import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveProviderConfig,
  getActiveProviderName,
  PROVIDER_REGISTRY,
  ALLOWED_PROVIDERS
} from '../config/llmProviders.js';
import {
  llmService,
  LLMProviderError,
  redactSecretPatterns,
  extractRetryDelaySeconds
} from '../services/llm.service.js';

describe('Task 5: LLM Provider Abstraction & Multi-Provider Architecture Suite', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // 1. Provider Configuration Resolutions
  describe('Provider Configuration Resolution', () => {
    it('1. resolves OpenAI configuration correctly with defaults', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key-12345';

      const config = resolveProviderConfig('openai');
      expect(config.provider).toBe('openai');
      expect(config.baseURL).toBe('https://api.openai.com/v1');
      expect(config.model).toBe('gpt-4.1-mini');
      expect(config.apiKey).toBe('sk-mock-openai-key-12345');
      expect(config.protocol).toBe('openai-compatible');
      expect(config.supportsStructuredOutput).toBe(true);
      expect(config.isMock).toBe(false);
    });

    it('2. resolves OpenRouter configuration correctly with custom headers', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-mock-openrouter-key';
      process.env.OPENROUTER_HTTP_REFERER = 'https://talentflow.example.com';
      process.env.OPENROUTER_APP_TITLE = 'TalentFlow Test';

      const config = resolveProviderConfig('openrouter');
      expect(config.provider).toBe('openrouter');
      expect(config.baseURL).toBe('https://openrouter.ai/api/v1');
      expect(config.model).toBe('meta-llama/llama-3.3-70b-instruct');
      expect(config.apiKey).toBe('sk-or-v1-mock-openrouter-key');
      expect(config.defaultHeaders['HTTP-Referer']).toBe('https://talentflow.example.com');
      expect(config.defaultHeaders['X-Title']).toBe('TalentFlow Test');
    });

    it('3. resolves Groq configuration correctly', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'groq';
      process.env.GROQ_API_KEY = 'gsk_mock_groq_key_9999';

      const config = resolveProviderConfig('groq');
      expect(config.provider).toBe('groq');
      expect(config.baseURL).toBe('https://api.groq.com/openai/v1');
      expect(config.model).toBe('llama-3.3-70b-versatile');
      expect(config.apiKey).toBe('gsk_mock_groq_key_9999');
      expect(config.protocol).toBe('openai-compatible');
    });

    it('4. resolves NVIDIA NIM configuration correctly (and supports nvidia-nim alias)', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'nvidia-nim';
      process.env.NVIDIA_API_KEY = 'nvapi-mock-nvidia-key-7777';

      const config = resolveProviderConfig('nvidia-nim');
      expect(config.provider).toBe('nvidia');
      expect(config.baseURL).toBe('https://integrate.api.nvidia.com/v1');
      expect(config.model).toBe('meta/llama-3.1-70b-instruct');
      expect(config.apiKey).toBe('nvapi-mock-nvidia-key-7777');
    });

    it('5. safely rejects Together AI as unsupported research-only provider', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'together';

      expect(() => resolveProviderConfig('together')).toThrowError(
        /Unsupported LLM provider "together"/
      );
    });

    it('6. resolves Ollama configuration correctly with custom URL', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_PROVIDER = 'ollama';
      process.env.OLLAMA_BASE_URL = 'http://192.168.1.100:11434';
      process.env.OLLAMA_MODEL = 'mistral-nemo';

      const config = resolveProviderConfig('ollama');
      expect(config.provider).toBe('ollama');
      expect(config.baseURL).toBe('http://192.168.1.100:11434');
      expect(config.model).toBe('mistral-nemo');
      expect(config.protocol).toBe('ollama-native');
    });

    it('7. resolves Mock configuration as 100% offline and deterministic', () => {
      process.env.LLM_PROVIDER = 'mock';
      const config = resolveProviderConfig('mock');
      expect(config.provider).toBe('mock');
      expect(config.isMock).toBe(true);
      expect(config.model).toBe('mock-deterministic');
    });
  });

  // 2. Validation & Security Boundaries
  describe('Provider Validation & Security Boundaries', () => {
    it('8. rejects unknown provider with explicit informative error listing allowed providers', () => {
      expect(() => resolveProviderConfig('unsupported-vendor-xyz')).toThrowError(
        /Unsupported LLM provider "unsupported-vendor-xyz"/
      );
    });

    it('9. supports global LLM_MODEL override across all providers', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_MODEL = 'custom-fine-tuned-model';
      const config = resolveProviderConfig('openai');
      expect(config.model).toBe('custom-fine-tuned-model');
    });

    it('10. supports global LLM_BASE_URL override for enterprise proxies', () => {
      delete process.env.LLM_MOCK;
      process.env.LLM_BASE_URL = 'https://ai-proxy.corp.internal/v1';
      const config = resolveProviderConfig('groq');
      expect(config.baseURL).toBe('https://ai-proxy.corp.internal/v1');
    });

    it('11. throws explicit 401 LLMProviderError when API key is missing for live calls', async () => {
      delete process.env.LLM_MOCK;
      delete process.env.GROQ_API_KEY;
      process.env.LLM_PROVIDER = 'groq';
      process.env.LLM_ALLOW_MOCK_FALLBACK = 'false';

      await expect(
        llmService.generateStructuredJSON({
          agentName: 'resumeParser',
          systemPrompt: 'test',
          userPrompt: 'test'
        })
      ).rejects.toThrow(LLMProviderError);
    });

    it('12. redacts sensitive API key patterns from error messages and logs', () => {
      const msgWithOpenAIKey = 'Error calling https://api.openai.com: authorization sk-proj-1234567890abcdef1234 failed';
      expect(redactSecretPatterns(msgWithOpenAIKey)).not.toContain('sk-proj-1234567890abcdef1234');
      expect(redactSecretPatterns(msgWithOpenAIKey)).toContain('[REDACTED_API_KEY]');

      const msgWithGroqKey = 'Groq failed with gsk_abcdef1234567890abcdef';
      expect(redactSecretPatterns(msgWithGroqKey)).toContain('[REDACTED_API_KEY]');

      const msgWithNvidiaKey = 'Nvidia NIM authorization failed with nvapi-abcdef1234567890';
      expect(redactSecretPatterns(msgWithNvidiaKey)).toContain('[REDACTED_API_KEY]');
    });

    it('13. mock mode defaults safely when LLM_MOCK=true regardless of provider setting', () => {
      process.env.LLM_MOCK = 'true';
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-mock-key';

      expect(getActiveProviderName()).toBe('mock');
      expect(llmService.isMock).toBe(true);
    });
  });
});
