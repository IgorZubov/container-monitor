import { describe, it, expect, vi } from 'vitest';
import { checkSsl } from './ssl.js';
import { EventEmitter } from 'node:events';

vi.mock('node:tls', () => ({
  default: {
    connect: vi.fn(),
  },
}));

import tls from 'node:tls';

function makeFakeSocket(certValidTo: string | null, errorMsg?: string) {
  const socket = new EventEmitter() as EventEmitter & {
    getPeerCertificate: () => { valid_to?: string };
    destroy: () => void;
    setTimeout: (ms: number, cb: () => void) => void;
  };
  socket.getPeerCertificate = () => (certValidTo ? { valid_to: certValidTo } : {});
  socket.destroy = vi.fn();
  socket.setTimeout = vi.fn();

  return { socket, errorMsg };
}

describe('checkSsl', () => {
  it('returns ok=true and daysLeft for a valid cert far from expiry', async () => {
    const future = new Date(Date.now() + 90 * 86_400_000).toUTCString();
    const { socket } = makeFakeSocket(future);

    vi.mocked(tls.connect).mockImplementationOnce((_opts, cb) => {
      (cb as () => void)();
      return socket as unknown as ReturnType<typeof tls.connect>;
    });

    const result = await checkSsl({ domain: 'example.com' });
    expect(result.ok).toBe(true);
    expect(result.daysLeft).toBeGreaterThan(80);
    expect(result.warning).toBe(false);
  });

  it('sets warning=true when cert expires within warnDaysBefore', async () => {
    const soon = new Date(Date.now() + 7 * 86_400_000).toUTCString();
    const { socket } = makeFakeSocket(soon);

    vi.mocked(tls.connect).mockImplementationOnce((_opts, cb) => {
      (cb as () => void)();
      return socket as unknown as ReturnType<typeof tls.connect>;
    });

    const result = await checkSsl({ domain: 'example.com', warnDaysBefore: 14 });
    expect(result.warning).toBe(true);
    expect(result.daysLeft).toBeLessThanOrEqual(14);
  });

  it('returns ok=false for expired cert', async () => {
    const past = new Date(Date.now() - 1 * 86_400_000).toUTCString();
    const { socket } = makeFakeSocket(past);

    vi.mocked(tls.connect).mockImplementationOnce((_opts, cb) => {
      (cb as () => void)();
      return socket as unknown as ReturnType<typeof tls.connect>;
    });

    const result = await checkSsl({ domain: 'example.com' });
    expect(result.ok).toBe(false);
  });

  it('returns error on socket error', async () => {
    const { socket } = makeFakeSocket(null);

    vi.mocked(tls.connect).mockImplementationOnce(() => {
      setTimeout(() => socket.emit('error', new Error('ECONNREFUSED')), 0);
      return socket as unknown as ReturnType<typeof tls.connect>;
    });

    const result = await checkSsl({ domain: 'unreachable.local' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });
});
