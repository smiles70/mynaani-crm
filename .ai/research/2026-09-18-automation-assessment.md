# Research (pre-intake) — Automation capability assessment

**Date:** 2026-09-18
**Requested as:** triple-deep × triple-wide pre-intake survey
**Question:** What automation does the mynaani.com stack (Retell ×
Mynaani CRM × Railway) already enable, what is still open, and what
changes if RocketChat joins?

## Sources

| # | Source | Type | Finding |
| --- | --- | --- | --- |
| 1 | docs.retellai.com/features/webhook-overview | Retell docs | Voice webhooks: `call_started/ended/analyzed`, `transcript_updated`, 4 transfer events; chat: `chat_started/ended/analyzed`. Dedupe key = event+id. 10s timeout, 3 retries |
| 2 | docs.retellai.com/api-references/create-chat-agent | Retell API | Per-agent `webhook_url` + `webhook_events`; `data_storage_setting` incl. PII modes |
| 3 | docs.retellai.com/deploy/outbound-call | Retell docs | `createPhoneCall` outbound: from/to, per-call agent overrides, `retell_llm_dynamic_variables` prompt injection, `metadata` for CRM linkage, `custom_sip_headers` |
| 4 | retell-python-sdk batch_call types | Retell SDK | `BatchCall`: task list, `call_time_window` (allowed calling hours by tz), `reserved_concurrency`, `trigger_timestamp` scheduling |
| 5 | community.retellai.com auto-close report | Retell forum | **Gotcha:** inactivity-timeout chats don't run analysis/`chat_analyzed` — rely on `chat_ended` for transcript capture |
| 6 | docs.rocket.chat omnichannel | RC docs | Omnichannel: livechat widget, departments, business hours, SLA, canned responses, WhatsApp/SMS/Telegram apps |
| 7 | docs.rocket.chat/docs/webhooks | RC docs | Omnichannel webhooks → CRM: Chat Start/Close/Taken/Queued/Offline/Visitor+Agent messages; secret token header; 10 retries |
| 8 | developer.rocket.chat omnichannel-api | RC API | Full REST: visitors, rooms, agents, triggers, custom fields, transcripts, analytics |
| 9 | Rocket.Chat self-host requirements | RC docs | Node app + **MongoDB** (required) + optional Redis — real stateful footprint |
| 10 | docs/tracking.md | this repo | Form→contact pipeline live: collector, dedupe, filing, `agent.contactCreated` task |
| 11 | docs/agent.md | this repo | eve agent: task dispatch (`meeting/identify/sweep/companyProfile/recheck`), mailbox read, enrichment queue, backfill |
| 12 | docs/connections.md | this repo | Slack + Google/Microsoft mailbox sync surfaces; intake endpoint pattern |
| 13 | docker-entrypoint.sh + .railway/railway.ts | this repo | Cron services already on Railway: `sync/mailboxes` every 5min, daily rollup/retention — the scheduling surface exists |
| 14 | Railway private networking docs | Railway | `*.railway.internal` — services call each other without public egress (API↔agent already does) |
| 15 | Retell `submit_partner_inquiry` tool (retell-mynaani) | sibling repo | Mid-call structured intake tool call — the "during the call" seam |
| 16 | mynaani-crm contacts/deals schema | this repo | Contact, Company, Deal + notes — targets for automated writes |
| 17 | OWASP webhook verification | security | HMAC/secret-token verification on inbound webhooks — Retell signs, RC sends `X-RocketChat-Livechat-Token` |
| 18 | NIST SSDF — data minimization | security | Retell `data_storage_setting` PII modes vs full transcripts into CRM — choose deliberately |
| 19 | Railway service templates (MongoDB) | Railway | MongoDB deployable as a Railway service — RocketChat's hard dependency |
| 20 | HN/lobsters on self-hosting chat | discussion | Chat self-hosting ops tax: MongoDB backups, version upgrades, websocket scaling — real but bounded at 2 users |

## The automation map — three lanes deep

### Lane 1 — Retell → CRM (the voice/chat pipeline)

| Depth | Opportunity | Mechanism | Status |
| --- | --- | --- | --- |
| L1 capture | Call/chat → Contact + transcript note | Retell `call_ended`/`chat_ended` webhook → new signed CRM endpoint → filing (reuse `TrackingFilingService` judgement) | **Not built** — endpoint + webhook config needed |
| L2 enrich | Analyzed call → deal + agent task | `call_analyzed` carries summary/sentiment/custom fields → deal stage + `AgentTask` | Not built — same endpoint, different event |
| L3 outbound | CRM-driven calls back | `createPhoneCall`/BatchCall from a cron or agent task — onboarding check-ins, follow-ups, with `metadata.contactId` closing the loop | Not built — largest new capability |

### Lane 2 — CRM × Railway (the orchestration floor)

| Depth | Opportunity | Mechanism | Status |
| --- | --- | --- | --- |
| L1 exists | Form → contact (live), mailbox → contact, enrichment queue, agent tasks, Slack notify | Already shipped | ✅ |
| L2 scheduling | Follow-up/SLA crons — "no touch in 7d → task", "call promised → reminder" | New `POST /internal/*` cron routes — the entrypoint already routes them | Small builds |
| L3 closed loop | Any channel → contact → enrichment → deal → scheduled callback → Retell outbound → outcome filed | Composition of lanes 1+2; the agent (eve) is the decision layer by design | Design work only — parts all exist |

### Lane 3 — Full omnichannel (Retell × CRM) — scope CONFIRMED

