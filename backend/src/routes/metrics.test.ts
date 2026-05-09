import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const { mockRun, mockGet, mockTransaction, mockBroadcast, mockSendAlerts } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockGet: vi.fn(),
  mockTransaction: vi.fn((fn: () => unknown) => fn),
  mockBroadcast: vi.fn(),
  mockSendAlerts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/schema.js', () => ({
  db: {
    prepare: vi.fn(() => ({ run: mockRun, get: mockGet })),
    transaction: mockTransaction,
    pragma: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock('./sse.js', () => ({ broadcast: mockBroadcast }));
vi.mock('./alerts.js', () => ({ sendAlerts: mockSendAlerts }));

import { metricsRoutes } from './metrics.js';

const VALID_TOKEN = 'test-token';

async function buildApp() {
  process.env.AGENT_TOKEN = VALID_TOKEN;
  const app = Fastify();
  await app.register(metricsRoutes);
  return app;
}

const sampleContainer = {
  id: 'abc123',
  name: 'nginx',
  image: 'nginx:latest',
  status: 'running',
  uptimeSeconds: 600,
  labels: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockReturnValue(null);
  mockTransaction.mockImplementation((fn: () => unknown) => fn);
});

describe('POST /metrics', () => {
  it('returns 401 without auth token', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/metrics', payload: { containers: [], reportedAt: Date.now() } });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with wrong token', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST', url: '/metrics',
      headers: { authorization: 'Bearer wrong' },
      payload: { containers: [], reportedAt: Date.now() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 204 with valid token and empty containers', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST', url: '/metrics',
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
      payload: { containers: [], reportedAt: Date.now() },
    });
    expect(res.statusCode).toBe(204);
  });

  it('broadcasts metrics_update on success', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'POST', url: '/metrics',
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
      payload: { containers: [sampleContainer], reportedAt: Date.now() },
    });
    expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'metrics_update' }));
  });

  it('returns 400 when body is missing required fields', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST', url: '/metrics',
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
      payload: { containers: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
