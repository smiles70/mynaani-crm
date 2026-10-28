# PRESSURE-TEST — magiclink signin — 2026-10-29 (blocking gate)

## Verified premises (file:line)
- `packages/auth/src/auth.ts` — `plugins:` array exists (~:125);
  genericOAuth(conditional) + organization({...}) already there;
  `env` imported from ./env (process.env wrappers, ./env.ts:8).
- `packages/auth/src/client.ts:8` — plugins array takes client
  plugins; magicLinkClient() is additive.
- `apps/app/(landing)/sign-in/page.tsx` — server page;
  `{!showSso && password ? <PasswordSignIn/> : null}` is the
  existing conditional block — MagicLinkSignIn client component
  gets an identical slot.
- `apps/api/src/config/env.validation.ts:128,136` — RESEND_API_KEY +
  LEAD_NOTIFY_FROM already declared optional.
- `apps/api/src/tracking/lead-notify.service.ts` — Resend REST
  shape (api.resend.com/emails, Bearer apiKey, {from,to,subject,html}).
- better-auth 1.6.x — magicLink plugin, atomic consume, 300s default
  TTL, generic success responses (verified docs+src).

## Corrected risks from research
- Scanner-prefetch burns single-use links on GET — real, documented
  (4 sources). MITIGATED-PARTIALLY: copy+re-request guidance;
  emailOTP is the ready fallback; confirm-page middleware deferred.
- ALLOWED_SIGN_IN bypass concern: magicLink auto-signs-up new users —
  gated by existing user.create.before hook (allow-list). Verified:
  hook throws FORBIDDEN → account never created.
- Existence-reveal: endpoint returns generic 200 always; our
  sendMagicLink additionally no-ops SEND for non-allowlisted
  emails (no wasted send, no signal).

## Blast radius
- packages/auth/src/auth.ts — plugins array append (new code path
  only when called; existing providers unaffected). Detector:
  existing auth e2e + password sign-in regression.
- packages/auth/src/client.ts — one import + array item. Detector:
  typecheck.
- sign-in page.tsx — one new component render. Detector: render
  check, existing sign-in e2e.
- NEW FILE packages/auth/src/magic-link-mailer.ts — zero existing
  callers; blast zero by construction.
- Env additions: RESEND_API_KEY + LEAD_NOTIFY_FROM on api prod —
  optional pair, absent → no-op (capability-removal rule).

## Rollback
- Flag-free additive: revert commit removes plugin + UI.
- Env removal instantly kills sending (no residual).
- No schema changes (better-auth reuses verification table).
