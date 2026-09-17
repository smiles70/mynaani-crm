# Intake — mynaani.com senior-care inquiry → CRM contact

**Date:** 2026-09-18
**Status:** shipped to production — live form submit files a Contact
**Process:** v9.51 pipeline; **research ran first** per user request —
see `.ai/research/2026-09-18-website-form-intake.md`

## Problem statement

When a senior-care facility fills out an inquiry on www.mynaani.com,
it must appear in the CRM automatically. Today it cannot: the site's
`for-communities` and `partners` pages end in a `mailto:` link, so
inquiries arrive as unstructured email (if the visitor's mail client
even opens) with no attribution, no record, and no agent follow-up.

## Current state

- Site = RetallAi frontend (Vite SPA, Cloudflare), no `<form>` on
  either page — only `mailto:help@mynaani.com`.
- CRM = full capture pipeline already built: tracking tag,
  `POST /api/t/e` collector, filing to Contact, `agent.contactCreated`
  task per new contact.
- Gap = the form itself + the tag install + the origin allow-list.

## Required state

1. A real, accessible form on `/for-communities` (senior-care
   facility inquiry) that files a Contact in the CRM on submit.
2. CRM tag installed site-wide on mynaani.com so submissions (and
   page attribution) record.
3. Origin allow-list + site id configured on production CRM.
4. Form submission → Contact → agent task, verified e2e on staging
   before production on either repo.

## Workstreams (stage 5 pre-draft)

- WS-A (this repo): provision site id + allow-list; add contract
  test asserting a `for-communities` field set files correctly.
- WS-B (RetallAi repo): build the form (geragogy contract: real
  labels, large hit areas, inline success, no navigation) + install
  the tag in `index.html`.
- WS-C (verify): staging e2e — submit on staging site → contact in
  staging CRM; then production.

## Open items (block implementation, not intake)

1. Field list for the facility form — proposal: community/facility
   name, contact name, email, phone (optional), message, consent.
2. Does `/partners` get the same treatment in this intake or a
   follow-up?
3. Who deploys the RetallAi frontend — same staging-first gate?

## Carried issues (keep — do not lose)

1. Test contacts remain: `uat.testuser@mindbyndr.com` (staging) and
   `uat.prod@mindbyndr.com` (production). Delete via the Contacts UI
   or on request.
2. Honeypot field: tracker drops empty fields but a bot that fills
   `website` would file a junk contact. `CONTACTS_PER_HOUR` bounds
   it; the Noni backend also rejects honeypot fills.

## Edge cases

Seeded in the research memo — top ones: double-submit dedupe,
spam caps, sensitive-field stripping, Safari cookie limits, tag
rotation, and the mailto link staying as a secondary contact path.
