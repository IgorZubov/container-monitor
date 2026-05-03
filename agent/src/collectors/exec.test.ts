import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: vi.fn((fn: unknown) => fn),
}));

import { execFile } from 'node:child_process';
import { checkExec } from './exec.js';

const mockExecFile = vi.mocked(execFile);

beforeEach(() => vi.clearAllMocks());

describe('checkExec', () => {
  it('returns ok=true when command succeeds with no expectOutput', async () => {
    mockExecFile.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      (cb as (e: null, r: { stdout: string; stderr: string }) => void)(null, { stdout: 'hello', stderr: '' });
    });
    const result = await checkExec({ command: 'echo hello' });
    expect(result.ok).toBe(true);
    expect(result.output).toBe('hello');
  });

  it('returns ok=true when output matches expectOutput', async () => {
    mockExecFile.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      (cb as (e: null, r: { stdout: string; stderr: string }) => void)(null, { stdout: 'active', stderr: '' });
    });
    const result = await checkExec({ command: 'systemctl is-active caddy', expectOutput: 'active' });
    expect(result.ok).toBe(true);
  });

  it('returns ok=false when output does not match expectOutput', async () => {
    mockExecFile.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      (cb as (e: null, r: { stdout: string; stderr: string }) => void)(null, { stdout: 'inactive', stderr: '' });
    });
    const result = await checkExec({ command: 'systemctl is-active caddy', expectOutput: 'active' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('active');
  });

  it('returns ok=false when command exits with error', async () => {
    mockExecFile.mockImplementationOnce((_bin, _args, _opts, cb: unknown) => {
      (cb as (e: Error) => void)(Object.assign(new Error('Command failed'), { stdout: '' }));
    });
    const result = await checkExec({ command: 'false' });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('passes individual args to execFile (no shell injection)', async () => {
    mockExecFile.mockImplementationOnce((_bin, args, _opts, cb: unknown) => {
      (cb as (e: null, r: { stdout: string; stderr: string }) => void)(null, { stdout: (args as string[]).join(' '), stderr: '' });
    });
    await checkExec({ command: 'echo foo bar' });
    expect(mockExecFile).toHaveBeenCalledWith('echo', ['foo', 'bar'], expect.any(Object), expect.any(Function));
  });
});
