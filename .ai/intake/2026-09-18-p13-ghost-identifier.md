# Intake — Placeholder text reads as a pre-filled username

**Date:** 2026-09-18
**Status:** shipped to staging — verified e2e
**Process:** v9.51 pipeline (see `PROCESS_AGENTS.md` §2)

## Problem statement

The sign-in identifier field shows `steven@mindbyndr.com` as
placeholder text. It renders like a real pre-filled value. Users type
their name believing the field is empty or partially filled, and get
confused or blocked. Reported in UAT on the production sign-in page.

## Current state

- `password-sign-in.tsx` sets `placeholder="steven@mindbyndr.com"` —
  a concrete email address in field-grey.
- The user's mental model: the box already contains something; their
  typing either appends to a ghost or fights it.

## Required state

1. All sign-in fields are visually empty — nothing that resembles a
   typed value.
2. If a hint is wanted at all, it must be unmistakably instructional
   (e.g. label-level copy or "e.g." phrasing outside the box), never
   an email address inside the field.
3. Same treatment anywhere else a value-shaped placeholder exists.

## Edge cases

- Placeholder is also the only cue that bare names are accepted —
  the "Email or name" label carries that; a format hint can live in
  the label/description if needed.
- Autocomplete/autofill still works — placeholders don't affect it.
- Other forms (`research-form.tsx` "Paste the key" is instructional,
  not value-shaped — out of scope unless it also misleads).

## Open items

- Whether to keep a format hint outside the field or none at all.
