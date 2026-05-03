import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface CheckConfig {
  name: string;
  type: 'http' | 'tcp' | 'ssl' | 'disk' | 'exec';
  // http
  url?: string;
  expect_status?: number;
  interval?: string;
  // tcp
  host?: string;
  port?: number;
  // ssl
  domain?: string;
  warn_days_before?: number;
  // disk
  path?: string;
  warn_threshold?: number;
  critical_threshold?: number;
  // exec
  command?: string;
  expect_output?: string;
}

export interface AgentConfig {
  checks: CheckConfig[];
}

const DEFAULT_CONFIG: AgentConfig = { checks: [] };

export function loadConfig(configPath: string): AgentConfig {
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = yaml.load(raw) as AgentConfig;
    return parsed ?? DEFAULT_CONFIG;
  } catch (err) {
    console.error(`[config] failed to parse ${configPath}:`, err);
    return DEFAULT_CONFIG;
  }
}

type OnChange = (config: AgentConfig) => void;

export function watchConfig(configPath: string, onChange: OnChange): () => void {
  const absPath = path.resolve(configPath);

  if (!fs.existsSync(absPath)) {
    console.warn(`[config] config file not found at ${absPath}, watching parent dir`);
  }

  let debounce: ReturnType<typeof setTimeout> | null = null;

  const watcher = fs.watch(path.dirname(absPath), (event, filename) => {
    if (filename !== path.basename(absPath)) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log('[config] reloading config...');
      onChange(loadConfig(absPath));
    }, 300);
  });

  return () => watcher.close();
}
