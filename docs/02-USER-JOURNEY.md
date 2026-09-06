# 02 — User Journey (Demo Flow)

This is the exact, timed walkthrough judges will see during the 5-minute live demo.

## Setup before the demo

- Browser tab open to `http://localhost:3000`
- Backend running on `http://localhost:4000` (`curl localhost:4000/health` returns 200)
- Mock mode flag enabled by default
- No console errors
- Pre-warmed: seeded emails already AI-processed (cached in DB)
- Print-out of this script next to the keyboard

## The journey

### 0:00 — Login screen

**Show:** Landing page with two prominent buttons.

```
┌────────────────────────────────────────────────┐
│                                                │
│              MailMind                          │
│   Your faculty inbox, intelligently            │
│   organised.                                   │
│                                                │
│   [  Try Demo Mode  ]   [  Connect Gmail  ]    │
│                                                │
└────────────────────────────────────────────────┘
```

**Say:** *"MailMind is a faculty-aware inbox co-pilot. Two ways in: instant demo, or connect your real Gmail."*

---

### 0:20 — Demo mode loads

**Click:** *Try Demo Mode*

**Show:** Dashboard appears with **25 seeded AUST-flavoured faculty emails** already categorised by the AI. Mix of: 4 urgent, 6 stale, 15 routine; spread across all 7 categories; some sent by VIP senders, some by students, some by mailing lists.

**Say:** *"I've pre-loaded a realistic AUST faculty inbox — 25 emails from the chair, controller of exams, students, mailing lists. The AI has already categorised and summarised everything. Here's the morning view."*

---

### 0:45 — Dashboard

**Point at:** Top stats row, then category bars, then "Today's attention" card.

```
┌─────────────────────────────────────────────────────────────┐
│  Mon · 6 Sep 2026                                          │
│  ────────────────────────────────────────────────────────  │
│  25 emails  ·  7 unread  ·  3 urgent  ·  4 stale           │
│                                                              │
│  Today's attention                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 Reply to CSE-401 re-evaluation (4 days waiting)    │  │
│  │ 🔴 CSE321 moved to Room 304 at 2 PM today             │  │
│  │ 🟡 Submit moderation sheet for CSE307 by 5 PM         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Categories                                                  │
│  Meetings  ███░ 4     Classes      █████░ 6                 │
│  Students  ████░ 5    Examinations ██░░░ 3                  │
│  Dept      ███░ 4     Research     █░░░░ 2                  │
│  Personal  ██░░░ 3                                       │
└─────────────────────────────────────────────────────────────┘
```

**Say:** *"All five numbers at a glance — total, unread, urgent, stale. The 'today's attention' card surfaces the three items that need action in the next 48 hours. Below, the category breakdown shows where my email load actually sits."*

---

### 1:30 — Open Students category

**Click:** *Students* in the sidebar.

**Show:** 5 emails, each with sender, subject, one-line AI summary, status pill, and (on one row) a red `4 days unreplied` badge.

```
Students (5)
─────────────────────────────────────────────────────────────
🔴 Tanvir Ahmed  ·  Re-evaluation request · CSE401 Mid Q3
   "Requests re-check of Q3(b) — believes partial credit was
   missed on second-order analysis."
   [STUDENT] [URGENT] [4 days unreplied]            4d ago

🟡 Rafi Hassan  ·  Class attendance query
   "Has missed 3 labs; asks about makeup eligibility."
   [STUDENT]                                   2d ago

⚪ Nusrat Jahan  ·  Project extension request
   "Asks 2-day extension on CSE321 Phase 2 submission."
   [STUDENT]                                   6h ago
   ...
```

**Say:** *"The AI understood the category from content, not just labels. One row is red because it has been sitting unanswered for four days — the stale badge. Faculty never used to know this without manually scrolling."*

---

### 2:00 — Email detail view

**Click:** *Re-evaluation request* (Tanvir Ahmed row).

**Show:** Three-pane view: left = email body; right = AI panel.

```
┌──────────────────────────────┬──────────────────────────────┐
│ From: Tanvir Ahmed            │ ✨ AI Summary                 │
│ <tanvir.cse401@aust.edu>      │ Final-year student requests   │
│ To: you                       │ re-evaluation of Midterm Q3(b).│
│ Date: 2 Sep 2026              │                              │
│ Subject: Re-evaluation        │ Action items                  │
│         request · CSE401      │ ☐ Reply with moderation      │
│                               │   sheet by Fri 5 PM           │
│ ───────────────────────────── │ ☐ CC chair.cse@aust.edu      │
│ Respected Sir,                │ ☐ Confirm receipt by email   │
│                               │                              │
│ I hope this email finds...    │ Sender context                │
│ [full body]                   │ • Student CSE-401, current   │
│                               │   term                        │
│                               │ • Previously appealed once   │
│                               │ • VIP sender: NO              │
│                               │                              │
│                               │ [ Draft reply ]  [ Mark done ]│
└──────────────────────────────┴──────────────────────────────┘
```

