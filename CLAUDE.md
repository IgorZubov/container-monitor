# StackWatch — Self-Hosted Infrastructure Monitor

## Project Overview

StackWatch is a lightweight infrastructure monitoring tool for solo developers and indie hackers running self-hosted stacks. It consists of a **lightweight agent** that runs on the user's VPS and a **central backend + dashboard** (hosted SaaS tier) or a **full self-hosted bundle** (free tier).

Key value prop: deploy one Docker container, get a dashboard of all your running services in 30 seconds. No YAML required to start.

---

## Architecture

```
[User's VPS]                        [StackWatch Cloud / or local]
  Agent container                     Backend (Fastify + Node.js)
  - Docker socket listener             - Receives metrics via REST
  - HTTP/TCP/SSL checks                - Stores in SQLite → PostgreSQL
  - config.yml watcher                 - Sends alerts
  - Sends metrics every 30s          Frontend (React + TypeScript)
                                       - Real-time dashboard via SSE
                                       - dashboard.stackwatch.dev
```

### Tiers
- **Self-hosted (free):** agent + backend + frontend in one `docker-compose.yml`
- **Hosted ($3/mo):** user runs only the agent; dashboard lives on your server

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Agent | Node.js (TypeScript) |
| Backend | Node.js + Fastify |
| Database | SQLite for MVP → PostgreSQL for prod |
| Frontend | React + TypeScript + Vite |
| Real-time | SSE (Server-Sent Events) |
| Auth | Token-based (agent token per user) |
| Alerts | Telegram bot + Email + Webhook |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
stackwatch/
├── agent/                  # Lightweight agent (runs on user's server)
│   ├── src/
│   │   ├── collectors/     # docker.ts, http.ts, tcp.ts, ssl.ts, disk.ts
│   │   ├── config.ts       # config.yml parser + file watcher
│   │   ├── events.ts       # Docker event stream listener
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── backend/                # Central server
│   ├── src/
│   │   ├── routes/         # metrics.ts, auth.ts, alerts.ts
│   │   ├── db/             # schema + queries
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Dashboard
│   ├── src/
│   │   ├── components/     # ServiceCard, StatusBadge, Timeline
│   │   ├── pages/          # Dashboard, Settings, Alerts
│   │   └── main.tsx
│   └── package.json
├── docker-compose.yml      # Self-hosted full bundle
├── docker-compose.agent.yml # Agent-only (hosted tier)
└── CLAUDE.md
```

---

## Core Features (MVP)

### Agent
- [ ] Docker socket listener — auto-discover all running containers
- [ ] Filter short-lived containers (ignore if uptime < 5 min)
- [ ] Docker label support: `monitor.ignore=true`, `monitor.name=My App`
- [ ] Docker event stream — detect new containers in real time
- [ ] HTTP check (status code + response time)
- [ ] TCP check (port open)
- [ ] SSL expiry check (warn N days before)
- [ ] Disk usage check
- [ ] Exec check (run command, check output)
- [ ] `config.yml` optional layer — custom checks, no restart needed
- [ ] POST metrics to backend every 30s

### Backend
- [ ] Accept metrics from agent (token auth)
- [ ] Store service history (SQLite for MVP)
- [ ] SSE endpoint for real-time dashboard updates
- [ ] Detect status changes (up → down, down → up)
- [ ] Trigger alerts on status change
- [ ] Telegram alert integration
- [ ] Email alert integration
- [ ] Webhook alert integration

### Frontend
- [ ] Dashboard: list of services with status badges
- [ ] Auto-built from agent data — no manual config needed
- [ ] Color coding: green / yellow (warning) / red (down)
- [ ] SSL expiry warnings inline
- [ ] Uptime % per service (last 24h, 7d, 30d)
- [ ] Last seen / last changed timestamps
- [ ] Settings page: alert channels, thresholds

---

## config.yml Format (optional, for custom checks)

```yaml
checks:
  - name: "Matrix Federation"
    type: http
    url: "https://matrix.example.com/_matrix/federation/v1/version"
    expect_status: 200
    interval: 60s

  - name: "MongoDB"
    type: tcp
    host: localhost
    port: 27017

  - name: "SSL Certificate"
    type: ssl
    domain: example.com
    warn_days_before: 14

  - name: "Disk /"
    type: disk
    path: /
    warn_threshold: 80
    critical_threshold: 90

  - name: "Caddy running"
    type: exec
    command: "systemctl is-active caddy"
    expect_output: "active"
```

---

## Implementation Rules for Claude Code

### ⚠️ CHANGE SIZE LIMITS — ALWAYS FOLLOW THESE

These rules exist to avoid hitting API token limits and losing work mid-task.

1. **Max 100 lines changed per task.** If a task requires more, split it into subtasks before starting.
2. **One file per task.** Do not modify multiple files in one response unless they are trivially small (< 10 lines each).
3. **No full file rewrites.** Use targeted edits. If more than 60% of a file needs to change, stop and ask for confirmation first.
4. **New files: max 120 lines.** If a new file would exceed this, scaffold it with TODOs and implement in follow-up tasks.
5. **After each task, summarize** what was done and what the next concrete step is.

### Code Style
- TypeScript everywhere, strict mode
- Async/await, no callbacks
- Named exports preferred over default exports
- Error handling: never swallow errors silently, always log with context
- Environment variables via `.env`, never hardcoded

### Git Discipline
- One commit per feature/fix
- Commit message format: `feat(agent): add Docker event stream listener`
- Never commit `.env` files

### Testing
- Each collector (http, tcp, ssl, disk, exec) must have a unit test
- Backend routes must have integration tests
- Use Vitest

---

## MVP Build Order

Implement in this exact order to have something runnable as fast as possible:

1. `agent/src/collectors/docker.ts` — Docker socket, list containers
2. `agent/src/events.ts` — Docker event stream (new containers)
3. `agent/src/index.ts` — main loop, POST to backend
4. `backend/src/db/schema.ts` — SQLite schema (services, metrics, alerts)
5. `backend/src/routes/metrics.ts` — accept POST from agent
6. `backend/src/routes/sse.ts` — SSE stream for frontend
7. `frontend/src/components/ServiceCard.tsx` — single service status card
8. `frontend/src/pages/Dashboard.tsx` — SSE consumer, renders cards
9. `agent/src/collectors/http.ts` — HTTP checks
10. `agent/src/collectors/ssl.ts` — SSL expiry
11. `agent/src/config.ts` — config.yml parser + watcher
12. `backend/src/routes/alerts.ts` — Telegram webhook alert
13. `docker-compose.yml` — full self-hosted bundle

---

## Environment Variables

### Agent
```env
BACKEND_URL=http://localhost:4000
AGENT_TOKEN=your-secret-token
POLL_INTERVAL=30000
CONFIG_PATH=/etc/stackwatch/config.yml
```

### Backend
```env
DATABASE_URL=./data/stackwatch.db
JWT_SECRET=changeme
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
PORT=4000
```

---

## Out of Scope for MVP

- Multi-user accounts / teams
- Historical graphs / time series visualization
- Mobile app
- Windows support
- Kubernetes / Swarm support
- Paid billing integration (Stripe)
