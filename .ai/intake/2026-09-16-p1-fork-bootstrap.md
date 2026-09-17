# Intake — Fork bootstrap: mynaani-crm (adapted Comp AI CRM)

**Date:** 2026-09-16
**Status:** in progress
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Source research:** `/home/h/mynaani/Noni/.ai/research/2026-09-16-compai-crm-retell-capture.md`

## Problem statement

Mynaani needs an internal CRM that captures every partner touchpoint —
`/partners` and `/for-communities` form submissions, Retell voice calls
(1 877 409-4144), Retell chat conversations, and the
`submit_partner_inquiry` agent tool call — viewable by exactly two
internal users, white-labeled with the mynaani logo, hosted on Railway.

## Decision already made (upstream research)

- Fork `trycompai/crm` — MIT license, single-tenant by design,
  `ALLOWED_SIGN_IN` allow-list = the two-user requirement natively.
- Deploy on Railway — community template proves the 5-service topology
  (Next.js app, NestJS API, eve agent, mailbox-sync job, Postgres).
- Own workspace — Bun/TypeScript stack differs from Noni's
  Python/FastAPI; internal tool outside the geragogy contract.

## Scope

1. White-label: workspace name `mynaani`, logo swap, remove Comp AI
   branding from sign-in/shell.
2. Two users via `ALLOWED_SIGN_IN` (emails TBD by owner).
3. Railway deploy — own image built from this repo (not the
   third-party `hmseeb/` image; supply-chain rule from the memo).
4. De-couple Vercel-bound services: Vercel Sandbox → Docker;
   Vercel AI Gateway → provider key (Anthropic); Vercel Blob optional.
5. Intake path: Noni backend `POST /api/v1/site/retell/events` +
   partner-inquiry forwarding → this CRM's API (tRPC/`/rest` bridge).

## Edge cases (top, from the memo)

- Webhook replays → idempotency on `call_id`/`chat_id`.
- `call_analyzed` + `call_ended` both fire → capture on `call_analyzed`
  only.
- CRM down → Noni DB remains system of record; forward async.
- PII posture → Retell `everything_except_pii`; don't store raw
  transcripts by default.
- Two-user lockout → Better Auth last-owner invariant; never demote.

## Open items

- GitHub remote (`smiles70/mynaani-crm`) — token lacks fork/repo-create
  scope; owner creates the repo or grants permission, then push.
- The two `ALLOWED_SIGN_IN` emails.
- Model-provider key for the agent (Anthropic).
