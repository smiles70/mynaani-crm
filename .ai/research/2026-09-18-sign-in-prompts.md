# Research — Browser password prompts on sign-in (p10) — full protocol

**Date:** 2026-09-18
**Intake:** `.ai/intake/2026-09-18-p10-sign-in-prompts.md`
**Question:** Can the app stop the browser's password-manager popup
from interrupting sign-in?

## Sources

| # | Source | Org | Type | Finding |
| --- | --- | --- | --- | --- |
| 1 | bugzilla.mozilla.org/1878740 | Mozilla | bug tracker | "Manage Passwords" popup opens on focus even with zero saved logins — confirmed Firefox regression |
| 2 | bugzilla.mozilla.org/1858855 | Mozilla | bug tracker | Auto-opened popup showing only the footer is a tracked defect |
| 3 | bugzilla.mozilla.org/1919571 | Mozilla | bug tracker | Password dropdown triggers on plain email fields; only partially fixed in FF140 |
| 4 | firefox LoginAutoComplete.sys.mjs | Mozilla | source | Footer item dispatches `PasswordManager:OpenPreferences` → about:logins; gated by `signon.showAutoCompleteFooter` |
| 5 | bugzilla.mozilla.org/956906 | Mozilla | bug tracker | Firefox saves passwords despite `autocomplete=off` — by design |
| 6 | bugzilla.mozilla.org/1105331 | Mozilla | precedent | Sites defeating autofill are treated as hostile to users; Mozilla changed the browser, not the site |
| 7 | developer.mozilla.org autocomplete attribute | MDN | web standard docs | Correct tokens for login forms are `username` + `current-password`; `off` not honored for logins |
| 8 | html.spec.whatwg.org autofill | WHATWG | standard | Autofill tokens are a conformance contract — assistive tech and managers depend on them |
| 9 | chromium issue 468153 | Chromium | bug tracker | Chrome ignores `autocomplete=off` on login forms by deliberate design decision |
| 10 | web.dev sign-in form best practices | Google (web.dev) | engineering guide | Recommends `username`/`current-password`; warns against fighting browser autofill |
| 11 | NIST SP 800-63B §5.1.1.2 | NIST | security standard | Password managers reduce credential risk; verifiers SHOULD allow autofill — suppressing it harms security |
| 12 | OWASP Authentication Cheat Sheet | OWASP | security guide | Do not obstruct password managers; they enable stronger unique passwords |
| 13 | WCAG 1.3.5 Identify Input Purpose | W3C | accessibility standard | Autocomplete tokens are an accessibility requirement for cognitively accessible forms |
| 14 | nngroup.com login-design | Nielsen Norman | UX research | Login friction is the top abandonment cause; browser autofill reduces it |
| 15 | developer.1password.com autofill guidance | 1Password | vendor eng docs | Managers key off autocomplete semantics; nonstandard forms get worse autofill |
| 16 | bitwarden autofill docs | Bitwarden | vendor docs | Same finding — semantic fields are the only reliable fill mechanism |
| 17 | developer.apple.com password autofill | Apple | platform docs | WebKit honors the same tokens; `new-password` changes behavior on registration forms only |
| 18 | gov.uk design system — forms | GDS | public-sector eng | Login forms keep native semantics; gov.uk never suppresses browser affordances |
| 19 | Okta support case via bug 1105331 | Okta/Mozilla | war story | Custom suppression broke autofill enterprise-wide and was reverted |
| 20 | HN threads on autocomplete=off | Hacker News | discussion | Community consensus: no reliable site-side suppression exists |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Keep semantics; user sets `signon.showAutoCompleteFooter=false` | Removes the navigation trap; autofill intact; zero code | High |
| Save the login once | Popup becomes one-tap fill; the trap footer still exists but recedes | High |
| `autocomplete="off"` / field obfuscation | Ignored or breaks autofill + a11y; documented hostile pattern | Rejected |
| `type="text"` password + JS masking | Defeats managers AND leaks the password to screen capture/extensions | Rejected |

## Selected approach

No code change. Document the Firefox pref
(`signon.showAutoCompleteFooter=false`) as the operator fix; keep
`username`/`current-password` semantics. The post-submit save prompt
is desired — it turns future sign-ins into one click.

## Edge-case / remediation matrix (30)

| # | Trigger | Impact | Remediation | Conflict check |
| --- | --- | --- | --- | --- |
| 1 | Focus on password field, zero saved logins | UX — empty popup | about:config pref; no code fix exists | none — Firefox-side |
| 2 | Clicking "Manage Passwords" footer | UX — navigates to about:logins | same pref removes footer | none |
| 3 | First-visit save prompt | UX — one extra dialog | desired; saves for one-tap fill | none |
| 4 | Chrome/Edge behavior differs | UX | no trap footer there; nothing to do | none |
| 5 | Safari autofill | UX | honors same tokens; fine | none |
| 6 | Screen reader naming | a11y | tokens already correct (WCAG 1.3.5) | none |
| 7 | `type="text"` identifier not detected as username | functional | `autoComplete="username"` declares it — kept | none |
| 8 | Shared password across 2 users | security | password manager saves per-origin; both users fill same creds | acceptable for shared creds |
| 9 | User prefers no manager at all | UX | browser-level disable; not app scope | none |
| 10 | Password field in a `<form>` triggers save on submit | UX | desired | none |
| 11 | Third-party manager (1Password) overlays | UX | extension-side; unaffected | none |
| 12 | `name` attributes nonstandard | functional | we use `identifier`/`password` — Firefox keys on type+autocomplete, works | none |
| 13 | Popup covers the password field | UX | known overlap bug 1666346; Firefox-side | none |
| 14 | Multiple profiles/managers installed | UX | user-side | none |
| 15 | Private browsing | UX | no manager prompts; clean | none |
| 16 | Managed browser (enterprise policy) | compliance | policy may force manager; our semantics stay correct | none |
| 17 | `disableSignUp` (p6) changes form semantics | functional | sign-in form only ever calls signIn; unaffected | checked — password-sign-in.tsx calls signIn.email only |
| 18 | CSP blocks inline handlers for masking hacks | security | N/A — no hack adopted | none |
| 19 | Form inside iframe someday | functional | managers treat same-origin fine | not planned |
| 20 | Keyboard-only flow | UX | Tab order: identifier→password→submit; popup dismissed by Esc | verified in code |
| 21 | Pref `signon.enabled=false` globally | UX | zero prompts — alternative user-side fix | documented |
| 22 | Future magic-link sign-in | scope | no password field → no popup at all | out of scope |
| 23 | Passkey adoption later | scope | webauthn flow bypasses the whole issue | noted for future |
| 24 | Localization of popup | UX | browser chrome, not ours | none |
| 25 | Mobile Firefox (Android/iOS) | UX | mobile managers behave differently; small surface | monitor |
| 26 | Popup after wrong password | UX | "update saved login" — normal | none |
| 27 | Two Firefox profiles on one machine | ops | pref is per-profile — set on each | documented |
| 28 | User clicks trap again post-fix | UX | footer gone; impossible | resolved |
| 29 | Regressions in future Firefox versions | ops | track bug 1878740; revisit if fixed upstream | noted |
| 30 | Kim's browser untested | ops | same pref needed on her machine | documented |

## Codebase conflict check

No conflicts: no code changes. `password-sign-in.tsx` semantics
already match sources 7–10. Conflicts with nothing in AGENTS.md or
docs/design.md.

## Gaps

- Setting the pref is user-side; I cannot reach `about:config` for
  them. Documented steps delivered in the intake.
