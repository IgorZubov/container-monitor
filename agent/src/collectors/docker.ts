import Dockerode from 'dockerode';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'unknown';
  uptimeSeconds: number;
  labels: Record<string, string>;
}

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const MIN_UPTIME_SECONDS = 5 * 60;

export async function listContainers(): Promise<ContainerInfo[]> {
  const raw = await docker.listContainers({ all: false });

  const containers: ContainerInfo[] = [];

  for (const c of raw) {
    const labels = c.Labels ?? {};

    if (labels['monitor.ignore'] === 'true') continue;

    const uptimeSeconds = parseUptimeFromStatus(c.Status);
    if (uptimeSeconds < MIN_UPTIME_SECONDS) continue;

    const name = labels['monitor.name'] ?? (c.Names[0]?.replace(/^\//, '') ?? c.Id.slice(0, 12));

    containers.push({
      id: c.Id,
      name,
      image: c.Image,
      status: c.State === 'running' ? 'running' : c.State === 'exited' ? 'stopped' : 'unknown',
      uptimeSeconds,
      labels,
    });
  }

  return containers;
}

function parseUptimeFromStatus(status: string): number {
  // Docker status strings: "Up 2 hours", "Up 3 minutes", "Up 45 seconds", "Up 5 days"
  const match = status.match(/^Up (\d+)\s+(second|minute|hour|day|week|month)/i);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
  };

  return value * (multipliers[unit] ?? 0);
}

export { docker };
