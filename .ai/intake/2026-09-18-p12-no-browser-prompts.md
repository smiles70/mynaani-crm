# Intake — App-side suppression of browser password prompts

**Date:** 2026-09-18
**Status:** open — supersedes the user-side fix in p10
**Process:** v9.51 pipeline (see `PROCESS_AGENTS.md` §2)
**Parent intake:** `2026-09-18-p10-sign-in-prompts.md`

## Problem statement

The p10 fix asked each user to flip `signon.showAutoCompleteFooter`
in `about:config`. That is a bad user experience: every user, every
browser profile, every new machine needs manual surgery for an
internal tool with two users. The product must not require users to
configure their browser. The app itself must make the Firefox (and
Chromium/Safari) password-manager popup not appear during sign-in —
or make it so it cannot harm the flow.

## Current state

- The form uses `autoComplete="username"` + `"current-password"` —
  correct semantics that intentionally invite the password manager.
- Firefox opens the autocomplete popup on field focus, even with zero
  saved logins (bugs 1878740 / 1858855); its footer navigates to
  `about:logins`.
- Credentials are shared (`Sydni2001!`) — per-user saved-password
  autofill provides little value; there is no per-user secret to
  personalize.
- p10 memo documents why `autocomplete="off"` is ignored and why
  fighting detection is a losing arms race.

## Required state

1. No password-manager popup on focus or submit, on any browser,
   with no user-side configuration.
2. The sign-in flow still works identically for a human: type, Enter,
   in.
3. Security is not degraded: the password stays a `type="password"`
   field (masked, excluded from copy/paste-into-plaintext accidents,
   excluded from form-history lists).
4. Accessibility contract intact — label, focus, keyboard submit.

## Edge cases (seeded for stage 3)

- `autoComplete="new-password"` suppresses fill suggestions but also
  stops save prompts — acceptable? desirable?
- Screen readers must still announce "password".
- The identifier field must not trigger manager heuristics either.
- Any suppression trick must survive browser updates — prefer
  spec-sanctioned tokens over hacks.
- The about:logins trap must be impossible to reach from our page.

## Open items

- Whether suppressing save-prompts entirely is the goal, or only the
  focus-time popup.
