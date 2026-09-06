# MailMind

> Faculty Inbox Co-Pilot. AI-augmented Gmail dashboard built for university faculty.

MailMind understands academic email categories (Meetings, Classes, Students, Examinations, Re-evaluation, Committee/Admin, Research), extracts action items, surfaces stale items, and drafts replies — faculty decides; AI augments.

## Quick start

```bash
npm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env
# Fill LLM_API_KEY (or leave blank to run with deterministic fallback)
npm run dev
```

- API: <http://localhost:4000>
- Web: <http://localhost:3000>
- Health: `curl http://localhost:4000/api/health`

## Demo credentials

```
demo@aust.edu
demo1234
```

## Workspace

```
apps/
  api/          Express + TS backend
  web/          Next.js 14 frontend
packages/
  shared/       Shared TS types (Thread, Category, Urgency, Status, Envelope)
seed/
  faculty-threads.json   Thread-shaped demo data
docs/                      Project documentation
```

## See also

- `docs/01-PROBLEM-AND-VISION.md` — what & why
- `docs/02-USER-JOURNEY.md` — the demo flow
- `docs/03-ARCHITECTURE.md` — system shape
- `docs/05-DATA-MODEL.md` — DB schemas
- `docs/06-AI-PIPELINE.md` — classification pipeline
- `docs/12-BACKEND-SPEC.md` — backend specification
- `docs/08-IMPLEMENTATION-PLAN.md` — build phases
- `docs/09-DEMO-SCRIPT.md` — 5-minute demo script
