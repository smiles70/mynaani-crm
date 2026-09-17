# Research — Ghost identifier placeholder (p13) — expedited track

**Date:** 2026-09-18
**Intake:** `.ai/intake/2026-09-18-p13-ghost-identifier.md`
**Scope justification:** one attribute on one input; reversible in a
one-word revert. Per `PROCESS_AGENTS.md` §2 this qualifies for a
smaller memo — sources are still real.

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| nngroup.com/articles/placeholders | Nielsen Norman | UX research | Placeholders that look like values cause users to skip the field or append to ghosts — documented failure mode |
| W3C placeholder guidance (html spec) | WHATWG | standard | "The placeholder attribute should not be used as an alternative to a label" — placeholder is a hint, not a value |
| gov.uk design system — text input | GDS | public-sector eng | Never put an example that looks like an answer inside the box; hint text lives outside |
| MDN input/placeholder | MDN | web docs | Placeholder with sufficient contrast is indistinguishable from a value at a glance |
| WCAG 1.4.3 + placeholder contrast | W3C | a11y | Muted-grey placeholders confuse low-vision users into thinking the field is filled |
| apps/app/.../password-sign-in.tsx | this repo | code | `placeholder="steven@mindbyndr.com"` — a literal plausible email in the box |
| docs/design.md | this repo | design contract | restraint — a label already says "Email or name" |

## Decision

Remove the placeholder entirely — the label "Email or name" already
carries the format contract. No replacement hint needed: two users,
they know their own names.

## Edge cases (verified against codebase)

- Identifier normalization (`sign-in-identifier.ts`) doesn't read
  the placeholder — pure presentation change. ✔
- No test asserts on the placeholder — checked `apps/app/test` and
  the e2e script reads label/role, not placeholder. ✔
- `autoFocus` absent on this field — unchanged. ✔
