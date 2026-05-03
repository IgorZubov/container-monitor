import type { FastifyInstance } from 'fastify';
import { db } from '../db/schema.js';

export type UptimeWindow = '24h' | '7d' | '30d';

export interface UptimeBucket {
  timestamp: number;
  status: 'up' | 'down' | 'nodata';
}

const WINDOW_CONFIG: Record<UptimeWindow, { buckets: number; bucketMs: number }> = {
  '24h': { buckets: 24, bucketMs: 60 * 60 * 1000 },
  '7d':  { buckets: 7,  bucketMs: 24 * 60 * 60 * 1000 },
  '30d': { buckets: 30, bucketMs: 24 * 60 * 60 * 1000 },
};

const queryBucket = db.prepare<
  { service_id: string; from_ts: number; to_ts: number },
  { status: string }
>(`
  SELECT status FROM metrics
  WHERE service_id = @service_id
    AND reported_at >= @from_ts
    AND reported_at <  @to_ts
  ORDER BY reported_at DESC
  LIMIT 1
`);

function buildBuckets(serviceId: string, window: UptimeWindow): UptimeBucket[] {
  const { buckets, bucketMs } = WINDOW_CONFIG[window];
  const now = Date.now();
  const result: UptimeBucket[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const to_ts = now - i * bucketMs;
    const from_ts = to_ts - bucketMs;
    const row = queryBucket.get({ service_id: serviceId, from_ts, to_ts });

    result.push({
      timestamp: from_ts,
      status: row == null ? 'nodata' : row.status === 'running' ? 'up' : 'down',
    });
  }

  return result;
}

export async function uptimeRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string }; Querystring: { window?: string } }>(
    '/services/:id/uptime',
    async (req, reply) => {
      const { id } = req.params;
      const window = (req.query.window ?? '24h') as UptimeWindow;

      if (!WINDOW_CONFIG[window]) {
        return reply.status(400).send({ error: 'window must be 24h, 7d, or 30d' });
      }

      const buckets = buildBuckets(id, window);
      const upCount = buckets.filter((b) => b.status === 'up').length;
      const dataCount = buckets.filter((b) => b.status !== 'nodata').length;
      const uptimePct = dataCount > 0 ? Math.round((upCount / dataCount) * 100) : null;

      return reply.send({ serviceId: id, window, uptimePct, buckets });
    }
  );
}
