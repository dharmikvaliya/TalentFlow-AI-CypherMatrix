import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let runtimeProviderOverride = null;
let runtimeModelOverride = null;

export function syncEnvWithDisk() {
  if (runtimeProviderOverride) return;
  try {
    const rootEnv = path.resolve(__dirname, '../../../.env');
    const serverEnv = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(rootEnv)) {
      dotenv.config({ path: rootEnv, override: true });
    }
    if (fs.existsSync(serverEnv)) {
      dotenv.config({ path: serverEnv, override: true });
    }
  } catch {}
}

export function setActiveProvider(providerName, modelName = null, persist = true) {
  if (providerName) {
    const raw = providerName.trim().toLowerCase();
    const normalized = raw === 'nvidia-nim' ? 'nvidia' : raw;
    if (!ALLOWED_PROVIDERS.includes(normalized)) {
      throw new Error(`Unsupported LLM provider "${providerName}". Allowed providers: ${ALLOWED_PROVIDERS.join(', ')}`);
    }
    runtimeProviderOverride = normalized;
    process.env.LLM_PROVIDER = normalized;
    if (normalized === 'mock') {
      process.env.LLM_MOCK = 'true';
    } else {
      process.env.LLM_MOCK = 'false';
    }
    runtimeModelOverride = modelName ? modelName.trim() : null;

    if (persist) {
      persistActiveProviderToDisk(normalized, runtimeModelOverride);
    }
  }
}

export function resetRuntimeProviderOverride() {
  runtimeProviderOverride = null;
  runtimeModelOverride = null;
}

export function persistActiveProviderToDisk(provider, model = null) {
  try {
    const rootEnvPath = path.resolve(__dirname, '../../../.env');
    const serverEnvPath = path.resolve(__dirname, '../../.env');
    [rootEnvPath, serverEnvPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/^LLM_PROVIDER=.*$/m, `LLM_PROVIDER=${provider}`);
        if (provider === 'mock') {
          content = content.replace(/^LLM_MOCK=.*$/m, 'LLM_MOCK=true');
        } else {
          content = content.replace(/^LLM_MOCK=.*$/m, 'LLM_MOCK=false');
        }
        if (model) {
          const def = PROVIDER_REGISTRY[provider];
          if (def && def.modelEnv) {
            const regex = new RegExp(`^${def.modelEnv}=.*$`, 'm');
            if (regex.test(content)) {
              content = content.replace(regex, `${def.modelEnv}=${model}`);
            }
          }
        }
        fs.writeFileSync(filePath, content, 'utf8');
      }
    });
  } catch (err) {
    console.warn('[Provider Config] Could not persist provider to disk:', err.message);
  }
}

/**
 * AI Provider Configuration Matrix for TalentFlow AI
 *
 * Configures OpenAI, OpenRouter, Groq, NVIDIA NIM, Ollama, and Mock.
 * All live cloud providers utilize OpenAI-compatible REST endpoints.
 */

export const PROVIDER_REGISTRY = {
  openai: {
    name: 'OpenAI',
    protocol: 'openai-compatible',
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4.1-mini',
    supportsStructuredOutput: true,
    documentationUrl: 'https://platform.openai.com/docs/api-reference'
  },
  openrouter: {
    name: 'OpenRouter',
    protocol: 'openai-compatible',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    supportsStructuredOutput: true,
    documentationUrl: 'https://openrouter.ai/docs'
  },
  groq: {
    name: 'Groq',
    protocol: 'openai-compatible',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    supportsStructuredOutput: true,
    documentationUrl: 'https://console.groq.com/docs'
  },
  nvidia: {
    name: 'NVIDIA NIM',
    protocol: 'openai-compatible',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    baseUrlEnv: 'NVIDIA_BASE_URL',
    apiKeyEnv: 'NVIDIA_API_KEY',
    modelEnv: 'NVIDIA_MODEL',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    supportsStructuredOutput: true,
    documentationUrl: 'https://build.nvidia.com'
  },
  ollama: {
    name: 'Ollama',
    protocol: 'ollama-native',
    baseURL: 'http://localhost:11434',
    baseUrlEnv: 'OLLAMA_BASE_URL',
    apiKeyEnv: null,
    modelEnv: 'OLLAMA_MODEL',
    defaultModel: 'llama3.2',
    supportsStructuredOutput: true,
    documentationUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md'
  },
  mock: {
    name: 'Mock Deterministic',
    protocol: 'mock',
    baseURL: null,
    apiKeyEnv: null,
    modelEnv: null,
    defaultModel: 'mock-deterministic',
    supportsStructuredOutput: true,
    documentationUrl: null
  }
};

