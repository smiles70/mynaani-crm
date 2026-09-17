# Research — Logo visibility on dark surfaces (p4)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p4-logo-visibility.md`
**Question:** How should a dark-dominant raster logo render on dark
surfaces and `bg-foreground` chips?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| github.com/w3c/wcag/pull/4402 | W3C WCAG | standards work | Logos are exempt from contrast SCs, but when a logo acts as a link the control must still be identifiable — the author's choice isn't a pass when contrast fails |
| madebyevoke.com/blog/logo-for-dark-mode | Evoke Studio | industry practice | Mechanical inversion produces washed-out results; correct approach is a considered light-on-dark variant or a backing surface |
| mgifford.github.io ACCESSIBILITY.md | Mike Gifford / civicactions | a11y reference | Transparent images disappear on unexpected backgrounds — provide a tested backing surface or theme-specific asset |
| docs/design.md | this repo | design contract | Flat white, neutral greys, one brand color; chips are the established containment pattern |
| packages/ui/src/components/logo.tsx | this repo | code | Logo is now an `<img>`; `currentColor` tricks at call sites are inert |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Light chip behind the mark (`bg-background` rounded surface, padding) | Matches the design system's chip language; artwork stays untouched; works in both themes | High |
| `prefers-color-scheme` swapped asset | Needs a sanctioned light-on-dark variant of the artwork; none exists and recoloring the mark is off-limits per intake | Medium |
| Leave as-is | Illegible on the dark auth shell — the reported problem | Rejected |

## Selected approach

Give `Logo` in `packages/ui` a `surface` prop — `"default"` renders the
bare `<img>`, `"chip"` renders the mark inside a light rounded chip
(`bg-background` + border + padding, radii from the scale). Auth shell
and the `bg-foreground` product-shot chips use `surface="chip"`. Dark
surface coverage comes from the chip, not from recolored artwork.
Where the logo sits on a normal background (app header, badges) the
bare mark is fine at small sizes.

## Edge cases

- Favicon set stays as generated — browser chrome is light or adaptive,
  and the manifest icons were made from the same webp.
- Chip radius: `rounded-md` (5px) for a small control-sized chip, per
  design.md scale — no literal radii.
- At 13–18px sizes the mark is small; the chip adds contrast more than
  size. Verify on the auth shell screenshot after deploy.
- `company-mark.tsx` previously drew a dark square + light glyph — with
  a light chip the square inverts; keep the chip inside the existing
  span, don't stack two chips.
