# Research — magic-link sign-in for sharkwheel-crm (Stage 2)
Decision: passwordless sign-in path for zack@ + bill@ under
ALLOWED_SIGN_IN, matching the Noni/mynaani.com passwordless house style.

## Source table (28 sources, grouped)

### better-auth core (primary docs + source + issues)
1. better-auth magic-link docs — better-auth.com/docs/plugins/magic-link
   Server magicLink({sendMagicLink}) + client magicLinkClient();
   POST /sign-in/magic-link; auto-signs-up unless plugin disableSignUp.
2. magic-link source index.ts — github.com/better-auth/.../magic-link
   expiresIn default 300s; tokens consumed atomically first call;
   allowedAttempts deprecated (warns if set).
3. PR #408 (merged) — magic links were sent to unregistered emails
   under disableSignUp; now USER_NOT_FOUND when plugin flag set.
4. PR #5089 (open) — disableSignUp as function; not needed — our
   ALLOWED_SIGN_IN user.create hook already gates creation.
5. signup_disabled error doc — recommends databaseHooks gate over
   disableSignUp for custom allow-rules — exactly our hook pattern.
6. Plugin concept doc — server+client plugin pairing required.
7. GHSA-965c-763c-88jm (via auth-spec rules) — cross-purpose token
   confusion fixed by namespaced verification records (magic-link:).

### NestJS integration
8. ThallesP/nestjs-better-auth README — full handler mount; plugin
   endpoints ride the same /api/auth mount, no controllers needed.
9. ThallesP discussion #162 — plugins pass through toNodeHandler;
   no allowlist; AuthModule mounts the complete instance.
10. SaaS Stack NestJS guide — mount before Nest body parser;
    setGlobalPrefix does not affect middleware (this app already
    mounts correctly — verified /api/auth/* routes serve today).
11. nestm-dev/better-auth — same mount-outside-router confirmation.

### Resend / deliverability
12. Resend magic-link deliverability KB — align from-domain with
    link domain; dedicated transactional subdomain advised.
13. Resend top-10 deliverability — subdomain for transactional,
    DMARC, match URLs to sending domain, disable link/open tracking.
14. Resend setup guide — domain + sending-only API key; REST API
    fine (matches existing lead-notify.service.ts pattern).
15. Resend email-authentication guide — SPF/DKIM handled by Resend
    once domain verified.

### Passwordless security literature
16. Supabase passwordless docs — one-time use; 60s resend throttle;
    1h expiry default.
17. Auth0 passwordless best-practices — newest code/link invalidates
    earlier ones; short TTL.
18. auth-spec token-lifecycle rules (himself65/auth-spec) — ≥128-bit
    tokens, hashed at rest, ATOMIC consume (single conditional
    write), short TTL (magic link ≤15min), purpose-binding.
19. auth-spec magic-link rules — generic success (don't reveal
    existence); pre-account-hijack strip for unverified accounts;
    callback URL allowlist; never synthesize placeholder addresses.
20. Pangea magic-link security — email account is the weakest link;
    unpredictable token; single-use; limit concurrent sessions.

### Corporate mail-scanner evidence (the operational trap)
21. Supabase/auth issue #1214 — Barracuda/Office365 SafeLinks
    prefetch burns one-time links; HEAD-request mitigation noted.
22. Descope docs — email-scanner detection + confirm screen pattern.
23. duyet/oma issue #254 — canonical fix: GET renders confirmation,
    POST consumes; scanners don't submit forms.
24. openreply issue #99 — REAL timeline evidence: Zoho scanner
    consumed token 90s after send; user's click hit "already used"
    AND left a valid session in the scanner's hands.
25. StackExchange thread — same root cause; confirm-param or
    CAPTCHA mitigations discussed.

### Kiro/spec + house precedent
26. Noni backend/services/email_credential.py — house precedent:
    provider-verified email → HMAC bearer, no passwords (locally read).
27. env.validation.ts:47-49 — ALLOWED_SIGN_IN is the single gate;
    magic-link creation passes through user.create.before hook.
28. lead-notify.service.ts — existing Resend call shape to copy
    (RESTD API, apiKey+from+to, honest no-op when unconfigured).

## Decision matrix

| Option | Confidence | Fit |
|---|---|---|
| **A: better-auth magicLink + Resend** | **HIGH — chosen** | Plugin exists in installed ^1.6.25; rides existing mount; mail rail already coded (lead-notify) — only env + callback wiring. Sign-in page button is a small additive UI. ALLOWED_SIGN_IN hook keeps gating. |
| B: Google OAuth | Medium | Double-win for mailbox sync BUT depends on sharkwheel.com being Google-backed — unverified; bigger blast radius. Deferred. |
| C: Server-minted temp passwords | Low | No change-password UI exists → temp becomes permanent. Weak credential hygiene for a CEO account. |
| D: emailOTP instead of link | Medium | Survives scanners (code can't be prefetched) but forces copy-paste UX; magic link is the house pattern. Fallback if scanner issue hits hard. |
| E: Forge-reset flow (sendResetPassword+SMTP) | Low | More code, more surface, same email rail needed anyway. |

## Key design decisions from sources
- Plugin disableSignUp = **false** (allow self-creation) — ALLOWED_SIGN_IN
  user.create.before hook is the gate (better-auth's own recommended
  pattern, source #5).
- expiresIn: **600s** (10min — inside the ≤15min security bound,
  friendlier than 5min for a CEO checking email on a phone).
- Token: 32-char random from library (≥128-bit) — meets #18.
- Atomic consumption is library-provided (source #2) — no work.
- **Scanner mitigation**: our sendMagicLink sends the better-auth URL
  but the email copy ALSO tells users to request a new link if it
  arrives "already used" — PLUS we configure `generateToken` to keep
  default; scanner risk is documented as residual with Option-D
  (emailOTP) as the ready fallback. A confirm-page middleware is
  scoped-out for v1 (complexity vs 2 users) — recorded as open item.
- from-domain: LEAD_NOTIFY_FROM must be a Resend-verified domain —
  Resend rules want URL↔from domain match where possible; magic link
  URL is api-production-27f4f... (railway domain) — acceptable
  residual; a custom domain later improves both trust+deliverability.
- Client: `magicLinkClient()` added to the app's auth client;
  sign-in page gains ONE action ("Email me a sign-in link") — geragogy:
  one button, one input, no branching.
- Generic success response (don't reveal whether email allowed).
- Residual risk item: non-allowlisted emails hit the user.create
  hook → FORBIDDEN at verify time (account never created) — correct.
