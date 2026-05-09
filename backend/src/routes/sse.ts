import type { FastifyInstance, FastifyReply } from 'fastify';
import { db } from '../db/schema.js';

const clients = new Set<FastifyReply>();

export function broadcast(payload: unknown): void {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.raw.write(data);
    } catch {
      clients.delete(client);
    }
  }
}

// Services not reported within this window are treated as decommissioned and
// hidden from the snapshot. Prevents orphan rows (e.g. an old container ID
// from a pre-fix redeploy) from lingering on the dashboard forever.
const STALE_SERVICE_MS = parseInt(process.env.STALE_SERVICE_MS ?? '3600000', 10);

const getActiveServices = db.prepare<[number]>(`
  SELECT s.id, s.name, s.image, s.labels,
         m.status, m.uptime_sec, m.reported_at
  FROM services s
  INNER JOIN metrics m ON m.id = (
    SELECT id FROM metrics WHERE service_id = s.id ORDER BY reported_at DESC LIMIT 1
  )
  WHERE m.reported_at >= ?
  ORDER BY s.name
`);

export function getSnapshot(): unknown[] {
  return getActiveServices.all(Date.now() - STALE_SERVICE_MS);
}

export async function sseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stream', (req, reply) => {
    reply.hijack();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders();

    reply.raw.write(`data: ${JSON.stringify({ type: 'snapshot', services: getSnapshot() })}\n\n`);

    clients.add(reply);

    req.raw.on('close', () => {
      clients.delete(reply);
      reply.raw.end();
    });
  });
}
