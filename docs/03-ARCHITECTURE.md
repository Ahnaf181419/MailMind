# 03 — Architecture

## System overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│   Next.js 14 SPA — Tailwind + shadcn/ui                                 │
│   Dashboard · Category views · Email detail · Settings                  │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │  REST + JSON  (port 3000 → 4000)
┌───────────────────────────────────▼──────────────────────────────────────┐
│                          Express API (TypeScript)                         │
│                                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │  Auth       │  │  Gmail       │  │  AI Service      │  │  Sync    │ │
│  │  (better-   │  │  OAuth +     │  │  (OpenAI-compat) │  │  Worker  │ │
│  │   auth)     │  │  googleapis  │  │  classify,       │  │  APSched │ │
│  │             │  │              │  │  summarise,      │  │          │ │
│  │             │  │              │  │  action-items,   │  │          │ │
│  │             │  │              │  │  draft-reply     │  │          │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  └────┬─────┘ │
│         │                │                   │                │       │
│         └────────────────┴─────────┬─────────┴────────────────┘       │
│                                    │                                     │
│                          ┌─────────▼─────────┐                          │
│                          │  Mongoose ODM     │                          │
│                          └─────────┬─────────┘                          │
└────────────────────────────────────┼──────────────────────────────────────┘
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
                ┌────────────┐ ┌──────────┐ ┌──────────────┐
                │ MongoDB    │ │ OpenAI-  │ │ Gmail API    │
                │ (memory or │ │ compat   │ │ (googleapis) │
                │  Atlas)    │ │ LLM      │ │              │
                └────────────┘ └──────────┘ └──────────────┘
```

## Components

### 1. Frontend — `apps/web` (Next.js 14)

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State:** React Query (TanStack Query) for server state, Zustand for UI state
- **Auth client:** better-auth React SDK
- **Routing:**
  - `/` — login (demo + connect Gmail)
  - `/dashboard` — main morning view
  - `/inbox/[category]` — filtered inbox
  - `/email/[id]` — detail view with AI panel
  - `/settings` — VIP senders, categories, stale threshold
  - `/digest` — daily digest view

### 2. Backend — `apps/api` (Express + TypeScript)

- **Runtime:** Node 22 + TS via `tsx` (dev) / `tsc` (build)
- **HTTP:** Express 4
- **Validation:** Zod
- **Auth:** better-auth (email + password)
- **Gmail:** `googleapis` Node client
- **ORM:** Mongoose
- **Scheduling:** `node-cron` or APScheduler for sync poller
- **AI:** OpenAI Node SDK pointed at any OpenAI-compatible base URL

### 3. Auth — better-auth

Two distinct auth flows, kept separate:

| Flow | Purpose | Library | Scopes |
|---|---|---|---|
| App login | Faculty identity inside MailMind | better-auth | email/password (local) |
| Gmail OAuth | Read/write the user's Gmail | googleapis | `gmail.readonly` + `gmail.modify` + `gmail.compose` |

App login is required to use MailMind. Gmail OAuth is opt-in; mock-mode works without it.

### 4. Gmail sync worker

- Runs in-process on a 60-second cron (configurable).
- For each user with a connected Gmail account:
  1. List message IDs since last sync (incremental, `historyId` if cached, otherwise `q=newer_than:1d`).
  2. Batch-fetch in groups of 10.
  3. Push each batch through the AI service.
  4. Upsert into `emails` collection.
- Manual trigger: `POST /api/sync` for instant demo refresh.

### 5. AI service

- One module, four public functions:
  - `categorise(emails: RawEmail[]): Promise<CategorisedEmail[]>`
  - `draftReply(email: Email): Promise<{ subject: string; body: string }>`
  - `summarise(email: Email): Promise<string>` *(called internally by categorise)*
  - `extractActionItems(email: Email): Promise<ActionItem[]>` *(called internally by categorise)*
- Each function calls the LLM with a strict JSON-output system prompt.
- Wraps calls with:
  - Retry with exponential backoff (3 attempts, 500ms → 2s → 8s)
  - Deterministic keyword fallback if all attempts fail
  - Token-usage logging (optional, off in demo)

### 6. MongoDB

- **Default:** `mongodb-memory-server` runs in-process; downloads its own compatible mongod binary. Zero external dependency. Perfect for hackathon demo + judging.
- **Optional:** If `MONGODB_URI` env var is set, uses that connection instead. Works with MongoDB Atlas free tier or a Docker `mongo:7.0` container.

> See [10-RISKS-AND-MITIGATIONS.md](./10-RISKS-AND-MITIGATIONS.md) for why we made this choice.

## Data flow — categorisation pipeline

```
                ┌─────────────────┐
                │ Gmail API poll  │
                └────────┬────────┘
                         │ raw emails
                         ▼
                ┌─────────────────┐
                │ Batch into 10s  │
                └────────┬────────┘
                         │
                         ▼
            ┌───────────────────────────┐
            │  LLM: categorise batch    │
            │  returns JSON             │
            └────────────┬──────────────┘
                         │
            ┌────────────▼──────────────┐
            │  Upsert to MongoDB        │
            │  (emails collection)      │
            └────────────┬──────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │  Frontend refetches        │
            │  /api/emails?category=...  │
            └────────────────────────────┘
