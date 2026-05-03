import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('node:net', () => {
  const Socket = vi.fn();
  return { default: { Socket } };
});

import net from 'node:net';
import { checkTcp } from './tcp.js';

function makeSocket() {
  const socket = new EventEmitter() as EventEmitter & {
    connect: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    setTimeout: ReturnType<typeof vi.fn>;
  };
  socket.connect = vi.fn();
  socket.destroy = vi.fn();
  socket.setTimeout = vi.fn();
  return socket;
}

beforeEach(() => vi.clearAllMocks());

describe('checkTcp', () => {
  it('returns ok=true when port is open', async () => {
    const socket = makeSocket();
    vi.mocked(net.Socket).mockImplementationOnce(() => socket as never);
    socket.connect.mockImplementationOnce((_port: number, _host: string, cb: () => void) => cb());

    const result = await checkTcp({ host: 'localhost', port: 27017 });
    expect(result.ok).toBe(true);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('returns ok=false with error on connection refused', async () => {
    const socket = makeSocket();
    vi.mocked(net.Socket).mockImplementationOnce(() => socket as never);
    socket.connect.mockImplementationOnce(() => {
      setTimeout(() => socket.emit('error', new Error('ECONNREFUSED')), 0);
    });

    const result = await checkTcp({ host: 'localhost', port: 9999 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns ok=false on timeout', async () => {
    const socket = makeSocket();
    vi.mocked(net.Socket).mockImplementationOnce(() => socket as never);
    socket.connect.mockImplementationOnce(() => {
      setTimeout(() => socket.emit('timeout'), 0);
    });

    const result = await checkTcp({ host: '10.0.0.1', port: 80, timeoutMs: 10 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timed out');
  });
});
