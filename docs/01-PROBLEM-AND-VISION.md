# 01 — Problem & Vision

## The problem

University faculty at AUST (and every department like it) face a constant triage problem in a single Gmail inbox:

- **High-stakes** emails — Chair about moderation meetings, Controller of Examinations, Dean, re-evaluation deadlines, class cancellations, lab reschedules — that *must not be missed*.
- **Medium-stakes** — departmental circulars, student queries, lab coordination, peer-review requests.
- **Noise** — newsletters, promotional, generic notices, mailing-list chatter.

Generic email clients (Gmail, Outlook) don't understand academic categories, deadlines, sender importance, or the difference between a re-evaluation request and a circular. Faculty miss critical emails. They lose hours triaging. The cost isn't aesthetic — it's a missed moderation meeting or a late re-evaluation reply that escalates into a formal appeal.

## Why this problem is the right one for this brief

1. **Specific to the faculty role.** Not "email for everyone" — the categories, senders, deadlines, and consequence model are academic-specific. The moat is faculty-aware AI, not another Gmail wrapper.

2. **High consequence of failure.** Real academic and professional cost when something is missed.

3. **AI does real reasoning, not generation.** The value is classification, priority, action-item extraction, follow-up surfacing — all *inference* on the faculty's behalf.

4. **One clear, demonstrable journey.** Inbox → AI categorises → dashboard → faculty acts. Judges see the whole loop in 5 minutes.

5. **Tangible artefact produced.** Unlike a "study helper" that vanishes, MailMind produces a daily dashboard the faculty would actually open every morning.

## The one useful journey

```
Connect Gmail  →  AI categorises + summarises + extracts actions
              →  Faculty sees a prioritised dashboard
              →  Opens category → email → drafts reply (or marks done)
              →  Stale / unanswered emails surface as red banners
```

The faculty gives the system their inbox (or a seed for demo).
The system intelligently processes it.
The faculty receives something genuinely useful: a morning dashboard that says *"here's what actually needs your attention today."*

## What we are deliberately NOT building

This is an MVP — a focused tool that solves one job well. We are explicitly **not** building:

- A full academic management platform
- A student-facing tool
- An LMS replacement
- An auto-reply system (we draft; faculty sends)
- A calendar system
- A research-paper analyser
- A grading tool

These are all real problems — but per the brief, *"a smaller idea with a convincing working flow is better than a large idea where most features exist only in the presentation."*

## What success looks like

When a faculty member opens MailMind on Monday morning, in under 30 seconds they can answer:

1. **What needs my reply today?** (top of "Today's attention" card)
2. **What did I miss over the weekend?** (unread by category, sorted by urgency)
3. **What's been waiting too long?** (stale badges)
4. **What's coming up?** (action items with deadlines)

The current process — open Gmail, scroll, mentally filter — collapses to a glance.

## Differentiators vs. generic AI inbox tools

| Generic AI inbox | MailMind |
|---|---|
| Generic categories (Work/Personal/Promotions) | Faculty-aware taxonomy (Meetings/Classes/Students/Examinations/Department/Research/Personal) |
| Generic importance scoring | VIP sender list built-in (Chair, Dean, Controller of Exams, Registrar) |
| Generic summaries | Action-item extraction tuned for academic workflow ("bring 3 moderation sheets", "reply by Friday 5pm") |
| "Snooze" as a feature | **Stale-email surfacing** as a default — red badges after configurable threshold (default 48h) |
| No reply drafting | **Draft-reply** tuned to faculty tone, never auto-sent |
| No domain context | Sender context ("Student CSE-401, current term, previously appealed once") |

## The principle

> The goal is not to replace the faculty member. The goal is to give them a better tool to do their work.
> — Hackathon brief

MailMind is built on this principle. Every feature asks: *"does this help the faculty decide, or does it decide for them?"* We draft replies; we don't send them. We flag urgent; we don't bury the routine. We summarise; we don't auto-respond.

## Constraints honoured from the brief

- ✅ One useful journey (not a platform)
- ✅ Faculty gives something → AI processes → useful result
- ✅ AI reasons over real data, doesn't just generate
- ✅ Demonstrable end-to-end in a 5-minute demo
- ✅ Real problem, not a toy
