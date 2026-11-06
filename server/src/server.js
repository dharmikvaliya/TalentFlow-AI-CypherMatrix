import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root and server dirs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { llmService } from './services/llm.service.js';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production' && process.env.LLM_ALLOW_MOCK_FALLBACK === 'true') {
  console.error('[Fatal Configuration Error] Mock fallback is not permitted in production.');
  process.exit(1);
}

async function startServer() {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TalentFlow Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[TalentFlow Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[TalentFlow Server] LLM Mode: ${llmService.isMock ? 'MOCK (offline demo ready)' : `LIVE (${llmService.provider.toUpperCase()} - ${llmService.modelName})`}`);
  });
}

startServer().catch(err => {
  console.error('[TalentFlow Server] Fatal startup error:', err);
  process.exit(1);
});
