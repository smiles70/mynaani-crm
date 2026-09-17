# Research — Sign-in users and allow-list (p3)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p3-sign-in-users.md`
**Question:** How do we run exactly two password users plus the
bootstrap identity, both as admins, case-insensitively?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| better-auth.com/docs/authentication/email-password | Better Auth | vendor docs | `emailAndPassword.enabled` gates both sign-in and sign-up; password 8–128 chars default |
| github.com/better-auth/better-auth/issues/10276 | Better Auth | issue + maintainer bot | Sign-in lowercases the *input* email; stored emails must be lowercase — create users lowercase |
| better-auth.com/docs/plugins/organization | Better Auth | vendor docs | Roles are `owner` / `admin` / `member`; admin = full control minus org delete/owner transfer |
| packages/auth/src/workspace.ts | this repo | code | `ALLOWED_SIGN_IN` accepts comma-separated domains or addresses; matching is already case-insensitive |
| packages/auth/src/organization.ts | this repo | code | `ensureWorkspaceMembership` gives first user `owner`, everyone else `member`; upsert is the single seam |
| /home/hazbyn/RetallAi backend admin.py | sibling repo | prior art | `kim,steven` usernames, shared password, `strip().lower()` — same model the user asked for |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Keep `ALLOWED_SIGN_IN` as 3 explicit addresses | Blocks every other identity at user-create hook; no domain wildcard needed | High |
| `ensureWorkspaceMembership` grants `admin` to non-first members | Single-tenant: every allow-listed identity is staff; survives DB rebuilds; one-line seam | High |
| Manual `member.update` to promote Kim | Works once, reverts to `member` on DB rebuild; not durable | Low |
| Better Auth `admin` plugin | Full admin app (ban, impersonate); oversized for two staff users | Low |

## Selected approach

1. `ALLOWED_SIGN_IN=stmiles1@yahoo.com,steven@mindbyndr.com,kim@mindbyndr.com`
   on api + app in both environments. The bootstrap identity is a
   permanent allow-list entry, documented in the IaC file's preserved
   env.
2. Create `steven@mindbyndr.com` and `kim@mindbyndr.com` via the
   sign-up endpoint (lowercase emails), password `Sydni2001!`.
3. `ensureWorkspaceMembership` creates subsequent members as `admin`
   instead of `member` — the single-tenant seam. First user stays
   `owner`.
4. `password-sign-in.tsx` expands bare names to `@mindbyndr.com`.
5. Remove the `@mynaani.com` staging users so no orphan identity
   lingers; they are off the allow-list either way.

## Edge cases

- Sign-up endpoint stays open by design; the allow-list hook is the
  gate. An attacker can only ever create an allow-listed identity.
- Stored emails must be lowercase — the sign-up call passes them
  lowercase; Better Auth normalizes input at lookup time.
- Removing `stmiles1@yahoo.com` from the list while a live session
  exists does not kill the session; it blocks new sign-ins. Keeping it
  on the list is the requirement anyway.
- Owner invariant: Steven (first created) is owner; Kim is admin.
  Deleting Steven would orphan owner duties — leave owner transfer to
  a settings surface later.
