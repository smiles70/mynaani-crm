# Intake — Sign-in users and allow-list

**Date:** 2026-09-17
**Status:** implemented — on staging, verified; awaiting production
promotion
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Parent intake:** `2026-09-16-p1-fork-bootstrap.md` (scope item 2)

## Problem statement

Password sign-in shipped to staging with the wrong identity model.
`stmiles1@yahoo.com` must always stay on the allow-list. The two CRM
users are `steven@mindbyndr.com` and `kim@mindbyndr.com`, not the
`@mynaani.com` accounts created on staging. Both users hold the shared
password `Sydni2001!` and both need admin rights, not the owner/member
split the bootstrap produced.

## Current state

- `ALLOWED_SIGN_IN` = `steven@mynaani.com,kim@mynaani.com` on api + app
  in staging and production. `stmiles1@yahoo.com` was removed.
- Staging holds users `steven@mynaani.com` (owner) and
  `kim@mynaani.com` (member). Wrong emails.
- `ensureWorkspaceMembership` grants `owner` to the first user and
  `member` to everyone after. Kim lands as `member`, not admin.
- The sign-in form expands a bare name to `@mynaani.com`. Wrong domain.

## Required state

1. `ALLOWED_SIGN_IN` =
   `stmiles1@yahoo.com,steven@mindbyndr.com,kim@mindbyndr.com` in both
   environments. The bootstrap identity stays, always.
2. Users `steven@mindbyndr.com` and `kim@mindbyndr.com` exist with
   password `Sydni2001!`. Sign-in stays case-insensitive.
3. Both users get admin-equivalent rights in the workspace. Roles are
   `owner` / `admin` / `member`; admin means `admin` or `owner` here.
4. Bare-name expansion uses `@mindbyndr.com`, not `@mynaani.com`.
5. The `@mynaani.com` staging users are removed or left harmless —
   they fall off the allow-list either way.

## Edge cases

- `member.role` accepts `owner`, `admin`, `member` — set `admin` on the
  second user, or promote via `member.update` after sign-up.
- Deleting a user row must not break the last-owner invariant noted in
  the p1 intake.
- Steven could sign in as either identity; they are different users in
  the workspace, not aliases.
- Sign-up endpoint stays open; the allow-list is the only gate.

## Open items

- Delete the wrong `@mynaani.com` staging users or leave them orphaned.
- Promote Kim via seeded role assignment vs a manual `member` update.
