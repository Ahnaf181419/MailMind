# FacultyInbox AI — Backend Architecture & API Documentation

Stack: **Express (Node.js) + MongoDB (Mongoose) + Better Auth**. Written to be handed to an AI coding agent (Antigravity) as full context — every field, env var, and edge case is spelled out so nothing needs to be guessed.

---

## 1. High-Level Architecture

```
                         ┌─────────────────────────┐
                         │   Next.js Frontend       │
                         │ (ported from Lovable UI) │
                         └───────────┬─────────────┘
                                     │ HTTPS (JSON)
                                     ▼
                         ┌─────────────────────────┐
                         │   Express API Server     │
                         │  - Better Auth middleware│
                         │  - REST controllers       │
                         │  - Validation (zod)       │
                         │  - Rate limiting          │
                         │  - Caching layer          │
                         └───────────┬─────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────────┐
     │ MongoDB (Mongoose)│  │ AI Classification │  │ Ingestion Source     │
     │ - users/sessions  │  │ Service (LLM call) │  │ - Mock JSON (phase 1)│
     │ - threads/messages│  │                    │  │ - Gmail API (phase 2)│
     │ - digestCache      │  └──────────────────┘  └─────────────────────┘
     └─────────────────┘
```

**Phasing**: Phase 1 (now) = mock data ingestion. Phase 2 (later) = Gmail OAuth read-only sync replaces the mock ingestion source; everything downstream (classification, storage, API, frontend) stays identical. This is why ingestion is isolated behind one internal interface (`IngestionProvider`) — swapping mock → Gmail later should not touch controllers, schema, or the frontend contract.

---

## 2. Environment Variables

**Never hardcode any of these — all read via `process.env` at startup, validated once in a config loader (fail fast if missing).**

```env
# Server
PORT=
NODE_ENV=                  # development | production
CORS_ORIGIN=                # comma-separated allowed origins

# MongoDB
MONGODB_URI=
MONGODB_DB_NAME=            # database name — never hardcode "facultyinbox" etc.

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=             # base URL of the API (used for callback/session cookie domain)
BETTER_AUTH_TRUSTED_ORIGINS=  # comma-separated

# AI Classification
LLM_PROVIDER=                 # e.g. "anthropic"
LLM_API_KEY=
LLM_MODEL=                    # e.g. model identifier, configurable not hardcoded

# Business Rules (configurable, not hardcoded in logic)
FOLLOWUP_THRESHOLD_HOURS=      # e.g. 48 — age before an unanswered thread is flagged
DIGEST_CACHE_TTL_SECONDS=       # e.g. 300
MAX_MESSAGES_PER_THREAD=        # safety cap, e.g. 200

# Gmail (Phase 2 — present in .env.example now, unused in Phase 1)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=
```

Provide a `.env.example` with these keys (no values) in the repo so Antigravity/devs know exactly what to set.

---

## 3. Folder Structure

```
/src
  /config
    env.ts              # loads + validates all env vars, throws on missing required ones
    db.ts               # mongoose connection using MONGODB_URI + MONGODB_DB_NAME
    betterAuth.ts        # better-auth instance config (mongodb adapter)
  /models
    User.ts              # better-auth managed, extended if needed
    Thread.ts
    Message.ts            # (embedded in Thread — see §5 rationale)
    DigestCache.ts
    EmailAccountLink.ts   # phase 2 — stores gmail connection status/tokens (encrypted)
  /providers
    ingestion/
      IngestionProvider.ts   # interface: fetchThreads(userId): RawThread[]
      MockIngestionProvider.ts
      GmailIngestionProvider.ts  # phase 2 stub
    classification/
      ClassifierService.ts   # calls LLM, returns structured category/urgency/etc.
  /middleware
    auth.ts               # session verification via better-auth, attaches req.user
    rateLimiter.ts
    errorHandler.ts        # centralized error → consistent JSON shape
    validate.ts            # zod schema validation wrapper
  /routes
    auth.routes.ts          # mounts better-auth handler
    threads.routes.ts
    digest.routes.ts
    stats.routes.ts
    sync.routes.ts
    health.routes.ts
  /controllers
    threads.controller.ts
    digest.controller.ts
    stats.controller.ts
    sync.controller.ts
  /services
    threadService.ts        # business logic: followUp computation, filtering, pagination
    digestService.ts         # builds + caches AI digest
    followUpService.ts
  /utils
    logger.ts               # pino or similar, structured logs, no PII in logs
    cache.ts                 # simple in-memory TTL cache wrapper (swappable for Redis)
    apiResponse.ts            # standard success/error envelope builders
  app.ts                       # express app assembly (middleware order matters — see §8)
  server.ts                    # bootstraps env, db connection, then listens
```

