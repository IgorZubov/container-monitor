import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  default: { statfsSync: vi.fn() },
}));

import fs from 'node:fs';
import { checkDisk } from './disk.js';

const mockStatfs = vi.mocked(fs.statfsSync);

const makeStats = (usedPct: number) => {
  const blocks = 1_000_000;
  const bsize = 4096;
  const bfree = Math.round(blocks * (1 - usedPct / 100));
  return { blocks, bsize, bfree } as ReturnType<typeof fs.statfsSync>;
};

beforeEach(() => vi.clearAllMocks());

describe('checkDisk', () => {
  it('returns ok=true and status=ok when usage is below warn threshold', async () => {
    mockStatfs.mockReturnValueOnce(makeStats(50));
    const result = await checkDisk({ path: '/' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.usedPercent).toBe(50);
  });

  it('returns status=warn when usage exceeds warn threshold', async () => {
    mockStatfs.mockReturnValueOnce(makeStats(85));
    const result = await checkDisk({ path: '/', warnThreshold: 80, criticalThreshold: 90 });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('warn');
  });

  it('returns ok=false and status=critical when usage exceeds critical threshold', async () => {
    mockStatfs.mockReturnValueOnce(makeStats(95));
    const result = await checkDisk({ path: '/', warnThreshold: 80, criticalThreshold: 90 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('critical');
  });

  it('returns error result when statfs throws', async () => {
    mockStatfs.mockImplementationOnce(() => { throw new Error('ENOENT'); });
    const result = await checkDisk({ path: '/nonexistent' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ENOENT');
  });

  it('exposes totalBytes and freeBytes', async () => {
    mockStatfs.mockReturnValueOnce(makeStats(40));
    const result = await checkDisk({ path: '/' });
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.freeBytes).toBeGreaterThan(0);
    expect(result.freeBytes).toBeLessThan(result.totalBytes);
  });
});
