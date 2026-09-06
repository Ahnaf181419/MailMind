# 04 — Tech Stack

Every choice below has a rationale tied to either demo reliability, speed of build, or specific to MailMind's needs.

## Core stack

| Layer | Choice | Why this, not the alternative |
|---|---|---|
| Monorepo | **npm workspaces** | Built into Node, no extra tooling, fastest to bootstrap. The user explicitly chose npm. |
| Frontend framework | **Next.js 14 (App Router)** | Best developer experience for a polished single-page dashboard; React Server Components keep the bundle small; built-in routing. |
| UI components | **Tailwind + shadcn/ui** | Tailwind is the fastest path to a clean, professional look; shadcn/ui gives accessible primitives (Radix under the hood) without locking us into a design system. |
| Backend framework | **Express (Node 22 + TypeScript)** | Familiar, fast, plays perfectly with googleapis and OpenAI Node SDK. Chosen over FastAPI per user preference. |
| ORM | **Mongoose** | Standard for MongoDB in Node; schema validation + middleware hooks help keep email processing clean. |
| Database | **MongoDB via `mongodb-memory-server` (default) or Atlas (env override)** | See below — local mongod is broken on this kernel. |
| App auth | **better-auth** (email + password) | Modern, TS-first, framework-agnostic, minimal config. Chosen per user preference. |
| Gmail auth | **`googleapis` Node SDK** | Official Google library. Non-sensitive scopes only (no Google verification needed). |
| LLM | **OpenAI-compatible endpoint (BYOK)** | Default `gpt-4o-mini`; configurable via `LLM_BASE_URL` + `LLM_API_KEY` so any provider works. |
| Validation | **Zod** | Shared types between frontend and backend possible; runtime + compile-time safety. |
| HTTP client (server) | **`undici`** (Node native) | No extra dependency. |
| HTTP client (client) | **fetch** + **TanStack Query** | React Query handles caching, retries, optimistic updates. |
| State (UI) | **Zustand** | Tiny, no boilerplate. |
| Icons | **lucide-react** | Tree-shakeable, ships with shadcn. |
| Charts | **recharts** | Lightweight, good defaults, used for the dashboard category bars. |
| Scheduling | **node-cron** | In-process; no extra infrastructure. |

## MongoDB workaround — why this matters

**The constraint:** The local `mongod` 8.0.29 on this machine **fails to start** on Linux kernel 6.19+ (JIRA [SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). The error is hard: `MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB.`

**What we do instead:**

| Path | When | Pros | Cons |
|---|---|---|---|
| **`mongodb-memory-server`** (default) | Demo, judging, dev | Zero external dep, downloads compatible binary, runs in-process | Data lost on restart (mitigated by seed loader) |
| **`MONGODB_URI` env override** | Production-like, multi-user demo | Real persistence; works with Atlas free tier or `docker run mongo:7.0` | Requires Atlas account or Docker |
| **Docker `mongo:7.0`** (optional) | Local multi-session testing | Self-contained, real persistence | Requires Docker daemon |

`mongodb-memory-server` is invisible to judges — they just see a working DB.

## Why these specific LLM choices

| Decision | Choice | Reasoning |
|---|---|---|
| Provider | **OpenAI-compatible** | Works with OpenAI, Groq, Together, OpenRouter, Ollama, LM Studio, etc. |
| Default model | **`gpt-4o-mini`** | Cheap, fast, strong on classification + JSON output |
| Batching | **10 emails per call** | Cuts API calls by 10x vs per-email |
| Fallback | **Keyword classifier** | Keeps demo alive if quota dies |
| Output format | **Strict JSON schema** | Reduces parsing errors; Zod validates the response |

## Why better-auth over alternatives

| Alternative | Why not |
|---|---|
| NextAuth.js | Heavier, opinionated about providers, harder to bolt on a separate Gmail OAuth flow |
| Clerk | Third-party dependency, paid beyond free tier, overkill for demo |
| Passport.js | More setup, dated DX |
| Roll-our-own | Reinventing wheel; security risk for a hackathon |

better-auth gives us TS-first schema definition, sessions, CSRF protection, and password hashing out of the box, with hooks for adding the separate Gmail OAuth flow.

## Why Express over alternatives

| Alternative | Why not |
|---|---|
| FastAPI (Python) | User explicitly chose Express |
| NestJS | Heavy for an MVP; lots of decorators and modules |
| Hono | Newer, less ecosystem for Gmail SDK |
| tRPC | Excellent but adds learning curve; we want judges to grok the code in 30 seconds |

Express is the boring, fast choice. No surprises.

## What we explicitly avoided

- ❌ GraphQL (overkill, harder to demo than REST)
- ❌ Redis (no need; polling worker runs in-process)
- ❌ WebSockets (polling is sufficient for 60s sync)
- ❌ Docker Compose for the demo (one-command `npm run dev` is friendlier)
- ❌ Microservices (one Express app, well-organised folders)
- ❌ Custom UI library (shadcn gives us polish for free)
- ❌ TypeORM (Mongoose fits MongoDB better)

## Environment variables (full list)

```bash
# apps/api/.env
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:3000

# Mongo
MONGODB_URI=                 # leave blank for memory-server; set for Atlas

# LLM
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_MS=20000

# Gmail OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Better-auth
BETTER_AUTH_SECRET=          # 32+ char random
BETTER_AUTH_URL=http://localhost:4000

# Sync
SYNC_INTERVAL_SECONDS=60
STALE_THRESHOLD_HOURS=48

# Seed
SEED_ON_BOOT=true
DEMO_USER_EMAIL=demo@aust.edu
DEMO_USER_PASSWORD=demo1234
```

```bash
# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## NPM scripts (root)

```json
{
  "scripts": {
    "dev":         "concurrently -n api,web -c blue,green \"npm:dev:api\" \"npm:dev:web\"",
    "dev:api":     "npm --workspace apps/api run dev",
    "dev:web":     "npm --workspace apps/web run dev",
    "build":       "npm --workspace apps/api run build && npm --workspace apps/web run build",
    "seed:reset":  "npm --workspace apps/api run seed:reset",
    "seed:force":  "npm --workspace apps/api run seed:force",
    "test":        "npm --workspace apps/api test && npm --workspace apps/web test",
    "lint":        "npm --workspace apps/api run lint && npm --workspace apps/web run lint"
  }
}
```
