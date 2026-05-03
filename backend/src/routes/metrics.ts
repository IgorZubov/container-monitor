import type { FastifyInstance } from 'fastify';
import { db, type ServiceStatus } from '../db/schema.js';
import { broadcast } from './sse.js';
import { sendAlerts } from './alerts.js';

interface ContainerPayload {
  id: string;
  name: string;
  image: string;
  status: ServiceStatus;
  uptimeSeconds: number;
  labels: Record<string, string>;
}

interface MetricsBody {
  containers: ContainerPayload[];
  reportedAt: number;
}

const upsertService = db.prepare(`
  INSERT INTO services (id, name, image, labels)
  VALUES (@id, @name, @image, @labels)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, image = excluded.image, labels = excluded.labels
`);

const insertMetric = db.prepare(`
  INSERT INTO metrics (service_id, status, uptime_sec, reported_at)
  VALUES (@service_id, @status, @uptime_sec, @reported_at)
`);

const getLastStatus = db.prepare<[string], { status: ServiceStatus }>(
  `SELECT status FROM metrics WHERE service_id = ? ORDER BY reported_at DESC LIMIT 1`
);

const insertStatusChange = db.prepare(`
  INSERT INTO status_history (service_id, from_status, to_status)
  VALUES (@service_id, @from_status, @to_status)
`);

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: MetricsBody }>('/metrics', {
    schema: {
      body: {
        type: 'object',
        required: ['containers', 'reportedAt'],
        properties: {
          containers: { type: 'array' },
          reportedAt: { type: 'number' },
        },
      },
    },
  }, async (req, reply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== process.env.AGENT_TOKEN) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { containers, reportedAt } = req.body;

    const processAll = db.transaction(() => {
      const changed: Array<{ container: ContainerPayload; fromStatus: string | null }> = [];

      for (const c of containers) {
        upsertService.run({ id: c.id, name: c.name, image: c.image, labels: JSON.stringify(c.labels) });

        const prev = getLastStatus.get(c.id);
        if (!prev || prev.status !== c.status) {
          insertStatusChange.run({ service_id: c.id, from_status: prev?.status ?? null, to_status: c.status });
          changed.push({ container: c, fromStatus: prev?.status ?? null });
        }

        insertMetric.run({ service_id: c.id, status: c.status, uptime_sec: c.uptimeSeconds, reported_at: reportedAt });
      }

      return changed;
    });

    const changed = processAll();

    for (const { container: c, fromStatus } of changed) {
      broadcast({ type: 'status_change', container: c });
      sendAlerts({ serviceName: c.name, fromStatus, toStatus: c.status })
        .catch((err) => console.error('[alerts] failed to send alert:', err));
    }

    broadcast({ type: 'metrics_update', containers, reportedAt });

    return reply.status(204).send();
  });
}
