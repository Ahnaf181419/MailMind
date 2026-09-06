# 11 — Setup (Next-Session Handoff)

> This document is the single point of truth for someone (or future-you) opening this folder in a new session and getting MailMind running.

## 0 · Sanity check the environment

```bash
node --version    # v22.x
npm --version     # 10.x
mongod --version  # 8.0.29 — DON'T try to start it (kernel incompat)
docker --version  # optional, only if using Mongo via Docker
```

The local `mongod` is broken on this machine (kernel 6.19+). We use `mongodb-memory-server` by default.

## 1 · Folder layout

```
MailMind/
├── apps/
│   ├── api/                Express + TS backend
│   └── web/                Next.js frontend
├── packages/
│   └── shared/             Shared TS types
├── seed/
│   └── faculty-emails.json 25 seeded AUST-flavoured emails
├── docs/                   ← you are here
├── package.json            npm workspaces root
├── README.md               Top-level README
├── DEMO.md                 5-minute demo script
└── .env.example            Combined env template
```

## 2 · Install dependencies

```bash
cd MailMind
npm install
```

This installs the workspaces root, both apps, and the shared package.

## 3 · Configure environment

Create `.env` files (they are gitignored):

### `apps/api/.env`

```bash
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:3000

# Mongo — leave MONGODB_URI blank for in-process memory-server
MONGODB_URI=

# LLM (any OpenAI-compatible endpoint)
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_MS=20000

# Gmail OAuth — leave blank to disable the "Connect Gmail" button
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Better-auth (32+ char random string)
BETTER_AUTH_SECRET=replace-with-openssl-rand-hex-32
BETTER_AUTH_URL=http://localhost:4000

# Sync
SYNC_INTERVAL_SECONDS=60
STALE_THRESHOLD_HOURS=48

# Seed (auto-loads 25 AUST emails on boot if true)
SEED_ON_BOOT=true
DEMO_USER_EMAIL=demo@aust.edu
DEMO_USER_PASSWORD=demo1234
```

### `apps/web/.env`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate a `BETTER_AUTH_SECRET`:**
```bash
openssl rand -hex 32
```

## 4 · Run

```bash
# From the monorepo root (MailMind/)
npm run dev
```

This starts both:
- API at `http://localhost:4000` (logs to terminal)
- Web at `http://localhost:3000` (Next.js dev)

Verify health:
```bash
curl http://localhost:4000/health
# → {"ok":true}
```

## 5 · First run

On first boot:
1. `mongodb-memory-server` downloads its compatible mongod binary (~50MB) to `~/.cache/mongodb-binaries/`
2. Mongoose connects
3. `seed/faculty-emails.json` is loaded; 25 emails get AI-categorised (using LLM if available, fallback otherwise)
4. Demo user (`demo@aust.edu` / `demo1234`) is created

This first boot can take 30–60s. Subsequent boots are <10s.

## 6 · Demo it

1. Open `http://localhost:3000`
2. Click **Try Demo Mode** — sign in as `demo@aust.edu` / `demo1234`
3. Land on dashboard. You should see 25 emails across 7 categories.

If you see "No emails" → run `npm run seed:force` from the monorepo root, then refresh.

## 7 · Reset

```bash
npm run seed:force       # Wipe and reseed (use before demo)
```

## 8 · Optional: real Gmail OAuth

To enable the "Connect Gmail" button:

1. Create a Google Cloud project: https://console.cloud.google.com/
2. Enable the **Gmail API**
3. Create OAuth 2.0 credentials (Web application type)
4. Add `http://localhost:4000/api/auth/google/callback` as an authorised redirect URI
5. Copy Client ID and Client Secret into `apps/api/.env`
6. Restart `npm run dev`

**Scopes used (all non-sensitive — no Google verification needed):**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.compose`

## 9 · Optional: real MongoDB

If you want persistence across restarts:

### Option A — MongoDB Atlas (cloud free tier)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Set `MONGODB_URI=mongodb+srv://...` in `apps/api/.env`

### Option B — Docker (local)
```bash
docker run -d --name mailmind-mongo -p 27017:27017 -v mailmind-data:/data/db mongo:7.0
# Set MONGODB_URI=mongodb://localhost:27017/mailmind
```

## 10 · Optional: switch LLM provider

The OpenAI SDK accepts any compatible base URL. To swap providers:

### Groq
```bash
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.1-70b-versatile
```

### OpenRouter
```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=openai/gpt-4o-mini
```

### Local Ollama
```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama            # any non-empty string
LLM_MODEL=llama3.1
```
(With Ollama, quality will be lower; the keyword fallback will be used more often.)

## 11 · Project-specific conventions

- **TypeScript everywhere.** No `.js` files in `apps/api/src` or `apps/web/app`.
- **Path aliases:** `@shared/*` resolves to `packages/shared/src/*`. Both apps share the same alias config.
- **Commits:** `feat:`, `fix:`, `chore:`, `docs:` conventional commits.
- **No comments unless asked.** Code should read clean without them.
- **Lint:** `npm run lint` at root runs ESLint in both apps.
- **Build:** `npm run build` compiles both apps; production starts with `npm start` in each.

## 12 · Files to read first (in order)

If you're new to this codebase, read in this order:

1. [`docs/01-PROBLEM-AND-VISION.md`](./01-PROBLEM-AND-VISION.md) — what & why
2. [`docs/02-USER-JOURNEY.md`](./02-USER-JOURNEY.md) — the demo flow
3. [`docs/03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) — how it's wired
4. [`docs/05-DATA-MODEL.md`](./05-DATA-MODEL.md) — DB schemas
5. [`docs/06-AI-PIPELINE.md`](./06-AI-PIPELINE.md) — the AI part
6. [`docs/08-IMPLEMENTATION-PLAN.md`](./08-IMPLEMENTATION-PLAN.md) — what to build next
7. [`docs/09-DEMO-SCRIPT.md`](./09-DEMO-SCRIPT.md) — how to present it

## 13 · Quick troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm run dev` says port 4000 in use | Another process | `lsof -ti:4000 | xargs kill -9` |
| Dashboard shows "No emails" | Seed didn't run | `npm run seed:force`, refresh |
| LLM calls failing 401 | Bad key | Check `LLM_API_KEY` in `apps/api/.env` |
| OAuth button does nothing | Missing env vars | Set `GOOGLE_CLIENT_ID` / `SECRET` |
| `Cannot find module '@shared/...'` | Workspace not linked | From root: `npm install` |
| Memory server hangs on first boot | Downloading mongod binary | Wait — first time only, ~50MB |
| Mongo connection refused | Trying real `MONGODB_URI` that's down | Empty the env var, restart |
| Frontend can't reach API | CORS / port mismatch | Check `WEB_ORIGIN` in api env |

## 14 · Pre-demo checklist (T-30 minutes)

- [ ] `curl localhost:4000/health` → 200
- [ ] Browser at `localhost:3000` loads without console errors
- [ ] `npm run seed:force` run; dashboard shows 25 emails
- [ ] One demo LLM call succeeded (draft a reply on any email)
- [ ] `DEMO.md` printed beside keyboard
- [ ] Demo credentials written down: `demo@aust.edu` / `demo1234`
- [ ] Backup: screen recording of a successful demo on USB

## 15 · What this folder does NOT contain yet

This `docs/` is the planning handoff. The actual code (apps/api, apps/web, packages/shared, seed/) will be created in the next session per [`08-IMPLEMENTATION-PLAN.md`](./08-IMPLEMENTATION-PLAN.md).

**Status:** Ready for build session.
