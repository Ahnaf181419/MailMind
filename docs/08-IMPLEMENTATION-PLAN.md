# 08 — Implementation Plan

## Phasing strategy

Eight phases, each ending in a demoable increment. Total budget: **~8 hours** of focused build time.

```
Phase 1  Skeleton              ─┐
Phase 2  Memory DB + seed       │  Foundation
Phase 3  Auth (app + Gmail)     │
Phase 4  AI pipeline           ─┤  Core
Phase 5  Dashboard + views      │
Phase 6  Drafts + status       ─┤  Augmentation
Phase 7  Real Gmail sync       │
Phase 8  Polish + handoff      ─┘  Demo-ready
```

Each phase ends with a manual smoke test. We never push to the next phase with a known failure.

---

## Phase 1 — Repo skeleton (~45 min)

**Tasks:**
- Create monorepo with npm workspaces
- `apps/api`: Express + TS scaffold, health endpoint, CORS, env loader
- `apps/web`: Next.js 14 App Router scaffold, Tailwind + shadcn init, root layout
- `packages/shared`: TypeScript types (Email, Category, Status, ActionItem)
- Root `package.json` with `dev`, `build`, `seed:reset` scripts
- `concurrently` for `npm run dev`
- `.env.example` in both apps + root
- `.gitignore`, basic `README.md`

**Done when:**
- `npm run dev` starts both apps
- `curl localhost:4000/health` returns `{ ok: true }`
- `localhost:3000` shows a "MailMind — boot OK" page

---

## Phase 2 — Mongo + seed data (~45 min)

**Tasks:**
- Install `mongoose` + `mongodb-memory-server` in `apps/api`
- Implement `db/memoryServer.ts` (start if `MONGODB_URI` empty, otherwise connect)
- Implement Mongoose models from [05-DATA-MODEL.md](./05-DATA-MODEL.md)
- Create `seed/faculty-emails.json` with **25 realistic AUST-flavoured emails**
- Implement `services/seed.ts` to upsert demo user + emails on boot if `SEED_ON_BOOT=true`
- `npm run seed:force` to reset to a clean state

**Done when:**
- Boot starts Mongo in-process
- 25 emails appear in DB with seeded user
- `GET /api/emails` returns them

---

## Phase 3 — Auth (~1.5 hr)

**Tasks:**
- Install + configure `better-auth` in `apps/api` (email/password)
- Install + wire better-auth React client in `apps/web`
- Implement `/api/auth/*` routes (signup, signin, signout, me)
- Create login page UI (Screen 1 from [07-UI.md](./07-UI.md))
- Implement `/api/auth/google/start` + `/callback` using `googleapis` OAuth2 client
- Store tokens in `oauth_tokens` collection
- Add `Connect Gmail` button that initiates OAuth

**Done when:**
- Email/password signup + signin works
- Login UI lands user on dashboard (after Phase 5) or placeholder
- `Connect Gmail` button initiates OAuth flow (works if `GOOGLE_CLIENT_ID` set)

---

## Phase 4 — AI pipeline (~1.5 hr)

**Tasks:**
- Install `openai` SDK (works with any OpenAI-compatible base URL)
- Implement `services/ai.ts` with:
  - `categorise(emails)` — batched LLM call, strict JSON, Zod validation
  - `draftReply(email)` — single-email LLM call
  - Retry with exponential backoff (3 attempts)
- Implement `services/categoriser.ts` — keyword fallback
- Wire into `services/seed.ts` so seeded emails are auto-categorised
- `POST /api/emails/:id/draft-reply` route
- Unit tests for categoriser fallback (no LLM required)

**Done when:**
- Boot: seeded emails get categorised in DB
- Manual trigger: re-categorise one email via API
- Draft reply endpoint returns editable subject + body
- Fallback classifier matches expected categories for known inputs

---

## Phase 5 — Dashboard + category views + email detail (~1.5 hr)

**Tasks:**
- Build dashboard page (Screen 2)
- Build category inbox page (Screen 3)
- Build email detail page (Screen 4)
- `/api/dashboard` aggregates route
- `/api/emails?category=...&status=...` list route
- `/api/emails/:id` detail route
- React Query setup with stale-while-revalidate
- shadcn/ui components: Card, Badge, Button, Skeleton
- Loading skeletons for each page

**Done when:**
- Dashboard renders 4 stat cards, attention card, category bars, recent activity
- Category inbox shows filtered, sortable list with stale badges
- Email detail shows full body + AI panel with summary, action items, sender context, draft-reply button

---

## Phase 6 — Status + stale + digest (~1 hr)

**Tasks:**
- `POST /api/emails/:id/status` — update status
- `POST /api/emails/:id/snooze` — set snoozedUntil
- Live count refresh via React Query invalidation
- Today's attention logic: `urgent || stale || actionItem.dueAt < now+48h`
- Daily digest page (Screen 5)
- Toast notifications for status changes
- Hover-row quick actions (mark read / replied / snooze)

**Done when:**
- Mark replied → dashboard counts update without manual refresh
- Stale badge appears after threshold
- Digest page renders all in one screen

