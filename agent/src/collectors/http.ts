export interface HttpCheckConfig {
  url: string;
  expectStatus?: number;
  timeoutMs?: number;
}

export interface HttpCheckResult {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  error?: string;
}

export async function checkHttp(config: HttpCheckConfig): Promise<HttpCheckResult> {
  const { url, expectStatus = 200, timeoutMs = 10_000 } = config;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const responseTimeMs = Date.now() - start;
    const ok = res.status === expectStatus;
    return { ok, statusCode: res.status, responseTimeMs };
  } catch (err) {
    const responseTimeMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, statusCode: null, responseTimeMs, error: message };
  } finally {
    clearTimeout(timer);
  }
}
