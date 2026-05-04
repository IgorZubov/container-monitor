import type { FastifyInstance } from 'fastify';
import { db } from '../db/schema.js';

interface LogsBody {
  serviceId: string;
  lines: string[];
  fetchedAt: number;
}

const upsert = db.prepare(`
  INSERT INTO container_logs (service_id, lines, fetched_at)
  VALUES (@service_id, @lines, @fetched_at)
  ON CONFLICT(service_id) DO UPDATE
    SET lines = excluded.lines, fetched_at = excluded.fetched_at
`);

const getLogs = db.prepare<[string], { lines: string; fetched_at: number }>(
  `SELECT lines, fetched_at FROM container_logs WHERE service_id = ?`
);

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  // Agent posts logs for a container
  app.post<{ Body: LogsBody }>('/logs', async (req, reply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const fromDb = db.prepare<[string], { user_id: string }>(
      'SELECT user_id FROM agent_tokens WHERE token = ?'
    ).get(token ?? '');

    if (!fromDb && token !== process.env.AGENT_TOKEN) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { serviceId, lines, fetchedAt } = req.body;
    upsert.run({
      service_id: serviceId,
      lines: JSON.stringify(lines.slice(-100)),
      fetched_at: fetchedAt,
    });

    return reply.status(204).send();
  });

  // Frontend fetches stored logs for a service
  app.get<{ Params: { id: string } }>('/services/:id/logs', async (req, reply) => {
    const row = getLogs.get(req.params.id);
    if (!row) return reply.status(404).send({ error: 'No logs found' });

    return reply.send({
      serviceId: req.params.id,
      lines: JSON.parse(row.lines) as string[],
      fetchedAt: row.fetched_at,
    });
  });
}
