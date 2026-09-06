# 09 — Demo Script (5-minute live presentation)

> Print this page. Keep it next to the keyboard. Speak from memory for the pitch; use this for the steps.

## Pre-flight (run 30 minutes before judges arrive)

- [ ] Backend up on `:4000` — `curl localhost:4000/health` returns `{ok:true}`
- [ ] Frontend up on `:3000`
- [ ] One demo LLM call to confirm API key isn't quota-blocked
- [ ] Reset seed data: `npm run seed:reset` so demo data is pristine
- [ ] Login as demo user, dashboard fully loaded
- [ ] No console errors anywhere
- [ ] This page + cheatsheet printed, beside the keyboard
- [ ] Browser tab on `/` (login screen)
- [ ] `DEMO_USER_EMAIL=demo@aust.edu` and password `demo1234` written down

---

## The 5-minute walkthrough

| Clock | Action | Rubric line hit | Say |
|---|---|---|---|
| 0:00 | Login screen visible | — | Deliver the 60-second pitch (memorised) |
| 0:20 | Click *Try Demo Mode* | Demo path | "I've pre-loaded 25 realistic AUST faculty emails — chair, students, examiner, mailing lists — already categorised by the AI." |
| 0:45 | Dashboard appears: 4 stat cards, attention card, category bars | The AI's value at a glance | "Monday-morning view: 25 total, 7 unread, 3 urgent, 4 stale. Today's attention card surfaces what I actually need to act on." |
| 1:30 | Click *Students* in sidebar | Faculty-aware taxonomy | "The AI categorised this from content — not labels. This row's red because it's been waiting 4 days." |
| 2:00 | Click re-evaluation email | AI does real reasoning | "Full body left, AI summary right. Action checklist. Sender context — student, current term, appealed before. *Now watch what happens when I draft a reply.*" |
| 2:45 | Click *Draft reply* | Augmentation, not automation | "The AI drafted a reply. I edit, I send. It never sends for me." Close modal. Mark replied. |
| 3:15 | Show live count refresh | Loop closes | "Dashboard re-aggregates immediately. The morning view stays honest." |
| 3:30 | Click *Connect Gmail* | Real path works | "And when connected to a real Gmail account — same dashboard, same AI pipeline, running on live mail. Non-sensitive scopes only, no Google verification needed." |
| 4:10 | The catch: deliberately fail something | Vague / robustness | "If the LLM quota dies, the pipeline falls back to a deterministic keyword classifier — labels stay visible, summaries degrade gracefully. If OAuth fails, mock mode is the default." |
| 4:30 | Close on limitations | Wisdom | "Given the window, we'd next enforce per-user permissions, real Pub/Sub push from Gmail, calendar cross-link, and a multi-faculty deployment — in that order." |

---

## The 60-second pitch (memorise)

> *"MailMind is an AI-augmented Gmail dashboard built for university faculty. The problem: faculty drown in a single inbox mixing high-stakes academic emails with noise. Miss the chair's moderation email, miss a student re-evaluation deadline — there are real consequences.*
>
> *MailMind understands academic email categories out of the box — meetings, classes, students, examinations, department, research. For every email, the AI gives a one-line summary, extracts action items, detects urgency, and surfaces stale items you forgot to reply to.*
>
> *The dashboard is the Monday-morning view: here are the 3 things that need action today, here's where your email load sits, here's what you've been ignoring for 4 days.*
>
> *For replies, the AI drafts. The faculty sends. AI augments; the faculty decides. Try demo mode, or connect your real Gmail. The non-sensitive scopes only — no Google verification needed."*

**Time it once. Aim for 50–60 seconds. Don't ad-lib it under judges' eyes.**

---

## Backup plans

### If Gemini / LLM 429s mid-demo

*"That's a rate limit — our pipeline retries with exponential backoff. If the quota is exhausted, swap `LLM_BASE_URL` and the key in `.env` — no code change."* Retry once. Then lean on the deterministic fallback — judges care that you understand the failure, not that nothing ever fails.

### If Mongo can't start

*mongodb-memory-server is the default, so this should never happen.* If somehow it does: pivot to a fresh demo using a pre-recorded screen capture. Have one ready.

### If the OAuth popup gets blocked

Stay in mock mode. *"This is the production path; I'll demonstrate the OAuth redirect separately."* Walk through the OAuth URL in the browser without submitting.

### If the demo machine dies entirely

The repo runs from the README on any machine with Node 20+, npm, and an LLM key. Clone, copy `.env.example` to `.env` in both apps, fill in keys, `npm install`, `npm run dev` (runs both apps). **Offer to do exactly that — it *is* the submission contract.**

### If the judges ask a question I don't know

*"Good question. In the time we had, we scoped this to one useful journey: inbox → AI → dashboard → action. [Topic] is on our roadmap for the post-MVP. Want me to sketch how we'd build it?"*

---

## Cheat sheet (folded next to keyboard)

### Demo credentials
```
demo@aust.edu
demo1234
```

### Critical URLs
```
http://localhost:3000          ← frontend
http://localhost:4000/health  ← API health
```

### Critical env vars
```
LLM_BASE_URL=...
LLM_API_KEY=...
MONGODB_URI=                  ← leave empty for memory-server
GOOGLE_CLIENT_ID=...          ← only if showing OAuth
GOOGLE_CLIENT_SECRET=...
```

### Reset commands
```
npm run seed:force            ← reset all seeded data
# restart api:
cd apps/api && npm run dev
```

### Three "wow" moments to land

1. **Dashboard numbers** (0:45) — "all five numbers, one screen, straight from MongoDB."
2. **AI summary + action items** (2:00) — "watch what happens when I draft a reply."
3. **Live count refresh** (3:15) — "the dashboard re-aggregates immediately."

---

## After the demo

- Be available at the booth for follow-up questions
- Have `DEMO.md` (this file) shared in the team channel
- Note every judge question for the future-session handoff
- Save the final Mongo seed state for reproducibility
