import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAll } = vi.hoisted(() => ({ mockAll: vi.fn().mockReturnValue([]) }));

vi.mock('../db/schema.js', () => ({
  db: {
    prepare: vi.fn(() => ({ all: mockAll })),
    pragma: vi.fn(),
    exec: vi.fn(),
  },
}));

import { broadcast, getSnapshot } from './sse.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockAll.mockReturnValue([]);
});

describe('getSnapshot', () => {
  it('returns the rows the DB query produced', () => {
    const services = [{ id: 'nginx', name: 'nginx', status: 'running' }];
    mockAll.mockReturnValue(services);

    expect(getSnapshot()).toEqual(services);
  });

  it('returns an empty list when no services have reported recently', () => {
    expect(getSnapshot()).toEqual([]);
  });

  it('passes a stale-cutoff timestamp to the prepared query', () => {
    const before = Date.now();
    getSnapshot();
    const after = Date.now();

    expect(mockAll).toHaveBeenCalledTimes(1);
    const cutoff = mockAll.mock.calls[0][0] as number;
    // Cutoff is now() - threshold; default threshold is 1h. Just sanity-check
    // that it's a recent past timestamp, not the unfiltered query of yore.
    expect(cutoff).toBeLessThanOrEqual(after);
    expect(cutoff).toBeGreaterThan(before - 24 * 60 * 60 * 1000);
  });
});

describe('broadcast', () => {
  it('is a callable function', () => {
    expect(typeof broadcast).toBe('function');
    expect(() => broadcast({ type: 'test' })).not.toThrow();
  });
});
