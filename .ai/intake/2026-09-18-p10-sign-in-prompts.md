# Intake — Browser password-manager prompts interrupt sign-in

**Date:** 2026-09-18
**Status:** resolved — browser-side fix documented; no code change
**Process:** v9.51 (see `PROCESS_AGENTS.md`)

## Problem statement

Signing in produces extra prompts. Focusing the email or password
field makes Firefox drop a password-manager popup with a
"Manage Passwords" affordance; activating it navigates away to
`about:logins` — the user leaves the app mid-sign-in. The requirement
is plain: type name, type password, press Sign in, no detours.

## Current state

- `password-sign-in.tsx` uses `autoComplete="username"` on the
  identifier and `autoComplete="current-password"` on the password —
  the correct semantics, but they are exactly what makes Firefox
  treat this as a login form and show its popup on focus.
- Nothing is saved for the domain yet, so the dropdown's useful
  content is nil and its only visible action is "Manage Passwords",
  which leaves the page.

## Required state

1. Focusing either field shows no browser affordance that can
   navigate away — or the fewest prompts the platform allows.
2. Native form submission still works (Enter key submits).
3. Accessibility semantics for assistive tech are preserved.

## Edge cases

- `autoComplete="off"` is ignored by Firefox/Chrome on login-shaped
  forms — a documented non-fix.
- Removing `type="password"` semantics or renaming fields to defeat
  detection trades autofill for hackery — research first.
- Chrome/Edge behave differently from Firefox; any suppression must
  not assume Firefox-only heuristics.
- The password save prompt after a successful sign-in is a separate
  browser behavior — decide whether it is in scope.

## Open items

- Whether a shared-password two-person tool should keep
  `autoComplete` at all (it helps nobody if credentials are shared).
- Whether Firefox's popup can be avoided at all without breaking
  password-manager users who want autofill.
