# Security Review — GastoClaro
**Date:** 2026-06-17
**Reviewer:** Security Agent

## Executive Summary

GastoClaro has a solid foundation: all SQLite queries are parameterized, passwords use scrypt with timing-safe comparison, Stripe webhook signatures are verified with HMAC-SHA256, and the admin route is properly gated server-side. However, three critical gaps demand immediate action — a hardcoded default admin account seeded on every boot, live Firebase credentials committed to git, and a complete absence of rate limiting on any endpoint. These three issues together would allow a remote attacker to enumerate the admin account, access Firebase resources, and brute-force credentials at full network speed.

---

## Critical Issues (fix immediately)

### [CRIT-1] Default admin credentials hardcoded and seeded on every boot
- **File:** `server/db.ts:323` and `.env.example:31-32`
- **Risk:** `seedAdmin()` boots with email `adm` and password `adm2070` unless `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars override it. These exact defaults are published in `.env.example`. Worse, on every server restart the function *promotes* the existing account back to `superadmin` even if an operator had previously demoted it (`if (existing.role !== "superadmin") { updateUserFields(...) }`), making any defensive downgrade silently reversible.
- **Fix:** Remove defaults entirely. Throw at startup if env vars are missing or the password is under 12 characters:
```typescript
function seedAdmin(): void {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) must be set.");
  }
  // ... rest unchanged
}
```

### [CRIT-2] Live Firebase credentials committed to git
- **File:** `firebase-applet-config.json` (project root, git-tracked)
- **Risk:** Contains a live `apiKey`, `appId`, `projectId`, and Firestore database ID. Any repository reader can use these to query Firestore, enumerate Firebase Auth users (if enabled), and gain permanent access — this is in git history even after file deletion.
- **Fix:** (1) Rotate the Firebase API key in Google Cloud Console immediately. (2) Add `firebase-applet-config.json` to `.gitignore`. (3) Move config to `VITE_FIREBASE_*` environment variables.

### [CRIT-3] No rate limiting on any endpoint
- **File:** `server.ts` (entire file — no rate limiting middleware found)
- **Risk:** `POST /api/auth/login`, `/api/auth/register`, and `/api/auth/google` have zero throttling, enabling brute-force password attacks at network speed. AI endpoints can be hammered by valid-token holders to exhaust Anthropic API cost. `/api/market-data` triggers 26 Yahoo Finance API calls per request with no auth or cache.
- **Fix:**
```typescript
import rateLimit from "express-rate-limit";
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/ai", aiLimiter);
```

---

## High Issues

### [HIGH-1] Unvalidated `symbol` route param passed to Yahoo Finance (unauthenticated endpoints)
- **File:** `server.ts:207-258` — `GET /api/historical/:symbol` and `GET /api/asset-context/:symbol`
- **Risk:** `symbol` from `req.params` goes directly to `yahooFinance.chart(symbol, ...)` and `yahooFinance.quote(symbol)` with no auth and no format validation. Error details including library internals are returned to the caller.
- **Fix:** Validate with `/^[A-Z0-9^=\-.]{1,20}$/i`, add `requireAuth`, and strip internal error details from 500 responses.

### [HIGH-2] Image uploads accepted without size, count, or MIME type validation
- **File:** `server.ts:87-88`, `server/anthropic.ts:191-206`
- **Risk:** `imagesData` is an uncapped array. Each element's `mimeType` is a free string injected directly into the Claude prompt. A user can send a crafted `mimeType` value to attempt prompt injection.
- **Fix:** Whitelist MIME types (`image/jpeg`, `image/png`, `image/gif`, `image/webp`), cap at 5 images and 4 MB each. Sanitize the mimeType before embedding in the prompt.

### [HIGH-3] No CORS policy — any origin can make authenticated API requests
- **File:** `server.ts` — no `cors()` middleware
- **Risk:** No `Access-Control-Allow-Origin` restriction. Combined with tokens in `localStorage`, a cross-origin script could use a logged-in user's token to call any API endpoint.
- **Fix:** `app.use(cors({ origin: process.env.PUBLIC_BASE_URL || "http://localhost:3000" }));`

### [HIGH-4] Client-controlled `contextData` passed verbatim to Claude — prompt injection
- **File:** `server.ts:131-138`, `server/anthropic.ts:366-380`
- **Risk:** `/api/ai/analyze-asset` accepts `contextData` as arbitrary JSON from the request body and embeds it in the system prompt. Any authenticated user can craft adversarial content to manipulate the AI.
- **Fix:** Fetch `contextData` server-side using only the validated `symbol`, never trust client-supplied analysis context.

### [HIGH-5] No session invalidation on role/ban changes
- **File:** `server/db.ts:175-187`, `server/db.ts:279-289`
- **Risk:** If a user's role is downgraded from `admin` to `user`, all their existing 30-day sessions remain valid. Banning a user does not immediately invalidate active sessions.
- **Fix:** Call `db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId)` inside `updateUserFields` when `role` or `banned` changes. Add periodic cleanup for expired sessions.

---

## Medium Issues

### [MED-1] Session token in `localStorage` — XSS-exfiltrable
- **File:** `src/context/AuthContext.tsx:54`, `src/services/claude.ts:10`
- **Risk:** `gastoclaro_token` stored in `localStorage` is readable by any JavaScript on the page domain.
- **Fix:** Migrate to `httpOnly; SameSite=Strict` cookies. Add a Content Security Policy header via `helmet`.

### [MED-2] Minimum password length is 6 characters
- **File:** `server/auth.ts:239`
- **Risk:** 6-character passwords are brute-forceable offline if the SQLite database is compromised.
- **Fix:** Increase to 8-12 characters minimum.

### [MED-3] Open redirect risk in `redirectTo` and Stripe URL origin fallback
- **File:** `src/pages/Login.tsx:14`, `server/auth.ts:579-583`
- **Risk:** `redirectTo` from `location.state` is used directly in `navigate(redirectTo, ...)`. The Stripe success/cancel URL falls back to `req.headers.origin` (client-controlled) when `PUBLIC_BASE_URL` is unset.
- **Fix:** Enforce `redirectTo.startsWith("/") && !redirectTo.startsWith("//")`. Require `PUBLIC_BASE_URL` in production.

### [MED-4] Error messages expose internal details on 500 responses
- **File:** `server.ts:99, 118, 144, 204, 219, 257`
- **Risk:** `error.message` from Claude API, Yahoo Finance, and DB errors is returned directly to clients in 500 responses.
- **Fix:** Log full error server-side; return a generic message to the client for unexpected errors.

### [MED-5] Firebase/Firestore credentials live but integration appears unused
- **File:** `src/firebase.ts`, `firebase-applet-config.json`
- **Risk:** Firebase Auth and Firestore are initialized but the app uses its own SQLite auth. Maintaining live, unused cloud credentials is unnecessary attack surface.
- **Fix:** If Firebase is not in production use, disable the project or restrict the API key's allowed referrers.

### [MED-6] `ensureColumn` builds raw DDL strings with string interpolation
- **File:** `server/db.ts:70-75`
- **Risk:** `db.exec(\`ALTER TABLE ${table} ADD COLUMN ${ddl}\`)` bypasses parameterized query protections. Arguments are currently hardcoded so no injection is possible today, but the pattern is dangerous if extended.
- **Fix:** Add a whitelist check: `if (!["users","payments"].includes(table)) throw new Error("Unknown table")`.

### [MED-7] `/api/market-data` is unauthenticated and triggers N external calls per request
- **File:** `server.ts:161-205`
- **Risk:** Any unauthenticated party can trigger 26+ Yahoo Finance `quote()` calls per HTTP request with no caching at the response level.
- **Fix:** Add `requireAuth` and cache the full response for 60 seconds server-side.

---

## Low / Informational

| # | Finding | File | Recommendation |
|---|---------|------|----------------|
| LOW-1 | Google token verified via Google's `tokeninfo` endpoint (network round-trip, undocumented rate limits) | `server/auth.ts:193-213` | Switch to local JWKS verification using `google-auth-library` |
| LOW-2 | `data/` directory permissions not explicitly restricted | `server/db.ts:8-11` | `chmodSync(DATA_DIR, 0o700)` after `mkdirSync` |
| LOW-3 | No `helmet` middleware — missing security headers (CSP, X-Frame-Options, etc.) | `server.ts` | `app.use(helmet())` |
| LOW-4 | `listUsers()` returns `password_hash` column in memory before `publicUser()` strips it | `server/db.ts:164` | Select only non-sensitive columns in the query |
| LOW-5 | `PUBLIC_BASE_URL` optional but critical in production for Stripe URL construction | `.env.example` | Throw at startup if `NODE_ENV=production` and `PUBLIC_BASE_URL` is unset |
| LOW-6 | `react-markdown` renders AI-generated investment analysis — confirm `rehype-raw` is not in use | `package.json` | Audit plugin chain; never include `rehype-raw` with AI-generated content |
| LOW-7 | Session token entropy and scrypt hashing are excellent — no change needed | `server/db.ts:269,106` | Keep as-is |

---

## Positive Findings

- **Parameterized SQL everywhere** — no string concatenation in SQL queries found in `server/db.ts`
- **Timing-safe operations** — `crypto.timingSafeEqual()` used for both password verification (`db.ts:115`) and Stripe webhook validation (`payments.ts:44`)
- **Strong password hashing** — scrypt + random 16-byte salt + 64-byte output
- **Stripe webhook correctly implemented** — raw body preserved before `express.json()`, HMAC-SHA256 with 5-minute replay window (`payments.ts:24-57`)
- **Admin route server-side gating** — `router.use(requireAdmin)` applied globally so client-side checks in `Admin.tsx` are UX-only
- **No Google auto-linking for admin accounts** — `server/auth.ts:315-319` explicitly blocks linking Google credentials to admin-role accounts
- **Report IDOR protection** — `getReportById(id, userId)` always includes `AND user_id = ?`
- **`.gitignore` excludes `.env*`** — actual secrets not committed (only the firebase config was)
- **HTML export sanitized** — `escapeHtml()` used consistently in `exportUtils.ts`

---

## Recommended Next Steps (prioritized)

| Priority | Action |
|----------|--------|
| P0 — Today | Rotate Firebase API key; remove `firebase-applet-config.json` from git history |
| P0 — Today | Remove default admin credentials from `seedAdmin()`; require env vars at startup |
| P0 — Today | Add `express-rate-limit` to auth + AI endpoints |
| P1 — This week | Validate `symbol` params; add auth to market/historical endpoints |
| P1 — This week | Validate image MIME type + size + count before passing to AI |
| P1 — This week | Add CORS policy; stop accepting `contextData` from client |
| P1 — This week | Invalidate sessions on role/ban change; add expired session cleanup |
| P2 — Next sprint | Add `helmet`; migrate tokens from `localStorage` to `httpOnly` cookies |
| P2 — Next sprint | Require `PUBLIC_BASE_URL` in production; sanitize `redirectTo` |
| P3 — Backlog | Increase min password to 8+; add Google JWKS local verification; restrict `data/` perms |
