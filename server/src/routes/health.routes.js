import { Router } from 'express';
import mongoose from 'mongoose';
import { llmService } from '../services/llm.service.js';
import {
  getActiveProviderName,
  setActiveProvider,
  resolveProviderConfig,
  syncEnvWithDisk
} from '../config/llmProviders.js';

const router = Router();

router.get('/health', (req, res) => {
  syncEnvWithDisk();
  const isDbConnected = mongoose.connection.readyState === 1;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TalentFlow AI API',
    version: '1.0.0',
    environment: {
      nodeVersion: process.version,
      llmMockMode: llmService.isMock,
      configuredProvider: llmService.provider,
      modelConfigured: llmService.modelName,
      allowMockFallback: llmService.allowMockFallback,
      lastProviderStatus: llmService.lastProviderStatus || {
        provider: llmService.provider,
        status: 'initialized',
        lastUsedAt: null
      },
      database: isDbConnected ? 'connected' : 'disconnected',
      databaseName: isDbConnected ? (mongoose.connection.name || 'talentflow_cyphermatrix') : null
    }
  });
});

router.get('/providers', (req, res) => {
  const activeProvider = getActiveProviderName();

  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      badge: 'High Accuracy',
      hasKey: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
      defaultModel: 'gpt-4.1-mini',
      models: [
        'gpt-4.1-mini',
        'gpt-4o-mini',
        'gpt-4o'
      ]
    },
    {
      id: 'groq',
      name: 'Groq',
      badge: 'Ultra Fast (~300 tok/s)',
      hasKey: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
      defaultModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      models: [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.8-27b',
        'llama-3.3-70b-versatile'
      ]
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      badge: '12 Free Models / 200+ Total',
      hasKey: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()),
      defaultModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
      models: [
        'openrouter/free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'google/gemma-4-31b-it:free',
        'meta-llama/llama-3.3-70b-instruct'
      ]
    },
    {
      id: 'nvidia',
      name: 'NVIDIA NIM',
      badge: 'Enterprise Privacy (84 Models)',
      hasKey: Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim()),
      defaultModel: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      models: [
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        'qwen/qwen2.5-coder-32b-instruct',
        'nvidia/llama-3.1-nemotron-70b-instruct',
        'mistralai/mistral-7b-instruct-v0.3'
      ]
    },
    {
      id: 'ollama',
      name: 'Ollama',
      badge: '100% Local / Free',
      hasKey: true,
      defaultModel: process.env.OLLAMA_MODEL || 'llama3:latest',
      models: [
        'llama3:latest',
        'llama3.2',
        'mistral',
        'phi3'
      ]
    },
    {
      id: 'mock',
      name: 'Mock Engine',
      badge: '100% Offline / Fast Test',
      hasKey: true,
      defaultModel: 'mock-deterministic',
      models: [
        'mock-deterministic'
      ]
    }
  ];

  res.json({
    activeProvider,
    providers
  });
});

router.post('/providers/active', (req, res) => {
  const { provider, model } = req.body;
  if (!provider) {
    return res.status(400).json({ error: { message: 'Provider name is required' } });
  }
  try {
    setActiveProvider(provider, model);
    const cfg = resolveProviderConfig();
    res.json({
      success: true,
      activeProvider: cfg.provider,
      modelConfigured: cfg.model,
      llmMockMode: cfg.isMock
    });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

export default router;
