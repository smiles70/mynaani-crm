# Intake — passwordless magic-link sign-in for Shark Wheel CRM users
**Status:** Stage 1 — intake (no code before stage 8)

## Problem statement
Shark Wheel's CEO (zack@) and COO (bill@) cannot sign in to
sharkwheel-crm. Auth is better-auth email+password with
`disableSignUp: true` (packages/auth/src/auth.ts:82). There is NO
public sign-up, NO reset/forgot-password wiring, NO change-password
UI, and NO Google OAuth (GOOGLE_CLIENT_* unset on api service).
No usable path exists to give a real client a login.

## Current state (verified live, 2026-10-28)
- Deployed: project `sharkwheel-crm`, services `app`
  (app-production-b412.up.railway.app, 200) + `api`
  (api-production-27f4f.up.railway.app, auth 200) + Postgres.
  `agent`, `cron-daily`, `cron-mailboxes` OFFLINE.
- `ALLOWED_SIGN_IN = sharkwheel.com,steven@mindbyndr.com,
  kim@mindbyndr.com,kimemiles@...` — domain rule already covers
  zack@ and bill@ (env.validation.ts:47-49; the allow-list gate runs
  on `user.create.before` hook, auth.ts:~262).
- `POST /api/auth/sign-up/email` → EMAIL_PASSWORD_SIGN_UP_DISABLED.
- better-auth `^1.6.25` — ships `magicLink` plugin (installed pkg).
- Mail rail exists in code: `RESEND_API_KEY` + `LEAD_NOTIFY_FROM`
  (`lead-notify.service.ts` → api.resend.com) but BOTH unset on api
  prod — so Resend leg is present-not-configured.
- Org `shark-wheel` already exists in Postgres (`organization`
  table); `ensureWorkspaceMembership` auto-binds users on session
  create (auth.ts session.create.before hook).
- House precedent: Noni/mynaani.com uses passwordless
  provider-verified email auth (WorkOS AuthKit → HMAC bearer
  credential; backend/services/email_credential.py). Passwordless-
  by-email is the established house style.

## Required state
- A signed-in path for zack@ + bill@ that never asks them to
  create, type, or remember a password.
- better-auth `magicLink` plugin wired in packages/auth/src/auth.ts:
  `sendMagicLink` callback emails a one-time link.
- Mail sender: Resend rail (reuse RESEND_API_KEY + LEAD_NOTIFY_FROM,
  declared in env.validation.ts; set on api prod env).
- Sign-in page gains "email me a sign-in link" action; ALLOWED_SIGN_IN
  gate keeps working (user.create.before hook must still pass —
  magic-link account creation goes through the same hook).
- Client comms: we email zack/bill the URL; they click → request
  link → signed-in. Optionally we mint their first link server-side
  and email THAT directly (fewer steps, CEO-grade).
- OPTIONAL-LATER (out of scope this WS): GOOGLE_CLIENT_* OAuth +
  Gmail/Calendar sync; forced password flows; generic SSO (the
  Settings→SSO path exists for enterprise).

## Prior-art lookup (mandatory)
- AppPlanning pipeline invoked: this intake is Stage 1; research
  protocol (Stage 2 ≥20 sources incl. better-auth docs/issues) next.
- FAANG MOC skills/: gmail-api-send (proven mail rail),
  deep-preplanning (new skill, applies — auth seam), env-mint-verify,
  authforge-client-setup (org/grant patterns).
- FAANG MOC incidents/: reviewed 2026-10-*; no prior magic-link
  incident; adjacent: MCP cookie re-IP lock (auth-bind lesson).
- FAANG MOC audits/: 2026-10.md — live-but-mislabeled class applies:
  sharkwheel-crm LIVE (corrected verdict), this WS makes it OPERABLE.
- Wiki: FORGE-DEPLOY-GOTCHAS (volume discipline, env seams);
  deployed infra verified above.
- .agents/skills/: better-auth-best-practices — "consult
  better-auth.com/docs for code examples and latest API" — cited
  for the research stage.
- Repo rules read: AGENTS.md (no comments, no Co-Authored-By,
  one root .env, client-vs-server rules, ASD-STE100 reporting) +
  PROCESS_AGENTS.md (v9.51 pipeline).

## Edge cases (Stage 3 will expand to 30/30)
- Magic link used twice → better-auth invalidates after use.
- Link expires (default TTL ~5min) → user re-requests.
- Non-allow-listed email → FORBIDDEN from existing hook (keep).
- RESEND_API_KEY missing → sendMagicLink fails; fail loudly in logs,
  honest "can't send" state (capability-removal rule: optional
  capability must never throw at boot — only on use).
- E-mail deliverability to sharkwheel.com (SPF/DMARC) — verify a
  real send lands before telling Zack.
- We-minted-first-link option leaks a usable link over email — same
  risk class as any magic link; 1-use, short TTL mitigates.
- Existing password users (devin-test@sharkwheel.com test row
  created during probing — DELETE after verification or convert).

## Open items
- Resend domain: does resend send as @mynaani.com / @mindbyndr.com
  (LEAD_NOTIFY_FROM value decision) — pick verified sender domain.
- UI copy for magic-link button (geragogy: one clear action).
- Decide: user self-requests link vs we-mint-and-send first link.
- Test account devin-test@sharkwheel.com cleanup.
