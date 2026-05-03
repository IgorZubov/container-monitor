import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      listContainers: vi.fn(),
    })),
  };
});

import Dockerode from 'dockerode';
import { listContainers } from './docker.js';

const mockInstance = vi.mocked(new (Dockerode as unknown as new () => { listContainers: ReturnType<typeof vi.fn> })());

beforeEach(() => {
  vi.clearAllMocks();
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
    mockInstance.listContainers.mockResolvedValueOnce([makeContainer()]);
    const result = await listContainers();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-app');
    expect(result[0].status).toBe('running');
  });

  it('filters out containers with monitor.ignore=true', async () => {
    mockInstance.listContainers.mockResolvedValueOnce([
      makeContainer({ Labels: { 'monitor.ignore': 'true' } }),
    ]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });

  it('filters out short-lived containers (uptime < 5 min)', async () => {
    mockInstance.listContainers.mockResolvedValueOnce([
      makeContainer({ Status: 'Up 2 minutes' }),
    ]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });

  it('uses monitor.name label when present', async () => {
    mockInstance.listContainers.mockResolvedValueOnce([
      makeContainer({ Labels: { 'monitor.name': 'My Custom Name' } }),
    ]);
    const result = await listContainers();
    expect(result[0].name).toBe('My Custom Name');
  });

  it('returns empty array when no containers are running', async () => {
    mockInstance.listContainers.mockResolvedValueOnce([]);
    const result = await listContainers();
    expect(result).toHaveLength(0);
  });
});
