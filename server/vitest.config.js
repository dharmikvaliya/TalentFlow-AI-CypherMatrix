import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15000,
    environment: 'node',
    env: {
      LLM_PROVIDER: 'mock',
      LLM_MOCK: 'true',
      LLM_ALLOW_MOCK_FALLBACK: 'false'
    }
  }
});