**Say:** *"Full email on the left. On the right, the AI has done three things: a one-line summary, an action-item checklist with deadlines, and sender context — student is current-term, has appealed before. Now watch what happens when I draft a reply."*

---

### 2:45 — Draft reply

**Click:** *Draft reply*.

**Show:** Modal opens with LLM-generated draft, editable.

```
┌──────────────────────────────────────────────────────────────┐
│ Draft reply to Tanvir Ahmed                              [×] │
│ ─────────────────────────────────────────────────────────── │
│ Subject: Re: Re-evaluation request · CSE401                  │
│                                                               │
│ Dear Tanvir,                                                  │
│                                                               │
│ Thank you for your email regarding Q3(b) of the recent        │
│ midterm. I will review your answer script and the             │
│ moderation sheet, and revert with a decision by Friday 5 PM. │
│                                                               │
│ Best regards,                                                 │
│ [Faculty name]                                                │
│ ─────────────────────────────────────────────────────────── │
│ [ Copy to clipboard ]    [ Save draft ]    [ Send via Gmail ] │
└──────────────────────────────────────────────────────────────┘
```

**Say:** *"The AI drafted a reply — but I never auto-send. Faculty reviews, edits, and sends it themselves. This is augmentation, not automation."*

**Close the modal** without sending. **Click** *Mark replied* on the email.

---

### 3:15 — Status updates

**Show:** Live counts refresh. Unread drops, students count stays, "4 days unreplied" badge disappears from the row.

**Say:** *"The dashboard re-aggregates the moment status changes. The morning view stays honest."*

---

### 3:30 — Real Gmail mode

**Click:** avatar → *Connect Gmail*.

**Show:** Google OAuth popup, consent screen with non-sensitive scopes only (`gmail.readonly`, `gmail.modify`, `gmail.compose`), redirect back, sync kicks in, same dashboard renders on live mail.

**Say:** *"And when connected to a real Gmail account — same dashboard, same AI pipeline, just running on live mail. Non-sensitive scopes only, so no Google verification needed for the demo."*

---

### 4:10 — Catch (the vague-request test)

If the demo machine has time, demonstrate that the system **degrades gracefully**:

- *"What if my LLM quota dies?"* → AI pipeline falls back to deterministic keyword classifier; labels stay visible, summaries degrade to extractive snippets.
- *"What if OAuth fails?"* → Mock mode is the default first screen; OAuth is opt-in, never required.

---

### 4:30 — Close on limitations

**Say:** *"Given the window, we'd next enforce: per-user role permissions, real Pub/Sub push notifications from Gmail, calendar cross-link for action items, and a multi-faculty deployment with proper isolation. In that order."*

---

## Pre-flight checklist (run 30 minutes before judges arrive)

- [ ] Backend up on `:4000` (`curl localhost:4000/health` returns 200)
- [ ] Frontend up on `:3000`
- [ ] One demo LLM call to confirm API key isn't quota-blocked
- [ ] Reset seed data to a clean state (`npm run seed:reset`)
- [ ] Login as demo user, dashboard fully loaded
- [ ] No console errors
- [ ] This script + the cheatsheet printed, beside the keyboard

## Backup plans

### If LLM API 429s mid-demo
*"That's a rate limit — our pipeline retries with exponential backoff. If the quota is exhausted, swap `LLM_BASE_URL` and the key in `.env`, no code change."* Then retry once, and lean on the deterministic fallback classifier — judges care that you understand the failure, not that nothing ever fails.

### If the demo machine dies
The repo runs from the README on any machine with Node 20+, npm, and an OpenAI-compatible API key. Clone, copy `.env.example` to `.env` in both `apps/api` and `apps/web`, fill in keys, `npm install`, `npm run dev` (runs both apps). Offer to do exactly that — it *is* the submission contract.

### If the OAuth popup gets blocked
Stay in mock mode. *"This is the production path; I'll demonstrate the OAuth redirect separately."* Walk through the OAuth URL in the browser without submitting.
