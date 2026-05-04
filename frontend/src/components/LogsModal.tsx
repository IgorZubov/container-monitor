import { useEffect, useRef, useState } from 'react';

interface LogsResponse {
  lines: string[];
  fetchedAt: number;
}

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

// Colour-code log lines by severity keywords
function lineColor(line: string): string {
  const l = line.toLowerCase();
  if (l.includes('error') || l.includes('fatal') || l.includes('crit')) return '#fca5a5';
  if (l.includes('warn')) return '#fde68a';
  return '#d1fae5';
}

interface Props {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
}

export function LogsModal({ serviceId, serviceName, onClose }: Props) {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BACKEND}/services/${serviceId}/logs`)
      .then((r) => {
        if (!r.ok) throw new Error('No logs available yet');
        return r.json() as Promise<LogsResponse>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [serviceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [data]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', borderRadius: 10, width: '90%', maxWidth: 860, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <span style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: 14 }}>
            📋 {serviceName} — last 100 lines
          </span>
          {data && (
            <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
              fetched {new Date(data.fetchedAt * 1000).toLocaleTimeString()}
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 0', flex: 1 }}>
          {loading && <p style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 13, padding: '0 16px' }}>Loading…</p>}
          {error  && <p style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 13, padding: '0 16px' }}>{error}</p>}
          {data?.lines.map((line, i) => (
            <div key={i} style={{ padding: '1px 16px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: lineColor(line) }}>
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