---

## 4. Auth & Session Management (Better Auth + MongoDB)

- Better Auth is mounted at `/api/auth/*` and handles: sign-up, sign-in, session issuance, session refresh, sign-out. Use its **MongoDB adapter**, pointed at the same `MONGODB_DB_NAME` database so users/sessions/accounts live alongside app data in one connection pool.
- Session strategy: **cookie-based session** (Better Auth default), `httpOnly`, `secure` in production, `sameSite=lax` (or `none` + secure if frontend is on a different subdomain — set via `BETTER_AUTH_TRUSTED_ORIGINS`).
- **All non-auth routes require a valid session.** Middleware (`middleware/auth.ts`) calls Better Auth's session-verification helper on every request, attaches `req.user = { id, email, name }`, and returns `401 UNAUTHENTICATED` if missing/expired.
- **Ownership checks everywhere**: every Thread document has a `userId`. Every query in every controller must filter by `req.user.id` — never trust a thread ID alone as authorization. Return `404 NOT_FOUND` (not 403) when a thread exists but belongs to another user, to avoid leaking existence.
- Session expiry mid-request: if the session cookie is valid but the underlying session record has expired between request start and DB check, treat as `401` and let the frontend redirect to login — do not attempt silent refresh in the same request cycle at MVP stage.

---

## 5. Database Schema (Mongoose)

### 5.1 Thread (core collection)

Messages are **embedded** in the Thread document (not a separate collection) because: thread sizes are small (capped at `MAX_MESSAGES_PER_THREAD`), messages are always read/written in the context of their parent thread, and this avoids join-like lookups for a dashboard that's read-heavy. Tradeoff noted for future: if message volume grows large, split into a separate `messages` collection with `threadId` reference + pagination.

```ts
const MessageSchema = new Schema({
  sender: { type: String, required: true },
  senderIsFaculty: { type: Boolean, required: true },
  sentAt: { type: Date, required: true },
  body: { type: String, required: true },
}, { _id: true, timestamps: false });

const ThreadSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  externalThreadId: { type: String, required: true }, // gmail thread id or mock id — used for upsert/dedup
  subject: { type: String, required: true },
  participants: [{ type: String }],

  messages: { type: [MessageSchema], default: [] },
  messageCount: { type: Number, default: 0 },

  category: {
    type: String,
    enum: ["Meeting", "Class/Schedule", "Student Issue", "Examination",
           "Re-evaluation", "Committee/Admin", "Other"],
    required: true,
    index: true,
  },
  correctedCategory: { type: String, enum: [ /* same enum */ ], default: null },

  urgency: { type: String, enum: ["Low", "Medium", "High", "Critical"], required: true, index: true },
  actionNeeded: { type: Boolean, default: false },
  deadline: { type: Date, default: null },
  aiExplanation: { type: String, required: true },

  classificationStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
    index: true,
  },
  classificationError: { type: String, default: null }, // populated when status = failed

  isRead: { type: Boolean, default: false, index: true },
  needsFollowUp: { type: Boolean, default: false, index: true }, // recomputed, see §7

  lastMessageAt: { type: Date, required: true, index: true },
}, { timestamps: true });

ThreadSchema.index({ userId: 1, externalThreadId: 1 }, { unique: true }); // upsert key, prevents duplicate ingestion
ThreadSchema.index({ userId: 1, urgency: 1, lastMessageAt: -1 }); // dashboard sort/filter
```

Note: `category` reflects the AI's classification; `correctedCategory`, when non-null, is what the UI should display/filter by (effective category = `correctedCategory ?? category`). Keep both so you retain ground truth of what the AI originally said — useful for the "feedback loop" stretch feature and for demo talking points ("faculty corrected 2 of 20 classifications").

### 5.2 DigestCache

