# 06 — AI Pipeline

## Goals

The AI in MailMind is **inference-first, generation-second**. The two halves:

1. **Per-email inference** — classify, prioritise, summarise, extract action items. (Used for every email.)
2. **Reactive generation** — draft a reply only when the user explicitly asks for it.

The AI **never** decides what to send, never sends mail, never auto-files.

## Pipeline overview

```
                       ┌─────────────────────┐
                       │  Raw email batch     │
                       │  (≤10 emails)        │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │  Pre-process         │
                       │  (truncate, mask     │
                       │   signatures,        │
                       │   strip HTML)        │
                       └──────────┬──────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────────┐
              │  LLM call: categorise + summarise     │
              │  + extract action items               │
              │  Returns strict JSON                  │
              └───────────────────┬───────────────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  │                                │
                  ▼                                ▼
       ┌────────────────────┐          ┌────────────────────┐
       │  Success            │          │  All retries fail  │
       │  Validate JSON      │          │  → Keyword fallback │
       │  Upsert to Mongo    │          │  Mark aiProcessedAt │
       │                     │          │  + flag for retry   │
       └────────────────────┘          └────────────────────┘
```

## The categoriser (LLM call)

**System prompt:**

```
You are MailMind, an AI that triages Gmail for a university faculty member.

For each email, return a JSON object with EXACTLY these fields:
- gmailId:           string (echo back)
- category:          one of ["meetings","classes","students","examinations","department","research","personal"]
- subCategory:       string (from the suggested list per category, or "other")
- priority:          "urgent" if any of these apply, else "routine":
                       * explicit deadline (date or relative)
                       * sender is on VIP list
                       * keyword: re-evaluation, moderation, scripts, exam, deadline
                       * student appeals / academic grievance
- summary:           one sentence, ≤30 words, third-person, no filler
- actionItems:       array of {text, dueAt|null}; extract every concrete next step
                       (reply by X, bring Y, submit Z). Empty array if none.
- aiReasoning:       one sentence explaining the category and priority choice

Return JSON only. No prose outside the JSON.
```

**User prompt:**

```
VIP senders (always flag as urgent): ["chair.cse@aust.edu", "dean@aust.edu", ...]

Faculty context: Department of Computer Science, AUST. Teaches CSE321, CSE307.

Today's date: 2026-09-06

Categorise these emails:

[
  { "gmailId": "...", "from": {"name":..., "address":...}, "subject": "...", "body": "..." },
  ...
]
```

**Output validation:** Zod schema matches `CategorisedEmail[]`. On validation error, retry once with the validation error appended to the user prompt. On second failure, fall back per-email to the keyword classifier.

## The keyword fallback

When the LLM is unavailable, we run a deterministic classifier. It's not as good, but it keeps the demo alive.

| Signal | Category |
|---|---|
| Sender in VIP list | `priority = urgent` (category from content) |
| Subject/body matches `/re-?evaluation\|appeal\|grievance/` | `students / re-evaluation`, `priority = urgent` |
| Subject/body matches `/moderation\|paper[ -]set\|script/` | `examinations`, `priority = urgent` |
| Subject/body matches `/meeting\|MoM\|minutes\|agenda/` | `meetings` |
| Subject/body matches `/class[ -]cancel\|room[ -]change\|makeup/` | `classes`, `priority = urgent` |
| Subject/body matches `/circular\|notice\|accounts\|HR/` | `department` |
| Subject/body matches `/conference\|journal\|review\|paper[ -]sub/` | `research` |
| Subject starts with `[` (mailing list) | `personal` |
| Otherwise | `personal` |

Summary is extracted as the first sentence of the body (truncated). Action items parsed by regex for `by <date>` / `before <date>` / `reply by` patterns.

## The draft-reply generator

Only invoked when the user clicks **Draft reply** on a specific email.

**System prompt:**

```
You are drafting an email reply for a university faculty member.
- Tone: professional, warm, concise. Never condescending.
- Length: 80–150 words unless the email demands more.
- Always acknowledge the sender's request explicitly.
- If action items have deadlines, mention them.
- Do not promise outcomes the faculty cannot guarantee.
- Sign-off should be neutral: "Best regards," then [Faculty Name placeholder].

Return JSON: { "subject": "Re: ...", "body": "..." }
Subject must start with "Re: ".
```

**User prompt:**

```
Sender: Tanvir Ahmed <tanvir.cse401@aust.edu>
Faculty: Dr. [Faculty Name]
Original subject: Re-evaluation request · CSE401 Mid Q3
Original body:
<full body>

AI summary: <summary>
Action items:
- Reply with moderation sheet by Fri 5 PM
- CC chair.cse@aust.edu
- Confirm receipt by email

Sender context: Student CSE-401, current term, previously appealed once.

Draft a reply.
```

The result is shown in an **editable modal**. We never auto-send. The faculty can:
- Edit the draft
- Copy to clipboard
- "Save draft" (writes `draftedReply` field on the email doc)
- "Send via Gmail" → opens Gmail compose in a new tab pre-filled (we never post directly to Gmail in MVP)

## Retry & rate-limit handling

```ts
async function callLLM<T>(prompt, schema, opts = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500 } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await client.chat.completions.create({...});
      const json = extractJSON(res.choices[0].message.content);
      return schema.parse(json);
    } catch (err) {
      if (err instanceof ZodError && attempt < maxAttempts) {
        // Validation error — retry with feedback
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
      if (isRateLimit(err) && attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
      if (attempt === maxAttempts) throw err;
    }
  }
  throw new Error('LLM call failed after retries');
}
```

## Cost & quota strategy

| Decision | Effect |
|---|---|
| Batch 10 emails per call | 10x fewer API calls than per-email |
| Use `gpt-4o-mini` | ~10x cheaper than `gpt-4o`, sufficient for triage |
| Cache AI results in Mongo | Re-categorising same email never re-calls LLM |
| Draft reply only on demand | No background generation cost |
| Strict JSON output | Reduces wasted tokens on explanation prose |

Estimated demo cost: **< $0.05 total** for the entire 25-email seeded set + a few reply drafts.

## Privacy & prompt-injection considerations

- Email body is included in the LLM prompt. The user is consenting by connecting their account.
- We strip HTML and signatures before sending to the LLM (defence against prompt injection via mailto links / hidden content).
- The system prompt is reinforced every call ("Return JSON only.") to reduce injection success.
- We do not log full email bodies server-side past the AI call (only snippets + summary in DB).

## What the AI does NOT do

- ❌ Send mail
- ❌ Move mail between folders
- ❌ Mark mail as read in Gmail (we track read status locally)
- ❌ Auto-reply
- ❌ Cross-account learning
- ❌ Persistent memory across sessions (we don't keep conversation state)
- ❌ Train on user data

These boundaries are intentional and are part of the demo narrative: **AI augments; faculty decides.**
