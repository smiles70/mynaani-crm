# Jev typed-gate — lead-notification deployment (PS-CRM-001…007)

**Date:** 2026-09-21 · **Model:** jev-1.13.0 · **Usage:** 1,085 in / 307 out tokens (~$0.0004)
**Subject:** the `mynaani`→`release` production deployment (commit `d81bdd1`) —
LeadNotifyService per-recipient Resend sends, `contact.alertedAt` column +
backfill migration, `sweepNewContactAlerts` rewrite, env wiring.
**Raw payload:** `/tmp/jev-gate.json` (question pack) · response below.

## Answers vs policy (auto | review | escalate)

| # | Question (noul) | p | Reading |
|---|-----------------|---|---------|
| q1 | CompAI `/api/t/e` ingest preserved | 0.95 | auto — verified live (204 + filed) |
| q2 | Retell signature check preserved | 0.95 | auto — verified live (401 unsigned) |
| q3 | Deduped redelivery can't double-notify | 0.66 | review → resolved: empirically tested (`does not notify again for a deduped redelivery` — pass) |
| q4 | Failed email blocks filing | 0.04 | auto — notify is fire-and-forget |
| q5 | Exactly-once alerting across restarts | 0.43 | review → **correct hedge: it is at-least-once.** Post→stamp ordering means a crash between a successful post and the stamp write re-posts. Accepted design trade-off; no crash-free exactly-once without webhook-side dedupe |
| q6 | Alerts on non-inbound sources | 0.06 | auto — `source IN (TRACKING, RETELL)` |
| q7 | Migration deletes/breaks data | 0.03 | auto — additive column + backfill only |
| q8 | One rejected recipient can't cancel others | 0.92 | auto — tested |
| q9 | New unauthenticated surface | 0.12 | auto — no new endpoints |
| q10 | Backfill re-alerts existing contacts | 0.27 | auto — backfill stamps ⇒ sweep skips |
| q11 | Missing config crashes anything | 0.06 | auto — silent-off verified |
| q12 | Notification stays in API, not agent | 0.86 | auto — boundary respected |
| q13 | choice: where does email logic live | api-service (conf 1.0) | correct |
| q14 | choice: webhook unset behaviour | silent-off (conf 0.82) | correct |
| q15 | score: deployment safety | 1.39 / "needs-review→safe" | triage hedge — see below |

## Triage verdict

Two flagged hedges, both addressed: q3 resolved by the passing dedupe
test; q5's hedge is *technically correct* — the stamp-after-post design is
at-least-once (a crash between post and stamp can duplicate one message).
Duplicate-post risk is a one-message channel noise event, not data
corruption; the alternative (stamp-before-post) silently *loses* alerts.
Chosen ordering is the right one. No items escalate to human.
