# Intake — Debrand trycompai, rebrand as Mynaani

**Date:** 2026-09-16
**Status:** implemented — on staging, awaiting production promotion
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Parent intake:** `2026-09-16-p1-fork-bootstrap.md` (scope item 1)
**Brand source:** https://www.mynaani.com (asset bundle inspected 2026-09-16)

## Problem statement

The fork still presents Comp AI identity in user-facing surfaces:
the logo component, page metadata, sign-in shell, web manifest, landing
page, seed data, and agent instructions. Mynaani needs its own identity
on every surface a user sees, taken from mynaani.com.

## Brand reference (from mynaani.com bundle)

- Logo: `/mynaani-logo.webp`, 430x447, alpha. Source:
  `https://www.mynaani.com/mynaani-logo.webp`.
- Palette: blue `#4A6FA5` (primary), gold `#C9A24D`, green `#4A6D5C`,
  red `#A84C4C`, ink `#222222`, gray `#B0B0B0`, muted `#5A5A55`,
  backgrounds `#FAFAF8` / `#F4F4F2`.
- No standalone SVG mark ships on the site. Favicons must be generated
  from the webp.

## Scope

User-facing surfaces, 323 `compai` matches in 54 files total:

1. `packages/ui/src/components/logo.tsx` — replace Comp AI SVG mark.
   `@crm/ui` is the single source of truth for UI.
2. `apps/app/app/layout.tsx` — title template, description, icon refs.
3. `apps/app/public/site.webmanifest` + favicon set — names and icons.
4. `apps/app/components/auth-shell.tsx` — sign-in surface copy.
5. `apps/app/components/landing/*` — product-shot copy, footer, links.
6. `apps/agent/agent/instructions.md` — agent self-identity.
7. `packages/telemetry/src/project.ts` — telemetry project name.
8. `packages/db/prisma/seed.ts` — seed workspace/user names.
9. `README.md` — repo-facing identity.

## Out of scope

- `CHANGELOG.md` — upstream history. Never rewritten.
- `LICENSE` — MIT attribution to Comp AI stays. Removing the upstream
  copyright line breaches the license. A Mynaani line may be added.
- `docs/plan/*`, ADRs — historical documents.
- Test fixtures using `*.compai.*` domains — fake data, not branding.
  Rename only if a fixture renders in a user-facing surface.
- Package names (`@crm/*`) — already brand-neutral.
- `upstream` remote and sync mechanics.

## Constraints

- Branding is a declared differentiator seam (`PROCESS_AGENTS.md` §4).
  Keep the diff small and centralized so upstream merges stay cheap.
- Repo rules apply in full: no code comments, no coauthor trailers,
  no per-package `.env`.
- Client components never import server packages (`AGENTS.md`).
- Single-tenant internal tool, two users. Landing page still ships but
  serves no acquisition purpose. Decide: rebrand in place or strip.

## Edge cases

- Logo component renders `currentColor`. A raster webp cannot inherit
  color. Decide: keep raster logo, or trace an SVG/wordmark.
- Favicon set (`favicon.svg`, `favicon-96x96.png`, `apple-touch-icon.png`)
  must be regenerated from the webp. Missing sizes break PWA install.
- Metadata `title.template` strings appear in tests and e2e assertions.
  Renaming may break test expectations — update both.
- `seed.ts` workspace slug may be referenced by tests and by
  `ALLOWED_SIGN_IN` bootstrap flow. Check before renaming.
- `slack-channels.tsx` and agent tool copy mention compai domains in
  user-visible strings — verify each match is real branding vs fixture.

## Open items

- Wordmark vs logo-only in shell and sign-in.
- Apply Mynaani palette to `globals.css` theme tokens, or keep neutral.
- Landing page: rebrand copy or remove for internal use.
