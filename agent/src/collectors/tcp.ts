import net from 'node:net';

export interface TcpCheckConfig {
  host: string;
  port: number;
  timeoutMs?: number;
}

export interface TcpCheckResult {
  ok: boolean;
  responseTimeMs: number;
  error?: string;
}

export async function checkTcp(config: TcpCheckConfig): Promise<TcpCheckResult> {
  const { host, port, timeoutMs = 5_000 } = config;
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (ok: boolean, error?: string) => {
      socket.destroy();
      resolve({ ok, responseTimeMs: Date.now() - start, error });
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => finish(true));

    socket.on('timeout', () => finish(false, 'Connection timed out'));
    socket.on('error', (err) => finish(false, err.message));
  });
}
