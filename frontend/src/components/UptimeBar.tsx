import { useEffect, useState } from 'react';

type BucketStatus = 'up' | 'down' | 'nodata';

interface Bucket { timestamp: number; status: BucketStatus }
interface UptimeResponse { uptimePct: number | null; buckets: Bucket[] }
type Window = '24h' | '7d' | '30d';

const BUCKET_COLOR: Record<BucketStatus, string> = {
  up: '#22c55e',
  down: '#ef4444',
  nodata: '#e5e7eb',
};

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

// --- localStorage helpers ---

function storageKey(serviceId: string, window: Window) {
  return `sw_uptime_${serviceId}_${window}`;
}

function loadHistory(serviceId: string, window: Window): Map<number, BucketStatus> {
  try {
    const raw = localStorage.getItem(storageKey(serviceId, window));
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as Array<[number, BucketStatus]>);
  } catch { return new Map(); }
}

function saveHistory(serviceId: string, window: Window, map: Map<number, BucketStatus>) {
  try {
    // Drop entries older than the window
    const windowMs = window === '24h' ? 86_400_000 : 7 * 86_400_000;
    const cutoff = Date.now() - windowMs;
    const entries = [...map.entries()].filter(([ts]) => ts >= cutoff);
    localStorage.setItem(storageKey(serviceId, window), JSON.stringify(entries));
  } catch { /* storage full or unavailable */ }
}

// Merge: server data wins when it has real status; stored data fills nodata gaps
function merge(stored: Map<number, BucketStatus>, fresh: Bucket[]): Bucket[] {
  const result = new Map(stored);
  for (const b of fresh) {
    if (b.status !== 'nodata') result.set(b.timestamp, b.status);
    else if (!result.has(b.timestamp)) result.set(b.timestamp, 'nodata');
  }
  return fresh.map((b) => ({ timestamp: b.timestamp, status: result.get(b.timestamp) ?? 'nodata' }));
}

// --- Component ---

interface Props { serviceId: string; window?: Window }

export function UptimeBar({ serviceId, window = '24h' }: Props) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [uptimePct, setUptimePct] = useState<number | null>(null);

  useEffect(() => {
    // Show stored history immediately while fetch is in-flight
    const stored = loadHistory(serviceId, window);
    if (stored.size > 0) {
      setBuckets((prev) => prev.length === 0
        ? [...stored.entries()]
            .sort(([a], [b]) => a - b)
            .map(([timestamp, status]) => ({ timestamp, status }))
        : prev);
    }

    let cancelled = false;
    fetch(`${BACKEND}/services/${serviceId}/uptime?window=${window}`)
      .then((r) => r.json())
      .then((d: UptimeResponse) => {
        if (cancelled) return;
        const merged = merge(stored, d.buckets);

        // Persist back — only real (non-nodata) entries
        const updated = new Map(stored);
        for (const b of merged) if (b.status !== 'nodata') updated.set(b.timestamp, b.status);
        saveHistory(serviceId, window, updated);

        const upCount = merged.filter((b) => b.status === 'up').length;
        const dataCount = merged.filter((b) => b.status !== 'nodata').length;
        setUptimePct(dataCount > 0 ? Math.round((upCount / dataCount) * 100) : d.uptimePct);
        setBuckets(merged);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serviceId, window]);

  if (buckets.length === 0) return <div style={{ height: 32 }} />;

  const label = uptimePct != null ? `${uptimePct}%` : '—';

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
        {buckets.map((b) => (
          <div key={b.timestamp}
            title={`${new Date(b.timestamp).toLocaleString()} — ${b.status}`}
            style={{ flex: 1, height: 16, borderRadius: 2, background: BUCKET_COLOR[b.status] }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
        <span>{window}</span>
        <span>{label} uptime</span>
      </div>
    </div>
  );
}
