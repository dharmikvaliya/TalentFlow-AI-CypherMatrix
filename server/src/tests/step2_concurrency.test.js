import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { memoryCandidates } from '../controllers/candidates.controller.js';

describe('Step 2: Concurrency & Isolation Suite (MOCK MODE)', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise((resolve) => server.close(resolve));
  });

  it('executes 5 simultaneous pipeline runs with complete isolation and zero cross-talk', async () => {
    const candidates = [
      { id: 'cand_conc_1', name: 'Candidate One', stack: 'React, Node.js, Express', jd: 'JD for Role 1: React and Node.js' },
      { id: 'cand_conc_2', name: 'Candidate Two', stack: 'Java, Spring Boot, Kafka', jd: 'JD for Role 2: Java and Kafka' },
      { id: 'cand_conc_3', name: 'Candidate Three', stack: 'Python, PyTorch, LangChain', jd: 'JD for Role 3: Python and AI' },
      { id: 'cand_conc_4', name: 'Candidate Four', stack: 'Go, Kubernetes, Docker', jd: 'JD for Role 4: Go and DevOps' },
      { id: 'cand_conc_5', name: 'Candidate Five', stack: 'TypeScript, Angular, Postgres', jd: 'JD for Role 5: Angular and SQL' }
    ];

    // Seed memory candidates
    candidates.forEach((c) => {
      memoryCandidates.set(c.id, {
        _id: c.id,
        fileName: `${c.name}.pdf`,
        rawText: `${c.name} is a software engineer proficient in ${c.stack}. Experience: 4 years working with modern stacks. Education: B.S. in Computer Science.`,
        pageCount: 1,
        charCount: 200,
        createdAt: new Date().toISOString()
      });
    });

    // 1. Launch 5 concurrent runs simultaneously
    const startPromises = candidates.map(async (c) => {
      const res = await fetch(`${baseUrl}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: c.id,
          jobDescription: c.jd
        })
      });
      const data = await res.json();
      return { candidate: c, runId: data.runId, status: res.status };
    });

    const launchedRuns = await Promise.all(startPromises);

    // Verify all 5 runs launched successfully with distinct IDs
    launchedRuns.forEach(r => {
      expect(r.status).toBe(201);
      expect(r.runId).toBeDefined();
    });

    const uniqueRunIds = new Set(launchedRuns.map(r => r.runId));
    expect(uniqueRunIds.size).toBe(5);

    // 2. Poll until all 5 runs complete
    const pollRunUntilComplete = async (runId) => {
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch(`${baseUrl}/api/runs/${runId}`);
        const data = await res.json();
        if (data.run?.status === 'completed' || data.run?.status === 'failed') {
          return data.run;
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      throw new Error(`Run ${runId} timed out`);
    };

    const completedRuns = await Promise.all(launchedRuns.map(r => pollRunUntilComplete(r.runId)));

    // 3. Verify complete isolation
    completedRuns.forEach((run, index) => {
      expect(run.status).toBe('completed');
      expect(run.stages).toHaveLength(7);
      expect(run.finalReport).toBeDefined();

      const expectedCandidate = candidates[index];
      // Verify candidateId linkage
      expect(run.candidateId?._id || run.candidateId).toBe(expectedCandidate.id);
      // Verify each run has its own stages with correct stage count
      run.stages.forEach(stage => {
        expect(stage.status).toBe('success');
      });
    });
  });
});
