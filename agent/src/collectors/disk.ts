import fs from 'node:fs';

export interface DiskCheckConfig {
  path: string;
  warnThreshold?: number;
  criticalThreshold?: number;
}

export type DiskStatus = 'ok' | 'warn' | 'critical';

export interface DiskCheckResult {
  ok: boolean;
  status: DiskStatus;
  usedPercent: number;
  totalBytes: number;
  freeBytes: number;
  error?: string;
}

export async function checkDisk(config: DiskCheckConfig): Promise<DiskCheckResult> {
  const { path: mountPath, warnThreshold = 80, criticalThreshold = 90 } = config;

  try {
    const stats = fs.statfsSync(mountPath);
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bfree * stats.bsize;
    const usedBytes = totalBytes - freeBytes;
    const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    let status: DiskStatus = 'ok';
    if (usedPercent >= criticalThreshold) status = 'critical';
    else if (usedPercent >= warnThreshold) status = 'warn';

    return { ok: status !== 'critical', status, usedPercent, totalBytes, freeBytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 'critical', usedPercent: 0, totalBytes: 0, freeBytes: 0, error: message };
  }
}
