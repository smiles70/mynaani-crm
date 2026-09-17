# Research — Deploying the mynaani-crm fork on Railway

**Date:** 2026-09-16
**Intake:** `2026-09-16-p1-fork-bootstrap.md` (scope item 3),
`2026-09-16-p2-debrand-rebrand-mynaani.md`
**Process:** v9.51 research-before-options gate

## Sources

| Org | Type | Finding |
| --- | --- | --- |
| Railway | Template (`comp-ai-crm`, hmseeb) | 5-service topology proven: `app` (public, health `/api/auth/ok`), `api` (health `/health`), `agent`, `cron`, Postgres 17. One image `ghcr.io/hmseeb/comp-ai-crm-railway:1.13.0-r1`, four `entrypoint.sh` modes. Third-party image — p1 intake bars it on supply-chain grounds. |
| Railway | Template (`comp-ai-crm-aug-26`) | Single-service variant: one service builds from `trycompai/crm` source, start `cd apps/api && bun src/main.ts & cd apps/app && bun run start`, plus Postgres. Proves Railpack builds this repo from source. |
| This repo | `docker-compose.yml` | Postgres 17-alpine only. No app services — dev tooling, not a deploy spec. |
| This repo | `apps/api/vercel.json` | 5 cron routes the API serves: `/internal/sync/mailboxes` (*/5m), `/internal/sync/rates` (06:00), `/internal/telemetry/rollup` (07:00), `/internal/tracking/retention` (04:00), `/internal/archive/prune` (05:00). On Vercel they are crons; on Railway they need a scheduler. All guarded by `CRON_SECRET` bearer (≥16 chars). |
| This repo | `apps/api/src/config/env.validation.ts` | Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32), `ALLOWED_SIGN_IN`. Everything else optional — missing keys remove capabilities, never throw. |
| This repo | `apps/api/src/main.ts`, `apps/agent/scripts/start.ts` | Ports: api `PORT` (default 3001), agent `AGENT_PORT`/`PORT` (default 2000), app `next start` `PORT` (default 3000). Railway injects `PORT` per service — no collision across services. |
| This repo | package.json scripts | Build contracts: api `bun build src/main.ts --target=bun` → `bun dist/main.js`; app `next build` → `next start`; agent `bun scripts/start.ts` → `eve start --port`. tRPC codegen (`trpc:generate`) writes `apps/api/src/generated` — must run before api build. |
| This repo | search: `VERCEL_ENV|@vercel/` | Vercel couplings are all optional or Vercel-only: `build-func.mjs` (Vercel build path, skip on Railway), `BLOB_READ_WRITE_TOKEN` (optional image store — hotlink fallback), `AI_GATEWAY_API_KEY` (agent model access — set directly), Vercel Sandbox (agent sandbox, Docker/microsand fallback per README). Nothing blocks a non-Vercel deploy. |
| Railway docs | Product behaviour | Railway builds a GitHub repo per service via Railpack; `PORT` is injected; private networking gives services `*.railway.internal` DNS; cron services run a command on a schedule instead of staying up. |

## Options

### A — Repo source per service (Railpack), 5 services

Each Railway service points at `smiles70/mynaani-crm` with its own
build/start command. No image registry involved. Closest to the
aug-26 template's mechanics, but with the hmseeb topology.

- app: `cd apps/app && bun run build && bun run start` — needs
  `NEXT_PUBLIC_API_URL`, `APP_URL`, `API_URL` at build time.
- api: `cd apps/api && bun run trpc:generate && bun run build && bun run start:prod`.
- agent: `cd apps/agent && bun scripts/start.ts` — `AGENT_URL` for api/app
  uses private DNS `http://agent.railway.internal:2000`.
- cron: Railway cron service, `curl` each `/internal/*` route with
  `Authorization: Bearer $CRON_SECRET` on its schedule.
- Postgres 17 from the marketplace.

Build runs per service — three redundant monorepo installs, slower
deploys, but zero new files in the repo.

### B — One Dockerfile, one image, four service modes

Add `Dockerfile` + `entrypoint.sh` at root (a new-file seam, cheap for
upstream merges). Railway's Docker builder builds it once per service;
each service runs `entrypoint.sh app|api|agent|cron`. Mirrors the
proven hmseeb topology with our own image — exactly what p1 intake
asked for.

