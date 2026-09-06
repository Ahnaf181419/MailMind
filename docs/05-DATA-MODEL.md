# 05 — Data Model

Three MongoDB collections. All schemas defined with Mongoose + Zod for runtime validation.

## Collection 1: `users`

Stores MailMind faculty identity and per-user preferences.

```ts
// apps/api/src/models/User.ts
const UserSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },                  // managed by better-auth
  name:         { type: String, required: true },
  role:         { type: String, enum: ['faculty', 'admin'], default: 'faculty' },

  // Preferences
  vipSenders:        { type: [String], default: [
                        'chair.cse@aust.edu',
                        'dean@aust.edu',
                        'controller.exams@aust.edu',
                        'registrar@aust.edu',
                        'head.cse@aust.edu'
                      ]},
  customVips:        { type: [String], default: [] },            // user-added
  categoryOverrides: { type: Schema.Types.Mixed, default: {} },    // { meetings: 'Meetings & MoMs' }
  staleThresholdHrs: { type: Number, default: 48 },
  digestEnabled:     { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

**Indexes:** `email` unique.

## Collection 2: `oauth_tokens`

Per-user Gmail OAuth tokens. One row per user (we don't support multi-account in MVP).

```ts
const OAuthTokenSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  accessToken:  { type: String, required: true },
  refreshToken: { type: String, required: true },
  scope:        { type: String, required: true },                 // space-separated scopes
  expiryDate:   { type: Number, required: true },                 // ms epoch
  tokenType:    { type: String, default: 'Bearer' },
  idToken:      { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

**Indexes:** `userId` unique.

## Collection 3: `emails`

The heart of the app. One document per email the AI has processed.

```ts
const EmailSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gmailId:     { type: String, required: true },                   // Gmail message ID
  threadId:    { type: String },

  // Raw
  from:        { type: { name: String, address: String, _id: false }, required: true },
  to:          [{ name: String, address: String, _id: false }],
  cc:          [{ name: String, address: String, _id: false }],
  subject:     { type: String, required: true },
  snippet:     { type: String },                                  // Gmail snippet (short preview)
  body:        { type: String, required: true },                  // full plain-text body
  receivedAt:  { type: Date, required: true, index: true },

  // AI output
  category:    { type: String,
                 enum: ['meetings','classes','students','examinations','department','research','personal'],
                 required: true, index: true },
  subCategory: { type: String },                                  // e.g. 're-evaluation', 'moderation'
  priority:    { type: String, enum: ['urgent','routine'], default: 'routine', index: true },
  summary:     { type: String },                                  // one-line AI summary
  actionItems: [{
    text:      { type: String, required: true },
    dueAt:     { type: Date },
    done:      { type: Boolean, default: false },
    _id:       false
  }],
  aiReasoning: { type: String },                                  // why the AI chose this category/priority
  aiProcessedAt: { type: Date },

  // Tracking
  status:      { type: String,
                 enum: ['unread','read','replied','actioned','snoozed'],
                 default: 'unread', index: true },
  snoozedUntil:{ { type: Date } },
  repliedAt:   { type: Date },
  actionedAt:  { type: Date },

  // Source
  source:      { type: String, enum: ['gmail','seed'], default: 'gmail' }
}, { timestamps: true });
```

**Indexes:**
- `{ userId: 1, receivedAt: -1 }` (dashboard list)
- `{ userId: 1, category: 1, receivedAt: -1 }` (category view)
- `{ userId: 1, status: 1, priority: -1 }` (today's attention)
- `{ userId: 1, gmailId: 1 }` unique (idempotent upsert)

**Compound unique on `(userId, gmailId)`** so re-syncing doesn't duplicate.

## Categories (enum)

| Key | Display | Examples |
|---|---|---|
| `meetings` | Meetings | Department meetings, committee calls, board, BOS |
| `classes` | Classes | Class cancellation, room change, makeup, lab reschedule |
| `students` | Students | Re-evaluation requests, appeals, queries, attendance |
| `examinations` | Examinations | Paper setting, moderation, scripts, grading |
| `department` | Department | Circulars, HR, accounts, notices, AO |
| `research` | Research | Collaboration, journal review, conference |
| `personal` | Personal | Out-of-office, mailing lists, noise |

## Status enum

| Status | Meaning | Set by |
|---|---|---|
| `unread` | Not yet opened | Default on insert |
| `read` | Opened, no action taken | User click |
| `replied` | Reply sent (we track the intent) | User marks replied |
| `actioned` | Handled some other way (forwarded, filed) | User marks actioned |
| `snoozed` | Temporarily hidden until `snoozedUntil` | User clicks snooze |

## Priority enum

| Priority | Meaning |
|---|---|
| `urgent` | Needs attention within 48h; VIP sender, deadline mentioned, or re-evaluation/exam-related |
| `routine` | Everything else |

## Subcategories (free-text, suggested)

| Category | Suggested subcategories |
|---|---|
| `students` | `re-evaluation`, `appeal`, `attendance`, `general-query`, `extension` |
| `meetings` | `committee`, `department`, `board-of-studies`, `external` |
| `classes` | `cancellation`, `room-change`, `makeup`, `lab` |
| `examinations` | `paper-setting`, `moderation`, `scripts`, `grading`, `results` |
| `department` | `circular`, `notice`, `hr`, `accounts`, `ao` |
| `research` | `collaboration`, `review`, `conference`, `journal` |
| `personal` | `newsletter`, `noise`, `ooo`, `social` |

The LLM is instructed to populate `subCategory` from this list; if none fit, it returns `"other"`.

## Derived values (computed, not stored)

These are computed on read; we don't persist them:

- `isStale` = `status in [unread, read]` AND `receivedAt < now - staleThresholdHrs`
- `isAttention` = `priority == urgent` OR `isStale` OR any action item due within 48h
- Category counts: `$match { userId }` then `$group { _id: '$category' }`

## Sample document

```json
{
  "_id": "ObjectId(...)",
  "userId": "ObjectId(...)",
  "gmailId": "18f3a2b4c5d6e7f8",
  "threadId": "18f3a2b4c5d6e7f8",
  "from": { "name": "Tanvir Ahmed", "address": "tanvir.cse401@aust.edu" },
  "to": [{ "name": "Dr. Faculty", "address": "faculty.cse@aust.edu" }],
  "cc": [],
  "subject": "Re-evaluation request · CSE401 Mid Q3",
  "snippet": "Respected Sir, I hope this email finds you in good health...",
  "body": "Respected Sir,\n\nI hope this email finds you in good health. I am writing to request a re-evaluation of Q3(b)...",
  "receivedAt": "2026-09-02T08:14:00Z",
  "category": "students",
  "subCategory": "re-evaluation",
  "priority": "urgent",
  "summary": "Final-year student requests re-evaluation of Midterm Q3(b), believes partial credit was missed on second-order analysis.",
  "actionItems": [
    { "text": "Reply with moderation sheet by Fri 5 PM", "dueAt": "2026-09-05T11:00:00Z", "done": false },
    { "text": "CC chair.cse@aust.edu", "dueAt": null, "done": false },
    { "text": "Confirm receipt by email", "dueAt": null, "done": false }
  ],
  "aiReasoning": "Sender matches current student list; keyword 're-evaluation'; explicit deadline 'by Friday'.",
  "aiProcessedAt": "2026-09-06T03:33:00Z",
  "status": "unread",
  "snoozedUntil": null,
  "repliedAt": null,
  "actionedAt": null,
  "source": "seed",
  "createdAt": "2026-09-06T03:33:00Z",
  "updatedAt": "2026-09-06T03:33:00Z"
}
```
