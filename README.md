# StackWatch

Lightweight self-hosted infrastructure monitor for solo developers. Deploy one Docker container, see all your running services on a live dashboard in 30 seconds — no YAML required to start.

![status: alpha](https://img.shields.io/badge/status-alpha-orange)

---

## Quickstart (self-hosted)

**Prerequisites:** Docker + Docker Compose

```bash
# 1. Clone
git clone https://github.com/igorzubov/container-monitor.git
cd container-monitor

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set AGENT_TOKEN and JWT_SECRET

# 3. Run
docker compose up -d
```

Open **http://localhost:3000** — your running containers will appear within 30 seconds.

---

## Environment variables

Create a `.env` file in the project root:

```env
# Required
AGENT_TOKEN=change-me-long-random-string
JWT_SECRET=change-me-long-random-string

# Optional
PORT=4000
DATABASE_URL=./data/stackwatch.db
POLL_INTERVAL=30000

# Alerts (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
WEBHOOK_URL=

# Stripe (Phase 3 / hosted tier only)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
FRONTEND_URL=http://localhost:3000
```

---

## Optional: `config.yml` for custom checks

Place a `config.yml` in the project root (hot-reloaded, no restart needed):

```yaml
checks:
  - name: "My API"
    type: http
    url: "https://api.example.com/health"
    expect_status: 200

  - name: "Postgres"
    type: tcp
    host: localhost
    port: 5432

  - name: "SSL Cert"
    type: ssl
    domain: example.com
    warn_days_before: 14

  - name: "Disk /"
    type: disk
    path: /
    warn_threshold: 80
    critical_threshold: 90

  - name: "Caddy"
    type: exec
    command: "systemctl is-active caddy"
    expect_output: "active"
```

---

## Docker labels

Control monitoring behaviour per-container without any config file:

```yaml
# docker-compose.yml
services:
  my-app:
    image: nginx
    labels:
      monitor.name: "My App"       # custom display name
      monitor.ignore: "true"       # exclude from dashboard
```

---

## Architecture

```
[Your server]                     [Same server or StackWatch Cloud]
  agent container                   backend (Fastify + SQLite)
  - Docker socket listener     →    POST /metrics  (Bearer token)
  - HTTP/TCP/SSL/disk/exec checks   GET  /stream   (SSE → frontend)
  - config.yml watcher              GET  /services/:id/uptime
  - reports every 30s               GET/POST /settings
                                  frontend (React + Vite)
                                    - live dashboard
                                    - uptime history bars
                                    - settings page
```

---

## Development

```bash
# Install dependencies
cd agent    && npm install
cd backend  && npm install
cd frontend && npm install

# Run each service (separate terminals)
cd backend  && npm run dev   # :4000
cd frontend && npm run dev   # :3000
cd agent    && npm run dev   # connects to :4000

# Tests
cd agent   && npm test
cd backend && npm test
```

---

## Agent-only install (hosted tier)

If you use a hosted backend, run only the agent on your server:

```bash
curl -sSL https://raw.githubusercontent.com/igorzubov/container-monitor/main/install.sh | bash
```

You'll be prompted for your `AGENT_TOKEN` from the dashboard.

Or with a one-liner:

```bash
AGENT_TOKEN=your-token BACKEND_URL=https://your-backend.com \
  bash <(curl -sSL .../install.sh)
```

---

## Roadmap

| Phase | Status |
|-------|--------|
| Phase 1 — Docker autodiscovery, metrics, SSE dashboard | ✅ Done |
| Phase 2 — Custom checks, uptime bars, settings UI | ✅ Done |
| Phase 3 — User accounts, Stripe $3/mo, install script | ✅ Done |
| Hosted-tier onboarding UI | ⏸ Deferred |
| Public status pages | 🔜 Phase 4 |
| Response time graphs | 🔜 Phase 4 |

---

## License

MIT
