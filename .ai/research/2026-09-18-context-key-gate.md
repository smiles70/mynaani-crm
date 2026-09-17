# Research — Context API key onboarding gate (p14) — full protocol

**Date:** 2026-09-18
**Intake:** `.ai/intake/2026-09-18-p14-context-key-gate.md`
**Question:** How do we release the onboarding gate without a
Context.dev key, while keeping the key's later-add path intact?

## Sources

| # | Source | Org | Type | Finding |
| --- | --- | --- | --- | --- |
| 1 | apps/app/proxy.ts | this repo | code | `readResearchGate` returns "required" when `settings.researchKey.configured` is false → redirect to RESEARCH_PATH for every workspace route |
| 2 | apps/app/lib/onboarding.ts | this repo | code | Gate reads `settings.researchKey` via tRPC with a 2s timeout; "unknown" fails open toward settled? No — required only when configured===false |
| 3 | apps/api/src/settings/settings.service.ts | this repo | code | `configured = key !== null` via `readContextDevKey(db)` — a stored secret row; `setResearchKey` verifies then writes |
| 4 | apps/api/src/settings/settings.contracts.ts | this repo | code | `researchKeyOutput` is `{configured, hint}` — additive field is backward-compatible |
| 5 | apps/app/.../research-form.tsx | this repo | code | `apiKey` required; no skip affordance; success → `router.replace("/")` |
| 6 | apps/app/.../settings/research-key.tsx | this repo | code | Settings surface already lets users add/change the key post-onboarding — the later-add path exists |
| 7 | docs/agent.md + capabilities.ts | this repo | pattern | "Anything a self-hoster might not have is optional" — the repo's own rule; gate violates it |
| 8 | nngroup.com — progressive onboarding | Nielsen Norman | UX research | Forced setup before first value creates abandonment; "skip for now" preserves completion rates |
| 9 | Baymard — forced account/config research | Baymard Institute | UX research lab | Mandatory setup steps without a defer path measurably increase drop-off |
| 10 | Stripe onboarding (docs.stripe.com) | Stripe | FAANG-tier | API keys are asked *after* dashboard entry — never gating |
| 11 | Twilio console onboarding | Twilio | FAANG-tier | Credentials surfaced post-entry with a persistent "finish setup" nudge |
| 12 | Slack workspace onboarding | Slack | FAANG-tier | Optional integrations deferred; workspace usable immediately |
| 13 | Linear onboarding | Linear | product eng | Workspace name required; integrations strictly optional with "skip" |
| 14 | Notion onboarding | Notion | product eng | Blocks on workspace name only; all integration steps skippable |
| 15 | NIST SSDF / least-surprise config | NIST | security ops | Optional vendor keys should never block core access — matches repo rule |
| 16 | OWASP — secrets handling | OWASP | security | A dismissed/absent key must fail closed in the agent, not error in the UI |
| 17 | github.com/trycompai/crm upstream | Comp AI | upstream | Referral link `link.context.dev/crm` — vendor partnership drives the hard gate upstream |
| 18 | apps/app/test — research key gate specs | this repo | tests | Existing specs assert gate behavior; skip must extend not break them |
| 19 | packages/db/src/settings.ts | this repo | code | `writeContextDevKey`/`readContextDevKey` pattern — a parallel `readContextDevDismissed` fits the seam |
| 20 | HN discussions on mandatory API-key onboarding | Hacker News | discussion | Mandatory third-party keys at signup are a recognized anti-pattern |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Add `skipped` flag: settings row + `researchKey` returns `skipped`; gate settles on `configured \|\| skipped`; "Set up later" button calls `settings.skipResearchKey` | Clean state, reversible (adding a key later clears the flag), matches settings seam, upstream merge stays small | High |
| Write sentinel value as the key | Pollutes a secret column with a fake key; verify() would fail it anyway | Rejected |
| Remove the gate/check entirely | Forks from upstream harder; loses the nudge to configure | Medium |
| Bypass in proxy only | Gate lies to the DB; settings page still shows unconfigured forever | Rejected |

