# Intake — Close the open sign-up endpoint

**Date:** 2026-09-17
**Status:** shipped — live on production, verified
**Process:** v9.51 (see `PROCESS_AGENTS.md`)

## Problem statement

`POST /api/auth/sign-up/email` answers the public internet. The
`ALLOWED_SIGN_IN` hook is the only gate: anyone who reaches the URL
can create an account for one of the three allow-listed addresses,
provided they know the address. A guessed or phished credential set is
not required — only the email. The gate is correct but thin: one
config mistake in `ALLOWED_SIGN_IN` (a wildcard domain, a typo) opens
registration to strangers with no second line of defence.

## Current state

- `emailAndPassword.enabled = true`, sign-up endpoint live.
- `ALLOWED_SIGN_IN` = `stmiles1@yahoo.com,steven@mindbyndr.com,kim@mindbyndr.com`
  on api + app, both environments.
- All three production accounts exist. Nobody else needs to register.
- Better Auth ships `emailAndPassword.disableSignUp` (PR #1428) and
  `disabledPaths` for hard 404s.

## Required state

1. Sign-up endpoint closed at the auth layer; sign-in unaffected.
2. Account creation still possible through an operator path
   (seed/provision script) for future users, not a public endpoint.
3. The allow-list hook stays — defence in depth, not the only gate.

## Edge cases

- `disableSignUp` blocks `signUp.email` API calls; provisioning must
  write `user` + `account` rows with a compatible password hash, or
  use the admin plugin's createUser server-side.
- Re-enabling sign-up temporarily for a new user is an acceptable
  operator flow but reopens the window.
- The existing users must keep signing in — verify after the flag.
- `disabledPaths` 404s the route entirely; `disableSignUp` returns an
  API error. One of them is enough; pick per research memo.

## Open items

- Provisioning path: seed script vs server-side `auth.api` call vs
  direct SQL with better-auth's scrypt hash.
