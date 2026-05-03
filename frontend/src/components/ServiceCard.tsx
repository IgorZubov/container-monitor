export type ServiceStatus = 'running' | 'stopped' | 'unknown';

export interface Service {
  id: string;
  name: string;
  image: string;
  status: ServiceStatus;
  uptime_sec: number;
  reported_at: number;
  sslDaysLeft?: number;
}

const STATUS_STYLES: Record<ServiceStatus, { bg: string; dot: string; label: string }> = {
  running: { bg: '#e6f9ee', dot: '#22c55e', label: 'Running' },
  stopped: { bg: '#fde8e8', dot: '#ef4444', label: 'Stopped' },
  unknown: { bg: '#fef9e7', dot: '#f59e0b', label: 'Unknown' },
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

interface Props {
  service: Service;
}

export function ServiceCard({ service }: Props) {
  const style = STATUS_STYLES[service.status] ?? STATUS_STYLES.unknown;
  const lastSeen = service.reported_at
    ? new Date(service.reported_at).toLocaleTimeString()
    : '—';

  return (
    <div style={{
      background: style.bg,
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
        <strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {service.name}
        </strong>
      </div>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{service.image}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginTop: 4 }}>
        <span>{style.label} · {formatUptime(service.uptime_sec)}</span>
        <span>seen {lastSeen}</span>
      </div>
      {service.sslDaysLeft !== undefined && service.sslDaysLeft <= 14 && (
        <div style={{ fontSize: 12, color: '#d97706', marginTop: 2 }}>
          ⚠ SSL expires in {service.sslDaysLeft}d
        </div>
      )}
    </div>
  );
}