```

## Data flow — draft reply

```
                ┌──────────────────────┐
                │ User clicks          │
                │ "Draft reply"        │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ POST /api/email/:id/  │
                │      draft-reply     │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ LLM: draft reply     │
                │ with sender context  │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Return {subject,body}│
                │ Frontend shows in    │
                │ editable modal       │
                └──────────────────────┘
                (Faculty edits; we never auto-send)
```

## REST API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/sign-up` | Register demo user (better-auth) |
| POST | `/api/auth/sign-in` | Login (better-auth) |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/google/start` | Begin Gmail OAuth |
| GET | `/api/auth/google/callback` | Gmail OAuth callback |
| GET | `/api/dashboard` | Aggregates: counts, categories, today's attention |
| GET | `/api/emails?category=...&status=...` | List filtered emails |
| GET | `/api/emails/:id` | Single email with AI panel |
| POST | `/api/emails/:id/status` | Update status (read/replied/actioned) |
| POST | `/api/emails/:id/snooze` | Snooze for N hours |
| POST | `/api/emails/:id/draft-reply` | Generate draft reply |
| POST | `/api/sync` | Manual Gmail sync trigger |
| GET | `/api/settings` | User settings (VIPs, threshold, categories) |
| PATCH | `/api/settings` | Update settings |
| GET | `/api/health` | Health check |

## Folder structure (target)

```
MailMind/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts                # Express bootstrap
│   │   │   ├── config.ts               # env config
│   │   │   ├── db/
│   │   │   │   ├── connection.ts       # Mongoose connect
│   │   │   │   └── memoryServer.ts     # mongodb-memory-server bootstrap
│   │   │   ├── models/
│   │   │   │   ├── User.ts
│   │   │   │   ├── OAuthToken.ts
│   │   │   │   └── Email.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── google.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── emails.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── settings.ts
│   │   │   │   └── health.ts
│   │   │   ├── services/
│   │   │   │   ├── gmail.ts            # googleapis wrapper
│   │   │   │   ├── ai.ts               # LLM calls + fallback
│   │   │   │   ├── categoriser.ts      # keyword fallback
│   │   │   │   ├── sync.ts             # poll worker
│   │   │   │   └── seed.ts             # seed data loader
│   │   │   └── middleware/
│   │   │       └── auth.ts             # session guard
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                # login
│       │   ├── (app)/
│       │   │   ├── layout.tsx          # authenticated shell
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── inbox/[category]/page.tsx
│       │   │   ├── email/[id]/page.tsx
│       │   │   ├── digest/page.tsx
│       │   │   └── settings/page.tsx
│       │   └── api/auth/[...all]/route.ts  # better-auth handler
│       ├── components/
│       │   ├── dashboard/
│       │   ├── email/
│       │   ├── ui/                     # shadcn primitives
│       │   └── shared/
│       ├── lib/
│       │   ├── api.ts                  # fetch wrapper
│       │   ├── auth.ts                 # better-auth client
│       │   └── queryClient.ts
│       ├── package.json
│       └── tailwind.config.ts
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types.ts                # Email, Category, Status, etc.
│       │   └── categories.ts           # 7-category taxonomy
│       └── package.json
├── seed/
│   └── faculty-emails.json             # 25 AUST emails
├── docs/                               # this folder
├── package.json                        # npm workspaces root
├── README.md
├── DEMO.md
└── .env.example
```
