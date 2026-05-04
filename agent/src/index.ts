import { listContainers } from './collectors/docker.js';
import { getContainerLogs } from './collectors/logs.js';
import { watchDockerEvents } from './events.js';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? '';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '30000', 10);

if (!AGENT_TOKEN) {
  console.error('[agent] AGENT_TOKEN is not set — exiting');
  process.exit(1);
}

async function postMetrics(): Promise<void> {
  try {
    const containers = await listContainers();

    const res = await fetch(`${BACKEND_URL}/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AGENT_TOKEN}`,
      },
      body: JSON.stringify({ containers, reportedAt: Date.now() }),
    });

    if (!res.ok) {
      console.error(`[agent] POST /metrics failed: ${res.status} ${res.statusText}`);
      return;
    }

    console.log(`[agent] reported ${containers.length} container(s)`);

    // Post logs for each container (fire-and-forget, non-blocking)
    for (const c of containers) {
      getContainerLogs(c.id).then((lines) => {
        if (lines.length === 0) return;
        return fetch(`${BACKEND_URL}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AGENT_TOKEN}` },
          body: JSON.stringify({ serviceId: c.id, lines, fetchedAt: Date.now() }),
        });
      }).catch((err) => console.error(`[agent] failed to post logs for ${c.name}:`, err));
    }
  } catch (err) {
    console.error('[agent] failed to post metrics:', err);
  }
}

async function main(): Promise<void> {
  console.log(`[agent] starting — backend: ${BACKEND_URL}, interval: ${POLL_INTERVAL}ms`);

  await postMetrics();
  setInterval(postMetrics, POLL_INTERVAL);

  await watchDockerEvents((event) => {
    console.log(`[agent] container event: ${event.type} → ${event.containerName}`);
    // Trigger an immediate report so the backend reflects the change right away
    postMetrics().catch((err) => console.error('[agent] event-triggered post failed:', err));
  });
}

main().catch((err) => {
  console.error('[agent] fatal error:', err);
  process.exit(1);
});
