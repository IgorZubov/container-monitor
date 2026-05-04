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

  CREATE TABLE IF NOT EXISTS container_logs (
    service_id  TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
    lines       TEXT NOT NULL DEFAULT '[]',
    fetched_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    stripe_customer_id  TEXT,
    stripe_sub_id       TEXT,
    plan          TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS agent_tokens (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       TEXT NOT NULL DEFAULT 'default',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_agent_tokens_user ON agent_tokens(user_id);
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

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  stripe_customer_id: string | null;
  stripe_sub_id: string | null;
  plan: 'free' | 'pro';
  created_at: number;
}

export interface AgentTokenRow {
  token: string;
  user_id: string;
  label: string;
  created_at: number;
}