```ts
const DigestCacheSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  digestText: { type: String, required: true },
  generatedAt: { type: Date, required: true },
  basedOnThreadIds: [{ type: Schema.Types.ObjectId }], // for cache invalidation checks
}, { timestamps: true });
```

### 5.3 EmailAccountLink (Phase 2 placeholder — create now, unused until Gmail OAuth)

```ts
const EmailAccountLinkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  provider: { type: String, enum: ["mock", "gmail"], default: "mock" },
  gmailAccessTokenEncrypted: { type: String, default: null },
  gmailRefreshTokenEncrypted: { type: String, default: null },
  lastSyncedAt: { type: Date, default: null },
  syncStatus: { type: String, enum: ["idle", "syncing", "error"], default: "idle" },
}, { timestamps: true });
```

Never store raw OAuth tokens — encrypt with a server-side key (separate env var, e.g. `TOKEN_ENCRYPTION_KEY`) before persisting, even though this collection is unused in Phase 1.

---

## 6. API Endpoints

**Base path**: `/api`. **Response envelope (all endpoints)**:

```json
// success
{ "success": true, "data": <payload>, "meta": { ... optional pagination/etc } }
// error
{ "success": false, "error": { "code": "STRING_CODE", "message": "human readable" } }
```

All endpoints below require an authenticated session (`401` if missing) unless noted.

### 6.1 `POST /api/sync/mock`
Triggers ingestion from the mock dataset for the current user (Phase 1 stand-in for a real Gmail sync). Idempotent — reruns upsert existing threads by `externalThreadId` rather than duplicating.

- **Request body**: none required. Optional `{ "reset": true }` to wipe and reseed the current user's mock threads (dev convenience).
- **Response 200**:
  ```json
  { "success": true, "data": { "ingested": 22, "reclassified": 0, "failed": 0 } }
  ```
- **Behavior**: for each mock thread → upsert Thread doc with `classificationStatus: "pending"` → enqueue classification (synchronous call is fine at this scale; see §9) → update doc with result or mark `failed` with `classificationError` set, never block the whole batch on one failure.
- **Edge cases**: empty mock dataset → `{ ingested: 0 }`, not an error. Partial classification failures → still `200`, with `failed` count > 0; failed threads still visible in the UI with a "classification pending/failed" badge rather than disappearing.

### 6.2 `GET /api/threads`
List threads for the current user, filterable and paginated.

- **Query params**: `category` (optional, one of the enum values or `"All"`), `urgency` (optional), `needsFollowUp` (optional boolean), `isRead` (optional boolean), `page` (default 1), `limit` (default 20, max 100), `sort` (default `"urgency"`, alt `"recent"`).
- **Response 200**:
  ```json
  {
    "success": true,
    "data": [ { "id": "...", "subject": "...", "category": "...", "effectiveCategory": "...",
                "urgency": "...", "aiExplanation": "...", "deadline": null,
                "isRead": false, "needsFollowUp": true, "lastMessageAt": "..." } ],
    "meta": { "page": 1, "limit": 20, "total": 22, "totalPages": 2 }
  }
  ```
  Note: list responses return thread **summaries** (no full `messages` array) — keep payload light for the dashboard list view.
- **Edge cases**: `page` beyond `totalPages` → `200` with empty `data` array, not an error. Invalid `category`/`urgency` value → `400 INVALID_QUERY_PARAM`.

### 6.3 `GET /api/threads/:id`
Full thread detail including all messages.

- **Response 200**: full Thread document (including `messages[]`) scoped to `req.user.id`.
- **Errors**: `404 THREAD_NOT_FOUND` if missing or owned by another user (never distinguish the two in the response).

### 6.4 `PATCH /api/threads/:id/read`
Mark read/unread.

- **Request body**: `{ "isRead": true }`
- **Response 200**: updated thread summary.
- **Edge cases**: marking read should not retroactively clear `needsFollowUp` by itself — follow-up is about *unanswered*, not *unopened*; see §7. Toggling read state alone must not silently mutate urgency/category.

### 6.5 `PATCH /api/threads/:id/reclassify`
Faculty manually overrides category.

- **Request body**: `{ "category": "Committee/Admin" }` — must be one of the enum values.
- **Response 200**: updated thread, with `correctedCategory` set and `effectiveCategory` reflecting it.
- **Validation**: reject values outside the enum with `400 INVALID_CATEGORY`. Reject `"Other"` reclassification attempts silently allowed (faculty can manually demote something to Other too — valid use case).
- **Side effect**: log the correction (original `category` vs new `correctedCategory`) — needed later for the "X threads corrected" stat and any future fine-tuning.

