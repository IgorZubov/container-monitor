import { useEffect, useReducer } from 'react';
import { ServiceCard, type Service, type ServiceStatus } from '../components/ServiceCard.js';

// Agent broadcasts camelCase; DB snapshots use snake_case. Accept both.
function normalizeService(raw: Record<string, unknown>): Service {
  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    image: raw['image'] as string,
    status: (raw['status'] as ServiceStatus) ?? 'unknown',
    uptime_sec: (raw['uptime_sec'] ?? raw['uptimeSeconds'] ?? 0) as number,
    reported_at: (raw['reported_at'] ?? raw['reportedAt'] ?? 0) as number,
    sslDaysLeft: raw['sslDaysLeft'] as number | undefined,
  };
}

type RawMessage =
  | { type: 'snapshot'; services: Record<string, unknown>[] }
  | { type: 'metrics_update'; containers: Record<string, unknown>[] }
  | { type: 'status_change'; container: Record<string, unknown> };

type State = { services: Map<string, Service>; connected: boolean };

type Action =
  | { type: 'snapshot'; services: Service[] }
  | { type: 'upsert'; services: Service[] }
  | { type: 'connected'; value: boolean };

function reducer(state: State, action: Action): State {
  if (action.type === 'connected') return { ...state, connected: action.value };
  if (action.type === 'snapshot') {
    const map = new Map(action.services.map((s) => [s.id, s]));
    return { ...state, services: map };
  }
  if (action.type === 'upsert') {
    const map = new Map(state.services);
    // Drop existing rows that share a name with an incoming update but have
    // a different id — orphans from container redeploys before the agent
    // started using stable ids. Without this, the dashboard would show two
    // cards for the same service until the backend's stale window expires.
    const incomingByName = new Map(action.services.map((s) => [s.name, s.id]));
    for (const [id, svc] of map) {
      const incomingId = incomingByName.get(svc.name);
      if (incomingId !== undefined && incomingId !== id) map.delete(id);
    }
    for (const s of action.services) map.set(s.id, s);
    return { ...state, services: map };
  }
  return state;
}

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

export function Dashboard() {
  const [state, dispatch] = useReducer(reducer, { services: new Map(), connected: false });

  useEffect(() => {
    const es = new EventSource(`${BACKEND}/stream`);

    es.onopen = () => dispatch({ type: 'connected', value: true });
    es.onerror = () => dispatch({ type: 'connected', value: false });

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as RawMessage;
        if (msg.type === 'snapshot') {
          dispatch({ type: 'snapshot', services: msg.services.map(normalizeService) });
        } else if (msg.type === 'metrics_update') {
          dispatch({ type: 'upsert', services: msg.containers.map(normalizeService) });
        } else if (msg.type === 'status_change') {
          dispatch({ type: 'upsert', services: [normalizeService(msg.container)] });
        }
      } catch {
        console.error('[dashboard] failed to parse SSE message', e.data);
      }
    };

    return () => es.close();
  }, []);

  const services = [...state.services.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>StackWatch</h1>
        <span style={{ fontSize: 12, color: state.connected ? '#22c55e' : '#ef4444' }}>
          {state.connected ? '● live' : '○ disconnected'}
        </span>
      </div>

      {services.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No containers detected yet. Make sure the agent is running.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
    </div>
  );
}
