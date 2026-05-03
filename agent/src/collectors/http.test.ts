import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHttp } from './http.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('checkHttp', () => {
  it('returns ok=true when status matches expectation', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });
    const result = await checkHttp({ url: 'http://example.com', expectStatus: 200 });
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('returns ok=false when status does not match expectation', async () => {
    mockFetch.mockResolvedValueOnce({ status: 404 });
    const result = await checkHttp({ url: 'http://example.com', expectStatus: 200 });
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  it('returns ok=false and error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await checkHttp({ url: 'http://unreachable.local' });
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns ok=false on timeout abort', async () => {
    mockFetch.mockImplementationOnce((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    const result = await checkHttp({ url: 'http://slow.local', timeoutMs: 10 });
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBeNull();
  });

  it('defaults to expecting status 200', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });
    const result = await checkHttp({ url: 'http://example.com' });
    expect(result.ok).toBe(true);
  });
});
