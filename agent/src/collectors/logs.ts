import { docker } from './docker.js';

// Docker multiplexed stream: each frame has an 8-byte header
// [stream_type(1), padding(3), size(4 big-endian)] followed by frame data
function demuxDockerStream(buffer: Buffer): string[] {
  const lines: string[] = [];
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    if (size === 0) { offset += 8; continue; }

    const end = offset + 8 + size;
    if (end > buffer.length) break;

    const chunk = buffer.subarray(offset + 8, end).toString('utf8');
    for (const line of chunk.split('\n')) {
      const trimmed = line.replace(/\r$/, '');
      if (trimmed) lines.push(trimmed);
    }
    offset = end;
  }

  // Fallback: raw text (TTY containers)
  if (lines.length === 0 && buffer.length > 0) {
    return buffer
      .toString('utf8')
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter(Boolean);
  }

  return lines;
}

export async function getContainerLogs(containerId: string, lines = 100): Promise<string[]> {
  try {
    const container = docker.getContainer(containerId);
    const buffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: lines,
      timestamps: true,
    }) as unknown as Buffer;

    return demuxDockerStream(buffer).slice(-lines);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[logs] failed to fetch logs for ${containerId}: ${message}`);
    return [];
  }
}