export const ALLOWED_PROVIDERS = Object.keys(PROVIDER_REGISTRY);

/**
 * Resolves active provider name from environment flags.
 */
export function getActiveProviderName() {
  if (runtimeProviderOverride) {
    return runtimeProviderOverride;
  }
  if (process.env.LLM_MOCK === 'true') return 'mock';
  if (process.env.LLM_PROVIDER) {
    const raw = process.env.LLM_PROVIDER.trim().toLowerCase();
    // Support aliases: 'nvidia-nim' -> 'nvidia'
    if (raw === 'nvidia-nim') return 'nvidia';
    return raw;
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return 'openai';
  }
  return 'mock';
}

/**
 * Resolves full active configuration for the specified or environment-selected provider.
 * Redacts secret keys in public safe metadata.
 */
export function resolveProviderConfig(requestedProvider = null, modelOverride = null) {
  const providerKey = (requestedProvider || getActiveProviderName()).trim().toLowerCase();
  const normalizedKey = providerKey === 'nvidia-nim' ? 'nvidia' : providerKey;

  const definition = PROVIDER_REGISTRY[normalizedKey];
  if (!definition) {
    throw new Error(
      `Unsupported LLM provider "${providerKey}". Allowed providers: ${ALLOWED_PROVIDERS.join(', ')}`
    );
  }

  // Determine model
  let model = modelOverride || runtimeModelOverride || definition.defaultModel;
  if (!modelOverride && !runtimeModelOverride && definition.modelEnv && process.env[definition.modelEnv]) {
    model = process.env[definition.modelEnv].trim();
  }
  if (!modelOverride && !runtimeModelOverride && process.env.LLM_MODEL && process.env.LLM_MODEL.trim()) {
    model = process.env.LLM_MODEL.trim();
  }

  // Determine base URL
  let baseURL = definition.baseURL;
  if (definition.baseUrlEnv && process.env[definition.baseUrlEnv]) {
    baseURL = process.env[definition.baseUrlEnv].trim().replace(/\/+$/, '');
  }
  if (process.env.LLM_BASE_URL && process.env.LLM_BASE_URL.trim()) {
    baseURL = process.env.LLM_BASE_URL.trim().replace(/\/+$/, '');
  }

  // Determine API key
  let apiKey = '';
  if (definition.apiKeyEnv && process.env[definition.apiKeyEnv]) {
    apiKey = process.env[definition.apiKeyEnv].trim();
  }

  // Additional provider headers (without exposing secrets)
  const defaultHeaders = {};
  if (normalizedKey === 'openrouter') {
    defaultHeaders['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:5173';
    defaultHeaders['X-Title'] = process.env.OPENROUTER_APP_TITLE || 'TalentFlow AI';
  }

  return {
    provider: normalizedKey,
    name: definition.name,
    protocol: definition.protocol,
    baseURL,
    apiKey,
    apiKeyEnv: definition.apiKeyEnv,
    model,
    supportsStructuredOutput: definition.supportsStructuredOutput,
    defaultHeaders,
    isMock: normalizedKey === 'mock',
    hasApiKey: Boolean(apiKey)
  };
}
