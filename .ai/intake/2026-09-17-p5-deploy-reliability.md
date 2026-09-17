# Intake — Bulletproof builds and deploys (retroactive)

**Date:** 2026-09-17
**Status:** implemented — intake filed after the fact; logged as a
process violation in the session audit
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Parent intake:** `2026-09-16-p1-fork-bootstrap.md`

## Problem statement

Builds and deploys must be boring: infrastructure as code, gated
cutovers, migrations outside the serving path, CI proving the image
before deploy, and smoke checks after it. The pipeline shipped before
this intake existed — this file restores the trace.

## What shipped

- `.railway/railway.ts` IaC for the whole project; `railway config
  plan` is clean against both environments.
- api `preDeployCommand` runs `entrypoint.sh migrate`; in-band
  migration removed from the api start path.
- Healthchecks gate cutover (api `/health`, app `/api/auth/ok`, 300s),
  20s SIGTERM drain, restart policies explicit.
- `Dockerfile`: Next.js under Node 24, telemetry disabled.
- `tools/deploy-smoke.sh` — four checks per environment.
- CI `docker` job builds the image on every PR/push.
- Official `use-railway` agent skill installed.

## Process violation recorded

Implementation preceded intake and research. The research section of
`2026-09-16-railway-deploy.md` covers vendor mechanics post-hoc.
Remediation: this intake + the audit entry in the session log.
