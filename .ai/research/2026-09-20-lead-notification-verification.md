# Research memo — lead notification pipeline verification

**Date:** 2026-09-20 · **Process:** v9.51, proportionate scope —
defect-ticket verification memo (codebase + live-infra checks), not a
technology decision; the 20-source gather does not apply per
AGENTS.md defect fast-path.
**Feeds:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`,
PS-CRM-001/002/003.

## Method

1. Railway GraphQL API + CLI against project `mynaani-crm` (production):
   service inventory, env-var name listing per service.
2. Full-text grep of this repo (excluding node_modules) for
   `rocketchat`, mail providers, and notification paths.
3. Pipeline trace in `apps/api/src/tracking/` +
   `apps/api/src/agent/agent-trigger.service.ts`.
4. Live ingest probe: `POST /api/t/e` on `mynaani-crm.up.railway.app`
   returned 204.

## Findings

- `form_submit` → stored submission → `TrackingFilingService.file` →
  Contact → `agent.contactCreated` AgentTask (`kind:"identify"`).
  Filing is the single funnel; dedupe via `dedupeKey`; refusals keep a
  `skipReason` row.
- `ROCKETCHAT_WEBHOOK_URL` set on Railway `agent` service; **zero repo
  references**. Dead config — never fired.
- No outbound-mail capability: no `resend`/`nodemailer`/`sendgrid`/
  `postmark`/`smtp` dep in any `package.json`; mailbox pipeline is
  inbound-only (`cron-mailboxes`, `mailbox/participants.ts`).
- Agent action registry (`apps/agent/agent/lib/agent-actions.ts`) maps
  `SLACK_MESSAGE_POST` → `post_slack_message` tool — the pattern a
  RocketChat action would follow.
- `rocketchat-prod` runs as a service in the same Railway project;
  `RAILWAY_SERVICE_ROCKETCHAT_PROD_URL` is present on api/app/agent —
  standalone, unrelated to n8n.
- Webhook URL liveness not probed (writes to a live channel; left for
  a deliberate test — PS-CRM-003).

## Conflicts / constraints

- AGENTS.md: "intelligence lives in `apps/agent`" — notification
  *transport* is plumbing; recommend deterministic notify at filing,
  not an agent decision.
- Missing env capability must degrade silently (capabilities pattern).
