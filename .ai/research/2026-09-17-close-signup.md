# Research — Closing the sign-up endpoint (p6)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p6-close-signup.md`
**Question:** How do we close public registration while keeping
sign-in and a provisioning path for future users?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| better-auth.com/docs/authentication/email-password | Better Auth | vendor docs | Sign-up returns 422 for existing emails unless `requireEmailVerification`/`autoSignIn:false`; enumeration-safe mode exists |
| github.com/better-auth/better-auth/pull/1428 (commit 6ae53a1b) | Better Auth | merged PR | Adds `emailAndPassword.disableSignUp` — endpoint returns BAD_REQUEST; sign-in untouched |
| better-auth options reference | Better Auth | vendor docs | `disabledPaths: ["/sign-up/email"]` returns hard 404 for closed-beta apps |
| github.com/better-auth/better-auth/issues/1142 | Better Auth | issue + workarounds | Before-hook throwing APIError on `/sign-up` paths was the pre-#1428 pattern; admin plugin createUser is the server-side provisioning route |
| packages/auth/src/auth.ts | this repo | code | `hooks.user.create.before` allow-list already fails closed; flag is additive defence |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| `emailAndPassword.disableSignUp: true` | One flag, vendor-supported, keeps sign-in; provisioning via `auth.api` server-side still possible through internal calls | High |
| `disabledPaths: ["/sign-up/email"]` | Harder (404 vs 400); same effect for clients | Medium |
| Before-hook throwing on `/sign-up` | Works today without upgrading; duplicates what #1428 made first-class | Medium |
| Leave open, rely on allow-list | The risk being closed | Rejected |

## Selected approach

Set `emailAndPassword.disableSignUp: true` in
`packages/auth/src/auth.ts`. All three accounts already exist; the
allow-list hook remains as a second layer. Provisioning for any
future user: temporarily toggle the flag off for one deploy, or add a
`tools/provision-user` step that calls the auth API server-side —
decide when the need actually appears; flag-off redeploy is cheap.

## Edge cases

- Verify the installed better-auth version contains #1428 before
  setting the flag — check `node_modules/better-auth` for the option.
- Sign-in (`/sign-in/email`) is a different path; unaffected.
- Social/SSO sign-up flows are separate paths — none configured, so no
  surface change.
- An open `signUp.email` call from our own form doesn't exist — the
  UI only calls `signIn.email`. No frontend change needed.
