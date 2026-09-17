# Research (pre-intake) — mynaani.com form → CRM contact pipeline

**Date:** 2026-09-18
**Requested as:** research *before* intake — the intake follows this memo
**Question:** How do senior-care-facility inquiries on
www.mynaani.com land in the CRM as contacts?

## The premise needs correcting

The site has **no form to connect**. `ForCommunitiesPage.tsx` and
`PartnerPage.tsx` (RetallAi frontend, the Vite SPA serving
mynaani.com behind Cloudflare) end in a `mailto:help@mynaani.com`
CTA. So the real work is two halves: (a) build the form on the site,
(b) wire its submissions into the CRM.

## Sources

| # | Source | Org | Type | Finding |
| --- | --- | --- | --- | --- |
| 1 | docs/tracking.md | this repo | code doc | Complete form→contact pipeline exists: tag `/t/crm.js` + tracker `/t/<siteId>.js`, collector `POST /api/t/e` (anonymous, 204), filing service turns submissions into Contacts |
| 2 | docs/tracking.md §collector | this repo | code doc | Ingest gauntlet: UA→site id→Origin allow-list→visitor id→replay check→host allow-list→atomic rate limit; sensitive fields stripped browser-side |
| 3 | docs/tracking.md §filing | this repo | code doc | `TrackingFilingService.file` — dedupe via `dedupeKey`, email race handled, `CONTACTS_PER_HOUR` cap, `agent.contactCreated` fires an AgentTask |
| 4 | RetallAi frontend ForCommunitiesPage.tsx | sibling repo | code | No `<form>`; `mailto:help@mynaani.com?subject=Community partnership inquiry` is the only CTA |
| 5 | RetallAi frontend PartnerPage.tsx | sibling repo | code | 70 lines, same mailto pattern |
| 6 | mynaani.com/for-communities | live site | network | 392-byte Vite SPA shell on Cloudflare; all content client-rendered |
| 7 | apps/app/app/t/ routes | this repo | code | `/t/crm.js` loader + `/t/<siteId>.js` tracker, anonymous, edge-cached |
| 8 | Settings → Tracking & Analytics | this repo | code | Site id provisioning, origin allow-list, verify tool, pause/kill switch all exist in-app |
| 9 | apps/app/proxy.ts ANONYMOUS | this repo | code | `/t` routes are unauthenticated by design |
| 10 | nngroup.com — form vs mailto UX | Nielsen Norman | UX research | mailto CTAs lose mobile users and produce unstructured, untracked inquiries |
| 11 | Baymard — lead-gen form research | Baymard | UX lab | Short forms with clear value copy out-convert email links on B2B sites |
| 12 | OWASP — public form abuse | OWASP | security | Public forms need rate limits + field sanitization — the collector already enforces both |
| 13 | NIST SSDF — PII minimization | NIST | security | Collector strips sensitive fields + never stores IP — compliant by design |
| 14 | Cloudflare Pages + first-party scripts | Cloudflare | platform docs | A `<script src>` tag in index.html works unchanged on CF Pages |
| 15 | Stripe/Segment snippet install patterns | Stripe/Segment | FAANG-tier | Single-tag loaders that inject a configured tracker — same shape the CRM already implements |
| 16 | Google Tag Manager injection quirks | Google | platform docs | `?site=` survives GTM's attribute stripping — the loader already handles this |
| 17 | Mailbox sync (settings → Connections) | this repo | code | Alternative path: emails to help@mynaani.com could file contacts via the mailbox pipeline — no form needed but loses attribution |
| 18 | Retell ingestion (original vision) | retell-mynaani | sibling repo | Voice/chat intake is a separate planned stream — this workstream is web forms only |
| 19 | dedupeKey/attach semantics | this repo | code | Double-submits collapse; retries refile — idempotent by construction |
| 20 | HN on contact-form spam | Hacker News | discussion | Public forms attract scripted submissions; the per-hour contact cap + scripted() replay check bound this |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Build real forms on the site + install the CRM tag (`/t/crm.js?site=<id>`) | Native path: form submit → collector → filed Contact + agent task + attribution. Zero new backend code | High |
| Direct `fetch` POST to `/api/t/e` | Reimplements dedupe/batching/limits in site code; tracker already does it correctly | Low |
| Keep mailto + mailbox sync of help@mynaani.com | No site work; but inquiries stay unstructured, no attribution, mixes a human inbox with the CRM | Medium (fallback) |
| Third-party form tool (Typeform/Jotform) → webhook | New vendor, new webhook seam, weaker PII posture | Rejected |

