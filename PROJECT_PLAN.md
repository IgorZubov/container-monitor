# StackWatch — Project Plan

## Phase 1: MVP (Week 1–2)
Goal: one Docker command → dashboard shows all containers

### Milestone 1.1 — Agent Core
- Docker socket integration (list running containers)
- Docker event stream (real-time new container detection)
- Label-based filtering (`monitor.ignore`, `monitor.name`)
- POST metrics to backend every 30s

### Milestone 1.2 — Backend Core
- SQLite schema: services, metrics, status_history
- POST /metrics endpoint (token auth)
- SSE /stream endpoint (real-time push to frontend)
- Status change detection (triggers alerts)

### Milestone 1.3 — Frontend Core
- Dashboard page: service cards (name, status, uptime %)
- SSE consumer — live updates, no polling
- Status badges: green / yellow / red
- SSL expiry warning inline on card

### Milestone 1.4 — Basic Alerts
- Telegram bot alert (down + recovery)
- Simple email via SMTP

### Milestone 1.5 — Docker Packaging
- `docker-compose.yml` — full self-hosted bundle
- `docker-compose.agent.yml` — agent only (hosted tier)
- README with 3-step quickstart

**Exit criteria:** deploy on own VPS, see Matrix + MongoDB + Caddy on dashboard automatically, get Telegram ping when a container stops.

---

## Phase 2: Custom Checks + Polish (Week 3–4)
Goal: config.yml layer, settings UI, first beta users

- `config.yml` parser + hot reload (no agent restart)
- Check types: HTTP, TCP, SSL, Disk, Exec
- Settings page: alert channels, check intervals, thresholds
- Webhook alert (Discord / Slack / ntfy.sh)
- Uptime history: 24h / 7d / 30d bars (like GitHub contributions)
- Basic onboarding flow for hosted tier (token generation)

---

## Phase 3: Hosted Tier (Week 5–6)
Goal: someone can sign up and pay $3/month

- User accounts (email + password, or magic link)
- Multi-agent support (one user, multiple VPS)
- Stripe integration ($3/mo)
- dashboard.stackwatch.dev deployment
- Agent install script: `curl -sSL install.stackwatch.dev | bash`

---

## Phase 4: Growth (Ongoing)
- Public status page per user (share.stackwatch.dev/username)
- Response time graphs
- Incident timeline
- API for power users
- Self-hosted license key (one-time purchase option)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Docker socket security concerns | Document clearly; offer rootless Docker mode |
| SQLite not scaling for hosted | Schema designed for PostgreSQL from day one, SQLite just for MVP |
| Competition from Uptime Kuma | Hosted tier + zero-config autodiscovery is the diff |
| Low willingness to pay | Validate with landing page + waitlist before building Phase 3 |

---

## Validation Checkpoints

- **Before Phase 2:** Post on r/selfhosted, get 10 people to try MVP
- **Before Phase 3:** Get 5 people to say they'd pay $3/month
- **Before scaling:** 20 paying users
