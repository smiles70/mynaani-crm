# Intake — Retell inbound webhook → CRM contact ingestion

**Date:** 2026-09-18
**Status:** in progress
**Process:** v9.51 pipeline; research in
`.ai/research/2026-09-18-automation-assessment.md` (Lane 1/L3,
edge cases 1–5, 10–11, 21, 25–26, 30)

## Problem statement

Every partner touchpoint must land in the CRM. Voice calls to
1 877 409-4144 and Retell chat conversations currently never reach
it — Retell is disconnected from the CRM. Retell pushes
`call_started/ended/analyzed` and `chat_started/ended/analyzed`
webhooks; nothing receives them.

## Required state

- `POST /api/retell/webhook` accepts Retell events, verifies
  `x-retell-signature` (HMAC-SHA256 over raw body + timestamp, API
  key, 5-minute replay window), returns 401 on bad signature.
- `call_ended`/`call_analyzed`/`chat_ended`/`chat_analyzed` file a
  Contact when the caller is identifiable (phone for voice; email /
  collected variables / metadata for chat), write an Activity NOTE
  with the transcript summary, and fire `agent.contactCreated` so
  eve identifies them.
- Idempotent: dedupe on `event` + `call_id`/`chat_id` (Retell retries
  ×3, manual reruns) — a processed-event row, unique key.
- Payload parsed at the boundary into a domain type in
  `packages/validation` — never `Record<string, unknown>` inside.
- Filing is deterministic (no intelligence in the API) — mirrors
  `TrackingFilingService` judgement: normalize, suppression check,
  find-or-create, trigger.
- Optional: missing `RETELL_API_KEY` (webhook-enabled key) removes
  the capability; endpoint 503s, never throws at boot.
- Acceptance: signed test `call_ended` payload files a contact with
  the call transcript as a note; replayed event is a no-op.

## Decisions

- Endpoint on the API (`apps/api/src/retell/`), not the agent —
  intelligence rule is about enrichment/decisions; verification,
  dedupe and filing are plumbing.
- Contact matching: email first, then phone (voice callers rarely
  give email mid-call — phone is the reliable key for voice).
- Transcript stored as Activity NOTE excerpt + Retell `call_id`,
  not raw audio (PII minimization — memo edge case 5).

## Edge cases (from memo)

- Inactivity-timeout chats never fire `chat_analyzed` → file on
  `chat_ended` transcript. (Retell platform gap, confirmed upstream.)
- 10s webhook timeout → accept, write event row + task, return 204.
- Same person calls + submits form → find-or-create by email/phone
  dedupes against the form-filed contact.
- Missing signature header / wrong key → 401, no write.
- Replay older than 5 min → 401 (signature window).
- Voice caller with no contact info in transcript → still file by
  phone; eve's identify task enriches.
- `RETELL_API_KEY` absent → endpoint returns 503 (capability off).

## Out of scope

- `submit_partner_inquiry` mid-call tool → p17 (same signature
  scheme, separate endpoint semantics).
- Outbound calling → p18.
