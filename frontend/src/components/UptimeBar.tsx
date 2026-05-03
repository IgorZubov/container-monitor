import { useEffect, useState } from 'react';

type BucketStatus = 'up' | 'down' | 'nodata';

interface Bucket {
  timestamp: number;
  status: BucketStatus;
}

interface UptimeResponse {
  uptimePct: number | null;
  buckets: Bucket[];
}

type Window = '24h' | '7d' | '30d';

const BUCKET_COLOR: Record<BucketStatus, string> = {
  up: '#22c55e',
  down: '#ef4444',
  nodata: '#e5e7eb',
};

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

interface Props {
  serviceId: string;
  window?: Window;
}

export function UptimeBar({ serviceId, window = '24h' }: Props) {
  const [data, setData] = useState<UptimeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND}/services/${serviceId}/uptime?window=${window}`)
      .then((r) => r.json())
      .then((d: UptimeResponse) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serviceId, window]);

  if (!data) return <div style={{ height: 20 }} />;

  const label = data.uptimePct != null ? `${data.uptimePct}%` : '—';

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
        {data.buckets.map((b) => (
          <div
            key={b.timestamp}
            title={`${new Date(b.timestamp).toLocaleString()} — ${b.status}`}
            style={{
              flex: 1,
              height: 16,
              borderRadius: 2,
              background: BUCKET_COLOR[b.status],
            }}
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
