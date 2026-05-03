import tls from 'node:tls';

export interface SslCheckConfig {
  domain: string;
  port?: number;
  warnDaysBefore?: number;
}

export interface SslCheckResult {
  ok: boolean;
  daysLeft: number | null;
  expiresAt: Date | null;
  warning: boolean;
  error?: string;
}

export async function checkSsl(config: SslCheckConfig): Promise<SslCheckResult> {
  const { domain, port = 443, warnDaysBefore = 14 } = config;

  return new Promise((resolve) => {
    const socket = tls.connect({ host: domain, port, servername: domain, rejectUnauthorized: false }, () => {
      try {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert?.valid_to) {
          resolve({ ok: false, daysLeft: null, expiresAt: null, warning: false, error: 'No certificate found' });
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
        const warning = daysLeft <= warnDaysBefore;
        resolve({ ok: daysLeft > 0, daysLeft, expiresAt, warning });
      } catch (err) {
        socket.destroy();
        const message = err instanceof Error ? err.message : String(err);
        resolve({ ok: false, daysLeft: null, expiresAt: null, warning: false, error: message });
      }
    });

    socket.on('error', (err) => {
      resolve({ ok: false, daysLeft: null, expiresAt: null, warning: false, error: err.message });
    });

    socket.setTimeout(10_000, () => {
      socket.destroy();
      resolve({ ok: false, daysLeft: null, expiresAt: null, warning: false, error: 'Connection timeout' });
    });
  });
}