---

## Phase 7 — Real Gmail sync (~1 hr)

**Tasks:**
- `services/gmail.ts`: wrapper for googleapis gmail client
- `services/sync.ts`: poll worker using node-cron
  - For each user with tokens: list new messages since last sync
  - Batch-fetch (10 at a time)
  - Push through `ai.categorise`
  - Upsert into `emails`
- `POST /api/sync` manual trigger
- Initial backfill on first OAuth (last 7 days)
- Token refresh on 401

**Done when:**
- New mail in connected Gmail appears in MailMind within 60s
- Manual `/api/sync` triggers immediate refresh
- Token refresh works without user intervention

---

## Phase 8 — Polish + handoff (~1 hr)

**Tasks:**
- Settings page (Screen 6) — VIP senders, stale threshold
- Disconnect Gmail button
- Sign out everywhere
- Loading states on every action
- Empty states for every list
- Error toasts
- 404 page
- Write `README.md` with setup steps
- Write `DEMO.md` (5-min script from [02-USER-JOURNEY.md](./02-USER-JOURNEY.md))
- Final smoke test end-to-end

**Done when:**
- All screens render with no console errors
- README enables a fresh clone to `npm install && npm run dev` in under 5 minutes
- DEMO.md matches what the judges see on screen

---

## Task breakdown checklist

Use this for the actual build session:

### Phase 1
- [ ] `apps/api` package.json, tsconfig, src/index.ts
- [ ] `apps/web` Next.js init + Tailwind config
- [ ] `packages/shared` types file
- [ ] Root `package.json` workspaces config
- [ ] Root scripts (`dev`, `build`, `seed:reset`)
- [ ] `.env.example` files
- [ ] `concurrently` dev script
- [ ] `README.md` stub

### Phase 2
- [ ] `mongodb-memory-server` install + setup
- [ ] Mongoose models: User, OAuthToken, Email
- [ ] `seed/faculty-emails.json` (25 entries)
- [ ] `services/seed.ts` boot loader
- [ ] `npm run seed:force` script
- [ ] `GET /api/emails` test endpoint

### Phase 3
- [ ] better-auth install in api
- [ ] better-auth route handler
- [ ] better-auth React client in web
- [ ] Login page UI (Screen 1)
- [ ] Google OAuth start/callback routes
- [ ] `oauth_tokens` model + upsert on callback

### Phase 4
- [ ] openai SDK install + LLM client
- [ ] `services/ai.ts` (categorise + draftReply)
- [ ] `services/categoriser.ts` (fallback)
- [ ] Retry + backoff wrapper
- [ ] Zod schemas for AI output
- [ ] `/api/emails/:id/draft-reply` route
- [ ] Seed pipeline runs categorisation

### Phase 5
- [ ] `/api/dashboard` aggregates route
- [ ] Dashboard page (Screen 2)
- [ ] `/api/emails` list route with filters
- [ ] Category inbox page (Screen 3)
- [ ] Email detail page (Screen 4)
- [ ] React Query setup
- [ ] shadcn components install
- [ ] Skeleton states

### Phase 6
- [ ] `/api/emails/:id/status` route
- [ ] `/api/emails/:id/snooze` route
- [ ] Stale badge logic (client + server)
- [ ] Today's attention logic
- [ ] Digest page (Screen 5)
- [ ] Toast notifications
- [ ] Quick actions on hover

### Phase 7
- [ ] `services/gmail.ts` wrapper
- [ ] `services/sync.ts` cron worker
- [ ] `POST /api/sync` manual trigger
- [ ] Initial backfill on OAuth
- [ ] Token refresh on 401

### Phase 8
- [ ] Settings page (Screen 6)
- [ ] Disconnect Gmail flow
- [ ] Sign-out flow
- [ ] Empty + loading + error states
- [ ] README final
- [ ] DEMO.md final
- [ ] End-to-end smoke test

---

## Risk-aware sequencing

We sequence so that **highest-risk components are built and de-risked earliest**:

| Order | Component | Risk |
|---|---|---|
| 1 | Mongo memory server works on this machine | Highest risk — kernel incompatibility known |
| 2 | LLM API key + base URL works from this environment | High risk — rate limits |
| 3 | Gmail OAuth flow works (or graceful degradation) | Medium risk — depends on Google project setup |
| 4 | React Query + Next.js routing | Low risk — well-known |
| 5 | UI polish | Lowest risk — time padding |

If Phase 2 reveals Mongo won't work, we pivot to SQLite (Prisma) early. If Phase 4 reveals LLM is unreachable, we ship with deterministic fallback as primary for the demo.

## Testing strategy

For a hackathon MVP, we test **what breaks the demo**:

- ✅ Smoke test: full user journey from login → dashboard → category → detail → draft reply
- ✅ Smoke test: Gmail OAuth redirect (if creds available)
- ✅ Smoke test: deterministic fallback classifier works for known inputs
- ✅ Manual: try to break it (bad inputs, empty states, slow API)
- ❌ Skip: unit test coverage, e2e test suite, CI/CD — all stretch