### 6.6 `GET /api/threads/follow-up`
Shortcut for `GET /api/threads?needsFollowUp=true&sort=oldest`, returned pre-sorted by longest-waiting first, plus a `waitingSince`/`waitingHours` computed field per item.

- **Response 200**:
  ```json
  { "success": true, "data": [ { "id": "...", "subject": "...", "waitingHours": 76, "reason": "Unread and expects a reply" } ], "meta": { "total": 3 } }
  ```
- **Edge case**: zero results → `200` with empty array; frontend renders the "all caught up" empty state — this is a normal, expected response, not an error.

### 6.7 `GET /api/threads/other`
Shortcut for `effectiveCategory === "Other"`, includes a `meta.filteredCount` and `meta.filteredPercentOfInbox` for the "we filtered noise" stat.

### 6.8 `GET /api/digest`
Returns the cached AI digest if fresh (within `DIGEST_CACHE_TTL_SECONDS`), else regenerates.

- **Response 200**:
  ```json
  { "success": true, "data": { "digestText": "...", "generatedAt": "...", "stale": false } }
  ```
- **Cache invalidation logic**: regenerate if `now - generatedAt > TTL` **OR** if any thread in `basedOnThreadIds` has changed (new sync ingested newer threads) — compare against current top-N critical/high thread IDs rather than trusting time alone, so a fresh critical email doesn't wait out a stale cache window.
- **Edge case**: no threads at all yet (fresh account, no sync run) → return a friendly static-style digest like `"No emails synced yet — run a sync to get started."` with `stale: false`, not an error.

### 6.9 `GET /api/stats/overview`
Powers the dashboard's priority stat strip.

- **Response 200**:
  ```json
  { "success": true, "data": { "critical": 2, "high": 4, "needsFollowUp": 3, "unread": 6, "totalThreads": 22 } }
  ```
- Counts use `effectiveCategory`/`urgency` post-correction, computed live (cheap aggregate query) — not cached, since it must always reflect the latest read/reclassify actions.

### 6.10 `GET /api/health`
Unauthenticated. Returns `{ "success": true, "data": { "status": "ok", "db": "connected" } }`. Checks Mongo connection state; used for deployment health checks, not for frontend use.

### 6.11 Auth routes
Mounted from Better Auth directly at `/api/auth/*` (sign-up, sign-in, sign-out, session, etc.) — do not hand-roll these; document only that they exist and follow Better Auth's own request/response contracts.

---

## 7. Follow-Up Computation (business logic detail)

`needsFollowUp` is **recomputed**, not just set once at classification time, since "how long has this been waiting" changes over time without any new event occurring. Two acceptable approaches — pick based on time:

- **Simple (recommended for MVP)**: compute `needsFollowUp` **on read**, inside `GET /api/threads*` queries/service layer, from stored fields: `senderIsFaculty` of the last message is `false` AND `isRead` is `false` OR no faculty reply exists after the last inbound message AND `(now - lastMessageAt) > FOLLOWUP_THRESHOLD_HOURS`. This avoids any background job entirely — correct by construction, always current, zero staleness risk.
- **Cached variant (only if performance requires it later)**: a scheduled job recomputes and stores `needsFollowUp` periodically. Not needed at MVP scale (dozens of threads) — avoid the added complexity.

Additional rule from earlier discussion: **`Other` category threads are never eligible for `needsFollowUp = true`**, regardless of read/reply state — enforce this as a hard filter in the computation (`if effectiveCategory === "Other" → needsFollowUp = false`), not just a UI-level hide.

---

## 8. Standard Practices

