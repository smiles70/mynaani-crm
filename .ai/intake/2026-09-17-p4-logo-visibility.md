# Intake — Logo barely visible

**Date:** 2026-09-17
**Status:** implemented — on staging, verified; awaiting production
promotion
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Parent intake:** `2026-09-16-p2-debrand-rebrand-mynaani.md`

## Problem statement

The Mynaani logo is barely visible in the places it renders. The webp
mark is dark-dominant and sits on dark surfaces — the auth shell runs
`class="dark"` and several call sites draw the logo inside
`bg-foreground` chips that were designed for a white `currentColor`
glyph. The old Comp AI SVG inherited text color and stayed legible in
both themes. The raster replacement does not.

## Where it fails

- `apps/app/components/auth-shell.tsx` — logo at `size-5`/`size-6` on a
  dark muted panel. Dark mark on dark background.
- `apps/app/components/landing/product-shot/company-mark.tsx` and
  `company-sheet.tsx` — `bg-foreground` square + `text-background`
  glyph. The classes no longer do anything; the colored mark floats on
  the dark chip.
- `apps/app/components/app-header.tsx`, `agent-panel.tsx`,
  `agent-scope-badges.tsx` — small sizes on theme-dependent surfaces.

## Directions

- Light chip: wrap the mark in a `bg-background`/`bg-white` surface so
  the artwork stays as designed. Closest to the site's own treatment.
- Wordmark: pair the mark with `Mynaani` text where space allows.
- Derived assets: produce a light-on-dark variant from the webp only if
  a chip treatment reads badly at 13–18px.

## Constraints

- `packages/ui` owns the fix; call sites do not get one-off overrides.
- Do not recolor the artwork itself beyond a sanctioned variant.
- Keep the favicon set untouched — those surfaces are light already.
