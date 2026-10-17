import { Router } from 'express';
import mongoose from 'mongoose';
import { llmService } from '../services/llm.service.js';

const router = Router();

router.get('/health', (req, res) => {
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
      database: isDbConnected ? 'connected' : 'disconnected'
    }
  });
});

export default router;
