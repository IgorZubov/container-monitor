import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListContainers } = vi.hoisted(() => ({ mockListContainers: vi.fn() }));

vi.mock('dockerode', () => ({
  default: vi.fn().mockImplementation(() => ({
    listContainers: mockListContainers,
  })),
}));

import type Dockerode from 'dockerode';
import { listContainers } from './docker.js';

beforeEach(() => {
  mockListContainers.mockReset();
});

const makeContainer = (overrides: Partial<Dockerode.ContainerInfo> = {}): Dockerode.ContainerInfo => ({
  Id: 'abc123',
  Names: ['/my-app'],
  Image: 'nginx:latest',
  ImageID: '',
  Command: '',
  Created: 0,
  Ports: [],
  Labels: {},
  State: 'running',
  Status: 'Up 10 minutes',
  HostConfig: { NetworkMode: 'bridge' },
  NetworkSettings: { Networks: {} },
  Mounts: [],
  ...overrides,
});

describe('listContainers', () => {
  it('returns a running container', async () => {
    mockListContainers.mockResolvedValueOnce([makeContainer()]);
    const result = await listContainers();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-app');
    expect(result[0].status).toBe('running');
  });

  it('filters out containers with monitor.ignore=true', async () => {
    mockListContainers.mockResolvedValueOnce([
      makeContainer({ Labels: { 'monitor.ignore': 'true' } }),
    ]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });

  it('filters out short-lived containers (uptime < 5 min)', async () => {
    mockListContainers.mockResolvedValueOnce([
      makeContainer({ Status: 'Up 2 minutes' }),
    ]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });

  it('uses monitor.name label when present', async () => {
    mockListContainers.mockResolvedValueOnce([
      makeContainer({ Labels: { 'monitor.name': 'My Custom Name' } }),
    ]);
    const result = await listContainers();
    expect(result[0].name).toBe('My Custom Name');
  });

  it('returns empty array when no containers are running', async () => {
    mockListContainers.mockResolvedValueOnce([]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });

  it('uses the resolved name (not Docker container ID) as the stable id', async () => {
    // Stable id survives container recreation on redeploy — Docker assigns
    // a new container ID each time, but the name is the same. Without this,
    // the dashboard shows duplicate cards after every redeploy.
    mockListContainers.mockResolvedValueOnce([makeContainer()]);
    const result = await listContainers();
    expect(result[0].id).toBe('my-app');
    expect(result[0].dockerId).toBe('abc123');
  });

  it('uses monitor.name label as the stable id when set', async () => {
    mockListContainers.mockResolvedValueOnce([
      makeContainer({ Labels: { 'monitor.name': 'My Custom Name' } }),
    ]);
    const result = await listContainers();
    expect(result[0].id).toBe('My Custom Name');
  });
});
