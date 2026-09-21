# PS-CRM-004 — RocketChat alert sweep drops contacts during agent downtime

**Date:** 2026-09-21 · **Priority:** P2 · **Status:** implemented — awaiting staging verification
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

`apps/agent/agent/lib/rocketchat.ts` (`sweepNewContactAlerts`, shipped in
`b73b543`) tracks progress in a module-level `watermark` variable. On every
minute tick it queries contacts created after
`max(watermark, Date.now() - LOOKBACK_MS)` where `LOOKBACK_MS` is 2 minutes.

Two loss windows exist:

- **Process restart:** the watermark resets to 0, so `since` falls back to
  `now - 2min`. Any contact filed while the agent was down longer than 2
  minutes is never alerted.
- **Long outage:** the watermark never advances while the process is down;
  on return, contacts older than 2 minutes are skipped.

Confirmed in code: `watermark` is a plain `let` in module scope. Nothing
persists it.

## Options

- **A — Persist the watermark.** Store `last alerted contact.createdAt` in
  a durable place (a small table, `appSettings`-style key-value row, or
  Redis if present). On restart, resume from the stored value. Correct and
  durable; adds a tiny storage dependency.
- **B — Query by "alerted" flag.** Add a boolean/timestamp column on
  `contact` (e.g. `alertedAt`) and sweep `alertedAt IS NULL`, stamping rows
  after a successful post. Exactly-once per contact, restart-proof, no
  time-window reasoning at all. Requires a Prisma migration.
- **C — Keep the window but widen it.** Increase `LOOKBACK_MS` to hours.
  Cheap, but still loses contacts during outages longer than the window
  and can re-alert after restart (watermark=0 → alerts for everything in
  the window again → duplicate channel posts).

Option B is the clean design; option A is the minimal change. Option C is
rejected — it trades missed alerts for duplicate alerts.

## Edge cases

- Webhook down when the sweep runs → with option B, rows stay unstamped and
  retry next tick (good). Current code `break`s on first failed post, so
  ordering is already handled.
- `MAX_ALERTS_PER_SWEEP = 10` backpressure: a burst of signups could exceed
  one sweep; option B drains naturally over successive ticks.
- The dedupe/filing path must not stamp `alertedAt` — only the sweep.

## Acceptance criteria

- [ ] A contact filed while the agent is stopped gets a RocketChat alert
      after the agent restarts — verified on staging by stopping the
      service, filing a contact, restarting.
- [ ] No duplicate alerts across restarts or repeated sweeps.
- [ ] Sweep failures leave rows eligible for retry.
- [ ] Same-commit tests cover restart recovery and burst >10 contacts.

## Implemented (2026-09-21)

Option B shipped: `alertedAt DateTime?` on `contact` (migration
`20260921000000_contact_alerted_at`, backfills existing TRACKING/RETELL
rows so the first tick does not flood the channel). The sweep selects
`alertedAt IS NULL` rows, posts, stamps each row on success; failed posts
leave rows unalerted for the next tick. Backlogs drain across sweeps,
oldest first, capped at 10 per tick. Integration spec covers once-only,
already-stamped, failure retry, and >10 backlog drain.