Costs: the Dockerfile must replicate the bun workspace install,
tRPC codegen, `next build`, and `eve build`. Untestable locally — no
bun, no docker on this machine. First real build happens on Railway.

### C — Single combined service (aug-26 shape)

One service running api+app together, plus Postgres. Fewest moving
parts, but the agent becomes a second service anyway, cron still needs
a third, and two servers share one `PORT` injection — needs a wrapper
script. Simplest deploy, least faithful to the proven topology.

## Recommendation

**Option B** — Dockerfile + entrypoint seam. It matches the intake
decision ("own image built from this repo"), replicates a topology
already proven on Railway for this exact codebase, and keeps all
deploy logic in two new files.

Option A is the fallback if the Dockerfile proves fragile — it trades
repo artifacts for slower builds and Railway-side command config.

## Pre-deploy checklist (env)

Required on every app-facing service: `DATABASE_URL` (Railway Postgres
reference), `BETTER_AUTH_SECRET` (generate), `ALLOWED_SIGN_IN` (the two
emails — open item from p1), `APP_URL`, `API_URL`,
`NEXT_PUBLIC_API_URL`, `AGENT_URL` (private DNS), `AGENT_BRIDGE_SECRET`
(generate), `CRON_SECRET` (generate), `CRM_TELEMETRY_DISABLED=1`
(fork — do not report to upstream's PostHog), `DO_NOT_TRACK=1`.

OAuth (`GOOGLE_CLIENT_ID/SECRET` or Microsoft pair) needed before
sign-in works — open item, blocks UAT of anything past the sign-in
page.

## Deployed topology (2026-09-17)

Project `mynaani-crm` (id `06d3b4d7-19b4-48fc-9dbb-04a8e1c93b4f`),
workspace `smiles70's Projects`. One image from root `Dockerfile` +
`docker-entrypoint.sh` modes; services deployed via `railway up`.

- production: app `mynaani-crm.up.railway.app`, api
  `mynaani-crm-api.up.railway.app`, agent (private
  `agent.railway.internal:2000`), `cron-mailboxes` (*/5m),
  `cron-daily` (04:30), Postgres 18.
- staging (env `staging`, id `82e6bf6b-c135-490e-859b-33c80dcad87f`):
  same services, own Postgres instance, app
  `mynaani-crm-staging.up.railway.app`, api
  `mynaani-crm-staging-api.up.railway.app`.

Promotion practice: `railway up -s <service> -e staging`, verify with
`tools/deploy-smoke.sh staging`, then `railway up -s <service> -e
production` plus `tools/deploy-smoke.sh production`. Production
deploys still require explicit human permission per
`PROCESS_AGENTS.md`.

## Reliability layer (2026-09-17)

- IaC: `.railway/railway.ts` describes every service, schedule, domain
  config, healthcheck, and variable binding. `railway config plan`
  must show a clean diff; drift is caught by plan, not by outage.
  SDK lives in `.railway/` (`bun install` there), node_modules
  gitignored.
- Migrations run as api `preDeployCommand`, not in-band at boot. A
  failed migration blocks the deploy; the old version keeps serving.
- Healthchecks gate cutover: api `/health`, app `/api/auth/ok`,
  300s timeout, 20s SIGTERM drain before SIGKILL.
- Build: `next build`/`next start` run under Node 24 inside the bun
  image (Bun-as-node crashes on Next's compiled server modules — SIGILL).
- CI: `.github/workflows/ci.yml` `docker` job builds the deploy image
  on every PR and push — build breakage is caught before deploy.
- Official `use-railway` agent skill installed (`railway skills
  install`).

## Risks

- `eve start` on Railway — the agent's schedules run under `eve start`
  (docs/setup.md confirms), so the agent service covers dispatch;
  cron service only covers the API's `/internal/*` routes.
- Health checks: app `/api/auth/ok`, api `/health`, agent `GET
  /eve/v1/info` (per docs/setup.md).
- The agent's model needs `AI_GATEWAY_API_KEY` or a provider key —
  open item from p1. Agent boots without it; research capability
  degrades, nothing throws.
- No local build verification possible (no bun/docker here). First
  build signal comes from Railway deploy logs.
