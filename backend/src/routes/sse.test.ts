import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { sseRoutes, broadcast } from './sse.js';

const mockAll = vi.fn().mockReturnValue([]);

vi.mock('../db/schema.js', () => ({
  db: {
    prepare: vi.fn(() => ({ all: mockAll })),
    pragma: vi.fn(),
    exec: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAll.mockReturnValue([]);
});

async function buildApp() {
  const app = Fastify();
  await app.register(sseRoutes);
  return app;
}

describe('GET /stream', () => {
  it('responds with text/event-stream content type', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/stream' });
    expect(res.headers['content-type']).toContain('text/event-stream');
  });

  it('sends a snapshot event on connect', async () => {
    const services = [{ id: 'abc', name: 'nginx', status: 'running' }];
    mockAll.mockReturnValue(services);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/stream' });

    expect(res.body).toContain('"type":"snapshot"');
    expect(res.body).toContain('"nginx"');
  });

  it('sends empty snapshot when no services exist', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/stream' });

    expect(res.body).toContain('"services":[]');
  });
});

describe('broadcast', () => {
  it('is a callable function', () => {
    expect(typeof broadcast).toBe('function');
    expect(() => broadcast({ type: 'test' })).not.toThrow();
  });
});
