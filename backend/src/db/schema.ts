import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_URL ?? './data/stackwatch.db';

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(DB_PATH);

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    image       TEXT NOT NULL,
    labels      TEXT NOT NULL DEFAULT '{}',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id    TEXT NOT NULL REFERENCES services(id),
    status        TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'unknown')),
    uptime_sec    INTEGER NOT NULL DEFAULT 0,
    reported_at   INTEGER NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id    TEXT NOT NULL REFERENCES services(id),
    from_status   TEXT,
    to_status     TEXT NOT NULL,
    changed_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_metrics_service_reported
    ON metrics(service_id, reported_at DESC);

  CREATE INDEX IF NOT EXISTS idx_status_history_service
    ON status_history(service_id, changed_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

export type ServiceStatus = 'running' | 'stopped' | 'unknown';

export interface ServiceRow {
  id: string;
  name: string;
  image: string;
  labels: string;
  created_at: number;
}

export interface MetricRow {
  id: number;
  service_id: string;
  status: ServiceStatus;
  uptime_sec: number;
  reported_at: number;
  created_at: number;
}
