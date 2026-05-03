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
| Auth | JWT (user sessions) + Bearer token (agent→backend) |
| Alerts | Telegram bot + Webhook |
| Payments | Stripe (Phase 3) |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
stackwatch/
├── agent/                  # Lightweight agent (runs on user's server)
│   ├── src/
│   │   ├── collectors/     # docker.ts, http.ts, tcp.ts, ssl.ts, disk.ts, exec.ts
│   │   ├── config.ts       # config.yml parser + file watcher
│   │   ├── events.ts       # Docker event stream listener
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── backend/                # Central server
│   ├── src/
│   │   ├── routes/         # metrics.ts, sse.ts, alerts.ts, settings.ts, uptime.ts
│   │   │                   # auth.ts (Phase 3), stripe.ts (Phase 3)
│   │   ├── db/             # schema.ts
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Dashboard
│   ├── src/
│   │   ├── components/     # ServiceCard.tsx, UptimeBar.tsx
│   │   ├── pages/          # Dashboard.tsx, Settings.tsx
│   │   │                   # Login.tsx, Register.tsx (Phase 3)
│   │   └── main.tsx
│   └── package.json
├── install.sh              # Agent install script (Phase 3)
├── docker-compose.yml      # Self-hosted full bundle
├── docker-compose.agent.yml # Agent-only (hosted tier)
└── CLAUDE.md
```

---

## Phase Status

### ✅ Phase 1 — MVP (complete)

#### Agent
- [x] Docker socket listener — auto-discover all running containers
- [x] Filter short-lived containers (ignore if uptime < 5 min)
- [x] Docker label support: `monitor.ignore=true`, `monitor.name=My App`
- [x] Docker event stream — detect new containers in real time
- [x] HTTP check (status code + response time)
- [x] TCP check (port open)
- [x] SSL expiry check (warn N days before)
- [x] Disk usage check
- [x] Exec check (run command, check output)
- [x] `config.yml` optional layer — custom checks, no restart needed
- [x] POST metrics to backend every 30s

#### Backend
- [x] Accept metrics from agent (token auth)
- [x] Store service history (SQLite)
- [x] SSE endpoint for real-time dashboard updates
- [x] Detect status changes (up → down, down → up)
- [x] Trigger alerts on status change
- [x] Telegram alert integration
- [x] Webhook alert integration (Discord / Slack / ntfy.sh)

#### Frontend
- [x] Dashboard: list of services with status badges
- [x] Auto-built from agent data — no manual config needed
- [x] Color coding: green / yellow (warning) / red (down)
- [x] SSL expiry warnings inline
- [x] Uptime % per service (last 24h, 7d, 30d)
- [x] Last seen / last changed timestamps
- [x] Settings page: alert channels, thresholds

---

### ✅ Phase 2 — Custom Checks + Polish (complete)

- [x] TCP, Disk, Exec collectors + unit tests
- [x] `config.yml` parser + hot reload
- [x] Uptime history: 24h / 7d / 30d bars per service card
- [x] Settings page: Telegram, webhook URL, poll interval, SSL/disk thresholds
- [x] Webhook alert (Discord / Slack / ntfy.sh)
- [ ] **⏸ DEFERRED: Basic onboarding flow for hosted tier (token generation UI)**
      Reason: skipping until Phase 3 user accounts are in place — token generation
      belongs in the post-signup flow, not as a standalone page.

---

### 🚧 Phase 3 — Hosted Tier (in progress)

Goal: someone can sign up and pay $3/month.

- [ ] User accounts — `POST /auth/register`, `POST /auth/login` (email + bcrypt password, JWT session)
- [ ] Per-user agent tokens — `agent_tokens` table; metrics route validates token → resolves user
- [ ] Multi-agent support — agents table tied to user; dashboard scoped per user
- [ ] Stripe integration — `POST /stripe/checkout`, webhook handler for subscription lifecycle
- [ ] Frontend: Login + Register pages, auth-gated dashboard
- [ ] Agent install script (`install.sh`) — `curl -sSL ... | bash`
- [ ] **⏸ DEFERRED: dashboard.stackwatch.dev production deployment config**

#### Phase 3 Build Order
1. `backend/src/db/schema.ts` — add `users`, `agent_tokens`, `agents` tables
2. `backend/src/routes/auth.ts` — register + login (bcrypt + JWT)
3. `backend/src/routes/metrics.ts` — update token validation to use `agent_tokens` table
4. `backend/src/routes/stripe.ts` — checkout session + webhook
5. `frontend/src/pages/Login.tsx` + `Register.tsx`
6. `frontend/src/main.tsx` — auth-gate: redirect to login if no JWT
7. `install.sh` — curl-pipe agent installer

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
PORT=4000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

---

## Out of Scope (still)

- Multi-user teams / org accounts
- Historical time-series graphs
- Mobile app
- Windows support
- Kubernetes / Swarm support