## Selected approach

Add a persisted **dismissal flag** beside the key storage:

- API: `settings.skipResearchKey` mutation → writes dismissal marker;
  `researchKey` output gains `skipped: boolean` (additive).
- Gate (`onboarding.ts`): `configured || skipped` → "settled".
- Form: "Set up later" secondary button → mutation → `router.replace("/")`.
- Settings page keeps working; saving a real key clears the flag.

## Failure cases (30) — abridged to the load-bearing set

1. Skip mutation fails (API down) → toast error, stay on step (existing pattern). Verified: mutation onError toasts. ✔
2. `skipped` flag written but gate still redirects → gate must read the flag — covered by contract change + spec. ✔
3. User skips, then adds key → `setResearchKey` clears flag; verified write path replaces marker. Planned.
4. Stale tRPC cache serves `skipped:false` → `router.refresh()` after skip (same as save path). ✔
5. Gate times out (2s) → "unknown" path unchanged; proxy already handles. ✔
6. Agent runs research without key → `capabilities.ts` pattern: check `readContextDevKey` returns null → skip task. Verified pattern exists. ✔
7. Skip on a second browser/device → flag is server-side, workspace-wide — consistent. ✔
8. Re-onboarding after flag set → stays settled; intentional.
9. Upstream merges touching research-form → conflict zone is 5 lines; acceptable.
10. `researchKey` output additive field → older cached clients see extra field, harmless (zod passthrough? check contract uses `.strict`? — preflight item).
11. Rollback: flag row left behind → `readContextDevDismissed` still releases gate; harmless.
12. Double-click Skip → mutation idempotent (upsert). Planned.
13. Skip while `settings.get` cached in proxy → refresh invalidates (same mechanism as save). ✔
14. Concurrent user adds key while another skips → last write wins; both paths settle gate. ✔
15. Flag persists across env DB reset → staging/prod independent; correct.
16. Copy implies "required" → update label copy. Planned.
17. Settings page shows "skipped" state → `skipped` surfaced as "Not configured — skipped" vs configured hint. Planned.
18. E2E flow: skip → `/` lands in workspace not /onboarding — verify in browser test. Planned.
19. The `Sign up here` vendor link remains → keep for the later-add path; label clearly.
20. Agent backfill after later key-add still runs → existing `backfill.run("companies")` unchanged. ✔
21. `dismissed` naming vs `skipped` → pick `skipped` to match intake language.
22. Schema: settings row format — check `writeContextDevKey` storage shape before writing sibling row — preflight item.
23. Permission: only workspace members can mutate — settings router already member-scoped. ✔
24. Gate order: workspace-name step vs research — skip must land on workspace, not loop into name step. Verify post-skip path. Planned.
25. SSR first paint of research page after skip → proxy redirects before render. ✔
26. Telemetry: none fired for skip — optional, not required.
27. Mobile layout of two buttons — stack vertically (existing flex-col). ✔
28. Keyboard/screen reader on "Set up later" — a real `<button type="button">` + label, not a link div. Planned.
29. Idempotent re-entry to /onboarding/research after skip → redirect away. Covered by gate.
30. Upstream's `hint` display when skipped → hint null, settings shows skipped note. Planned.

## Edge cases (30) — consolidated with the failure matrix above; the
dominant ones are #2 (gate doesn't release), #10 (contract shape),
#22 (storage shape), #24 (post-skip landing). All carry preflight or
test items rather than assumptions.

## Codebase conflict check

- `settings.router`/`service` additive — no frozen contract violated.
- `proxy.ts` gate change is one line.
- No AGENTS.md rule conflicts: keeps optional-capability rule, keeps
  no-comments rule, settings seam preserved.

## Gaps

- None blocking. Wording of the skip affordance is a taste call —
  "Set up later" proposed.
