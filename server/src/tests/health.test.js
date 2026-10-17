import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../app.js';

describe('Health API Check', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('GET /api/health returns 200 with status ok and service metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('TalentFlow AI API');
    expect(data.environment).toBeDefined();
    expect(data.environment.nodeVersion).toBeDefined();
  });

  it('GET /api/nonexistent returns 404 with standardized error shape', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