**Scope (user, 2026-09-18):** the omnichannel ambition is unchanged —
every channel Retell supports, feeding and fed by the CRM.

| Depth | Channel | Mechanism | Status |
| --- | --- | --- | --- |
| L1 voice in | Toll-free inbound → transcript → Contact + note + task | `call_ended`/`call_analyzed` webhook → signed CRM endpoint | Not built — p16 |
| L1 chat in | Site chat → Contact + transcript | `chat_ended`/`chat_analyzed` (file on `chat_ended` — auto-close doesn't fire analyzed) | Not built — p16 |
| L1 forms | /partners, /contact → Contact | Tracker — **live in prod** | ✅ shipped |
| L2 mid-call | `submit_partner_inquiry` tool → structured intake during live call | Custom function → CRM intake endpoint | Not built — p17 |
| L2 SMS | Retell `sms_chat` type exists — chat agents can run over SMS | `chat_type: sms_chat` in API | Available, unused |
| L3 outbound | CRM-driven calls: follow-ups, check-ins, campaigns | `createPhoneCall`/`BatchCall` + `metadata.contactId`, `call_time_window`, cron triggers | Not built — p18 |
| L3 closed loop | Channel → contact → enrich → deal → scheduled callback → outcome filed | Composition; eve agent as decision layer | Parts exist |

**RocketChat — spun out to intake p19.** Internal Steven↔Kim channel
+ alert notifications only. Not part of the omnichannel surface.

## Decision matrix — omnichannel build order

| Option | Fit | Confidence |
| --- | --- | --- |
| Inbound webhooks first (p16), then mid-call (p17), then outbound (p18) | Value-ordered: capture before generation; each layer reuses the same signed endpoint pattern | **High** |
| Outbound first | Calls contacts we can't yet attribute back — loop doesn't close | Rejected |
| RocketChat omnichannel as the chat channel | RC omnichannel overlaps Retell chat; adds MongoDB + ops for a duplicated surface | Rejected for omnichannel — RC stays internal (p19) |

## Edge cases (top 30, abridged)

1. Retell webhook replay/duplicates → dedupe on event+call_id (documented pattern). Planned.
2. Inactivity-timeout chats: no `chat_analyzed` — file on `chat_ended` transcript instead. Planned.
3. Webhook 10s timeout → accept-and-queue (AgentTask), never process inline. Pattern exists.
4. Unauthenticated webhook endpoint → verify Retell signature + RC token header; fail closed. Planned.
5. PII in transcripts → Retell `data_storage_setting` choice; store summary not raw audio. Planned.
6. Outbound calls to wrong numbers → BatchCall `call_time_window` + explicit per-task numbers from contacts only; consent flag needed on contact. Gap: no consent field today.
7. Outbound cost runaway → batch size caps + dry-run counts; Railway cron bounded.
8. Call back to a contact with no phone → skip; phone is optional on the form (intake decision: make phone required for callback-eligible leads).
9. Retell tool call mid-call (`submit_partner_inquiry`) → same signed endpoint, different schema; idempotent per call_id. Planned.
10. Chat + call same person → contact match by phone/email — mailbox identity-matching judgement reused. ✔ exists
11. Transcript size → store excerpt + Retell call_id link, not full text in Contact notes. Planned.
12. RocketChat MongoDB on Railway — persistent volume, backup story needed (nightly-backup workflow exists in Noni repo as pattern).
13. RC upgrades break livechat widget → pin version, staging RC before prod.
14. RC + Retell chat both on site → persona routing conflict: pick ONE widget per page (facility vs caregiver split already exists).
15. RC webhook flood on busy chat → event filter (Chat Start/Close only for CRM).
16. Self-hosted chat = data sovereignty win consistent with private-CRM ethos. Benefit.
17. Slack already connected in CRM → RC for internal chat duplicates Slack's role — decide one.
18. Railway cron overlap with agent dispatch — DISPATCH config already centralizes; new crons follow same shape.
19. Outbound call while contact in suppression list → check `SuppressedContact` first. ✔ exists
20. Recording consent law (two-party states) → Retell disclosure in agent prompt; compliance copy in KB.
21. Webhook endpoint behind auth → dedicated `/internal/retell` with secret, like CRON_SECRET pattern. Planned.
22. RocketChat E2EE rooms → bot can't read them — agent notifications only to non-E2EE ops channel.
23. Railway egress costs — webhooks inbound free; outbound Retell API calls trivial.
24. Timezones for batch calls — `call_time_window` is tz-aware; facility calls need local-time windows.
25. Duplicate contact on call→form double-submit — dedupe by email/phone across intake paths. ✔ pattern
26. Retell outage → inbound calls go to carrier fallback; CRM unaffected. No action.
27. RC livechat offline → offline-message event → CRM task for next-day callback. Nice automation seam.
28. Agent hallucinating a booked meeting → meeting tasks always human-confirmed; agent drafts, rep sends. Existing rule.
29. RocketChat SSO vs CRM users → separate user base; admin = 2 manual accounts, no SSO build needed.
30. Idempotent re-delivery of Retell webhooks after CRM downtime → processed-event table pattern (mailbox webhook precedent). Planned.

## Gaps for the user

1. Priority: inbound capture (calls→contacts) vs outbound automation
   (CRM→calls) vs RocketChat — which intake(s) first?
2. RocketChat intent: livechat widget, internal chat, or both?
3. Consent flag on contacts for outbound calling — add to schema?
4. Phone required vs optional on the partners form (affects callback
   eligibility).