- **Validation**: every request body/query validated with `zod` schemas in a `validate` middleware before hitting controllers; invalid input → `400` with field-level error detail, never a raw 500.
- **Centralized error handling**: one Express error-handling middleware (mounted last) catches everything, maps known error types (validation, not-found, auth, upstream LLM failure) to consistent codes, logs the underlying stack server-side but never leaks stack traces in the response body in production.
- **Rate limiting**: apply per-user (session-based) rate limits on `POST /api/sync/mock` and any future LLM-triggering endpoint, since these are the expensive calls — a sane default like 10 requests/minute is enough to stop accidental hammering (e.g. a frontend retry loop) without affecting normal use.
- **Logging**: structured logs (request id, user id, route, status, latency) — never log email body content or full subject lines at info level (privacy — see §11); log LLM call latency/failures distinctly for debugging.
- **Pagination**: cursor-free `page`/`limit` is fine at this scale; keep `limit` capped server-side regardless of what's requested.
- **CORS**: explicit allow-list from `CORS_ORIGIN` env var, credentials enabled (cookies), never `*` with credentials.
- **Security headers**: `helmet` middleware by default.
- **Middleware order**: helmet → CORS → body parser → rate limiter (global light limit) → session/auth middleware → routes → 404 handler → centralized error handler (must be last).

---

## 9. AI Classification Service

- Single LLM call per thread (not per message) — input: subject + last 1-3 messages (truncated) + sender list; output: structured JSON matching `{ category, urgency, actionNeeded, deadline, aiExplanation }`, validated against the enum before saving (if the model returns something outside the enum, coerce to `"Other"`/`"Low"` rather than throwing — never let a malformed LLM response break ingestion).
- On LLM call failure (timeout, API error): set `classificationStatus: "failed"`, `classificationError: <message>`, and default the thread to `category: "Other"`, `urgency: "Low"`, `aiExplanation: "Classification failed — please review manually."` — so it still appears in the UI (in the Other/low-priority view) rather than silently vanishing.
- Retry policy: one retry on transient failures (timeout/5xx) before marking failed — don't retry indefinitely and don't block the batch.

---

## 10. Caching Layer

- **Digest cache**: stored in Mongo (`DigestCache`) per user as described in §6.8 — durable across server restarts, simple TTL + invalidation logic, no external cache dependency needed at this scale.
- **Stats endpoint**: intentionally *not* cached (cheap aggregate, always must be fresh after read/reclassify actions).
- If you later need cross-instance caching (multiple server processes), swap the in-memory TTL wrapper (`utils/cache.ts`) for Redis without changing calling code — keep that abstraction thin from day one.

---

## 11. Edge Cases Checklist (consolidated)

- Empty inbox / zero threads → all list endpoints return empty arrays, not errors; digest returns a friendly "no data yet" message.
- Duplicate ingestion (rerun sync) → upsert by `(userId, externalThreadId)` unique index, never duplicate.
- LLM call fails or returns malformed JSON → thread still saved, marked `failed`/`Other`/`Low`, visible in UI, never dropped.
- Thread ID doesn't exist or belongs to another user → `404`, identical response either way (no `403` leak).
- Session expired mid-request → `401`, frontend handles redirect; no partial-write states left behind (use single atomic update calls, not multi-step unguarded writes).
- Pagination page beyond range → empty data, `200`, not `404`.
- Invalid enum value in filters or reclassify body → `400` with clear field name.
- Oversized thread (more messages than `MAX_MESSAGES_PER_THREAD`) → truncate stored messages to the cap, keep most recent, note truncation in a flag (e.g. `messagesTruncated: true`) rather than rejecting ingestion.
- Digest cache staleness after a new critical email arrives mid-TTL-window → invalidate on thread-set change, not purely time-based (see §6.8).
- Timezone handling for `deadline` — always store as UTC `Date`, let frontend format in local time; never store as a formatted string.
- Read/follow-up interaction — marking read does not clear `needsFollowUp` unless the underlying "no reply yet" condition is also resolved (see §7) — otherwise faculty could dismiss urgency just by opening an email without acting.
- Reclassifying to the same category it already is → no-op, still `200`, no duplicate log entry.
- Concurrent reclassify requests on the same thread (rare, but possible with double-clicks) → last-write-wins is acceptable at this scale; no optimistic locking needed for MVP.

---

## 12. What This Document Deliberately Leaves Out (by design, for MVP)

- Real Gmail OAuth flow details — the `EmailAccountLink` schema and `IngestionProvider` interface are ready for it, but implementation is Phase 2, only after mock ingestion is proven end-to-end.
- Background job scheduler / queue system — not needed at this data volume; revisit only if moving to real, larger, continuously-syncing inboxes.
- Multi-tenant/institution-level admin features — out of scope for a single-faculty MVP demo.
