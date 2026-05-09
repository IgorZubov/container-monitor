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

// Only return services seen within the last 10 minutes — stale records from
// old container IDs (e.g. after a redeploy) disappear automatically.
const STALE_MS = 10 * 60 * 1000;

const getAllServices = db.prepare(`
  SELECT s.id, s.name, s.image, s.labels,
         m.status, m.uptime_sec, m.reported_at
  FROM services s
  LEFT JOIN metrics m ON m.id = (
    SELECT id FROM metrics WHERE service_id = s.id ORDER BY reported_at DESC LIMIT 1
  )
  WHERE m.reported_at > ?
  ORDER BY s.name
`);

export async function sseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stream', async (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders();

    const snapshot = getAllServices.all(Date.now() - STALE_MS);
    reply.raw.write(`data: ${JSON.stringify({ type: 'snapshot', services: snapshot })}\n\n`);

    clients.add(reply);

    req.raw.on('close', () => {
      clients.delete(reply);
    });

    await new Promise<void>((resolve) => req.raw.on('close', resolve));
  });
}
