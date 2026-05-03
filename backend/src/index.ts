import Fastify from 'fastify';
import cors from '@fastify/cors';
import { metricsRoutes } from './routes/metrics.js';
import { sseRoutes } from './routes/sse.js';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

if (!process.env.AGENT_TOKEN) {
  console.error('[backend] AGENT_TOKEN is not set — exiting');
  process.exit(1);
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(metricsRoutes);
await app.register(sseRoutes);

app.get('/health', async () => ({ ok: true }));

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[backend] listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
