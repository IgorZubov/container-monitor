import type { FastifyInstance } from 'fastify';
import { db } from '../db/schema.js';

export interface Settings {
  telegramBotToken: string;
  telegramChatId: string;
  webhookUrl: string;
  pollIntervalMs: number;
  warnDaysBefore: number;
  diskWarnThreshold: number;
  diskCriticalThreshold: number;
}

const DEFAULTS: Settings = {
  telegramBotToken: '',
  telegramChatId: '',
  webhookUrl: '',
  pollIntervalMs: 30_000,
  warnDaysBefore: 14,
  diskWarnThreshold: 80,
  diskCriticalThreshold: 90,
};

const getAll = db.prepare<[], { key: string; value: string }>(
  'SELECT key, value FROM settings'
);

const upsert = db.prepare(
  `INSERT INTO settings (key, value, updated_at)
   VALUES (@key, @value, unixepoch())
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()`
);

export function readSettings(): Settings {
  const rows = getAll.all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    telegramBotToken: map['telegramBotToken'] ?? DEFAULTS.telegramBotToken,
    telegramChatId: map['telegramChatId'] ?? DEFAULTS.telegramChatId,
    webhookUrl: map['webhookUrl'] ?? DEFAULTS.webhookUrl,
    pollIntervalMs: Number(map['pollIntervalMs'] ?? DEFAULTS.pollIntervalMs),
    warnDaysBefore: Number(map['warnDaysBefore'] ?? DEFAULTS.warnDaysBefore),
    diskWarnThreshold: Number(map['diskWarnThreshold'] ?? DEFAULTS.diskWarnThreshold),
    diskCriticalThreshold: Number(map['diskCriticalThreshold'] ?? DEFAULTS.diskCriticalThreshold),
  };
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/settings', async (_req, reply) => {
    return reply.send(readSettings());
  });

  app.post<{ Body: Partial<Settings> }>('/settings', async (req, reply) => {
    const save = db.transaction((patch: Partial<Settings>) => {
      for (const [key, value] of Object.entries(patch)) {
        if (!(key in DEFAULTS)) continue;
        upsert.run({ key, value: String(value) });
      }
    });
    save(req.body);
    return reply.send(readSettings());
  });
}