## Selected approach

**Two halves, one tag:**

1. Site (RetallAi frontend, sibling repo — separate workstream):
   accessible `<form>` on `/for-communities` (and `/partners` if
   wanted) with named fields; native `submit` posts nothing itself —
   the tracker captures it; JS fallback handler can `preventDefault`
   and still let the tracker record the submit event.
2. CRM (this repo): create the tracking site in Settings → Tracking &
   Analytics, allow-list `mynaani.com`/`www.mynaani.com`, hand the
   rep-facing tag to the site workstream.
3. Submissions file as Contacts with firstTouch/lastTouch attribution;
   `agent.contactCreated` gives the agent a task for each inquiry.

## Failure cases (top 30, abridged to load-bearing)

1. Site id rotated/stolen → settings rotate; tag 404s → fail visibly in verify tool. ✔ exists
2. Origin not allow-listed → collector refuses; verify tool catches at install. ✔
3. Form fields named `password`/`hidden`/card-like → stripped client-side by design. ✔
4. Scripted spam flood → `scripted()` replay check + `CONTACTS_PER_HOUR` + `EVENTS_PER_MINUTE`. ✔
5. Duplicate submit (double-click) → `dedupeKey` one-minute collapse. ✔
6. Tracker JS error on site → tracker is never-throw ES5. ✔
7. SPA navigation — form inside React SPA → tracker wraps history/pushState already. ✔
8. GTM-injected tag loses data-site → `?site=` carrier exists. ✔
9. Cloudflare bot fight mode blocks /t/ scripts → check CF settings at install. Preflight.
10. Safari ITP shortens cookie life → attribution degrades, filing unaffected. ✔
11. Mailto removal → keep email CTA as secondary under the form. Planned.
12. Required-field accessibility — real labels, not placeholders (p13 lesson). Planned.
13. Form without action attribute in React → submit event still fires; tracker listens for submit. Verify.
14. Senior users: geragogy skill governs the form design (RetallAi contract) — large text, no decorative distraction. Planned.
15. PII in field names — `clean()` drops sensitive-named fields. ✔
16. Rate limit exhaustion → refused batch is dropped not retried; acceptable for forms, noted.
17. Visitor id blocked browsers → batch dropped; filing is best-effort by design.
18. help@mynaani.com still receives mailto clicks → no lost channel.
19. Cross-subdomain (www vs apex) → allow-list both.
20. `fetch` keepalive/beacon reliability on page unload → tracker batches on visibilitychange. ✔ (verify)
21. Context.dev absent → contact still files; enrichment stays pending — fine.
22. Contact cap race → loser attaches to winner. ✔
23. Staging test forms pollute prod → separate site ids per env? Tracking sites are per-install — test on staging install. Planned.
24. CSRF — collector is POST+Origin-checked anonymous; CORS-safe. ✔
25. Legal/consent checkbox on form → add required consent field (senior-care audience). Planned.
26. Form success state — inline confirmation, not navigation (cognitive-load contract). Planned.
27. Agent task spam per contact → contactCreated fires once per contact. ✔
28. Site deploy cadence (RetallAi staging-first) — form ships to its staging first per its own AGENTS.md. ✔
29. Field mapping — `company`/`community name` field should map to Contact company — filing uses email-domain + name splitting; verify community name lands in fields not lost. Verify.
30. Kill switch — pause tracking stops capture within 5 min; filed contacts persist. ✔

## Codebase conflict check

No conflicts — this is the pipeline the feature exists for. RetallAi
repo has its own AGENTS.md (staging-first, geragogy contract) — the
site half must follow *that* repo's rules, not this one's.

## Gaps needing user input

- Form fields desired (community name, contact name, email, phone,
  message, consent?).
- Whether `/partners` also gets a form.
- Who owns the RetallAi deploy to production (human-gated there too).
