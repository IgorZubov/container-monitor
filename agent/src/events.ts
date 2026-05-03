import { docker } from './collectors/docker.js';

export type ContainerEventType = 'start' | 'stop' | 'die' | 'destroy';

export interface ContainerEvent {
  type: ContainerEventType;
  containerId: string;
  containerName: string;
  timestamp: number;
}

type EventCallback = (event: ContainerEvent) => void;

const WATCHED_EVENTS = new Set(['start', 'stop', 'die', 'destroy']);

export async function watchDockerEvents(onEvent: EventCallback): Promise<void> {
  const stream = await docker.getEvents({
    filters: { type: ['container'] },
  });

  stream.on('data', (chunk: Buffer) => {
    try {
      const raw = JSON.parse(chunk.toString()) as {
        status: string;
        id: string;
        Actor: { Attributes: Record<string, string> };
        time: number;
      };

      if (!WATCHED_EVENTS.has(raw.status)) return;

      const event: ContainerEvent = {
        type: raw.status as ContainerEventType,
        containerId: raw.id,
        containerName: raw.Actor.Attributes['name'] ?? raw.id.slice(0, 12),
        timestamp: raw.time * 1000,
      };

      onEvent(event);
    } catch (err) {
      console.error('[events] failed to parse Docker event:', err);
    }
  });

  stream.on('error', (err: Error) => {
    console.error('[events] Docker event stream error:', err);
  });

  stream.on('end', () => {
    console.warn('[events] Docker event stream ended — reconnecting in 5s');
    setTimeout(() => watchDockerEvents(onEvent), 5000);
  });
}
