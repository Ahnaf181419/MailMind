import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import OpenAI from 'openai';
import { Thread } from '../models/Thread.js';
import { env } from '../config/env.js';
import { ok, ErrorCodes } from '@mailmind/shared/envelope';
import {
  STATUSES,
  CATEGORIES,
  type Category,
  type Draft,
  type Status,
} from '@mailmind/shared/types';
import { HttpError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const STATUS_VALUES = STATUSES as unknown as readonly [Status, ...Status[]];
const CATEGORY_VALUES = CATEGORIES as unknown as readonly [Category, ...Category[]];

const ReadBody = z.object({ isRead: z.boolean() });
const StatusBody = z.object({ status: z.enum(STATUS_VALUES) });
const SnoozeBody = z.object({ until: z.string() });
const ReclassifyBody = z.object({ category: z.enum(CATEGORY_VALUES) });
const DraftBody = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

async function getOwnedThread(req: Request) {
  const userId = req.user!.id;
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, ErrorCodes.THREAD_NOT_FOUND, 'Thread not found');
  }
  const t = await Thread.findOne({ _id: id, userId });
  if (!t) {
    throw new HttpError(404, ErrorCodes.THREAD_NOT_FOUND, 'Thread not found');
  }
  return t;
}

export async function patchReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ReadBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, ErrorCodes.INVALID_BODY, 'Invalid body');
    }
    const t = await getOwnedThread(req);
    t.isRead = parsed.data.isRead;
    if (parsed.data.isRead && t.status === 'unread') t.status = 'read';
    await t.save();
    res.json(ok({
      id: String(t._id),
      isRead: t.isRead,
      status: t.status,
    }));
  } catch (err) {
    next(err);
  }
}

export async function patchStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = StatusBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, ErrorCodes.INVALID_BODY, 'Invalid body');
    }
    const t = await getOwnedThread(req);
    t.status = parsed.data.status;
    if (parsed.data.status === 'replied') {
      t.repliedAt = new Date();
      t.isRead = true;
    }
    if (parsed.data.status === 'actioned') {
      t.actionedAt = new Date();
    }
    if (parsed.data.status === 'read') {
      t.isRead = true;
    }
    await t.save();
    res.json(ok({
      id: String(t._id),
      status: t.status,
      repliedAt: t.repliedAt,
      actionedAt: t.actionedAt,
    }));
  } catch (err) {
    next(err);
  }
}

export async function patchSnoozeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SnoozeBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, ErrorCodes.INVALID_BODY, 'Invalid body');
    }
    const until = new Date(parsed.data.until);
    if (Number.isNaN(until.getTime())) {
      throw new HttpError(400, ErrorCodes.INVALID_BODY, 'Invalid date');
    }
    const t = await getOwnedThread(req);
    t.status = 'snoozed';
    t.snoozedUntil = until;
    await t.save();
    res.json(ok({
      id: String(t._id),
      status: t.status,
      snoozedUntil: t.snoozedUntil,
    }));
  } catch (err) {
    next(err);
  }
}

export async function patchReclassifyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ReclassifyBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, ErrorCodes.INVALID_CATEGORY, 'Invalid category');
    }
    const newCat: Category = parsed.data.category;
    const t = await getOwnedThread(req);
    if (t.category === newCat) {
      res.json(ok({ id: String(t._id), category: t.category, correctedCategory: t.correctedCategory, effectiveCategory: t.correctedCategory ?? t.category }));
      return;
    }
    logger.info(
      { threadId: String(t._id), from: t.category, to: newCat },
      'Thread reclassified',
    );
    t.correctedCategory = newCat;
    await t.save();
    res.json(ok({
      id: String(t._id),
      category: t.category,
      correctedCategory: t.correctedCategory,
      effectiveCategory: t.correctedCategory ?? t.category,
    }));
  } catch (err) {
    next(err);
  }
}

export async function postDraftReplyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const t = await getOwnedThread(req);
    const lastIncoming = [...t.messages].reverse().find((m) => !m.senderIsFaculty);
    const subject = t.subject.startsWith('Re: ') ? t.subject : `Re: ${t.subject}`;

    if (!env.LLM_API_KEY) {
      const body = fallbackDraft(t.subject, lastIncoming?.body ?? '');
      res.json(ok({ subject, body, source: 'fallback' }));
      return;
    }

    const client = new OpenAI({
      apiKey: env.LLM_API_KEY,
      baseURL: env.LLM_BASE_URL,
      timeout: env.LLM_TIMEOUT_MS,
    });

    const systemPrompt = `You are drafting an email reply for a university faculty member.
- Tone: professional, warm, concise.
- Length: 80-150 words unless the email demands more.
- Always acknowledge the sender's request explicitly.
- If action items have deadlines, mention them.
- Sign-off: "Best regards," then [Faculty Name].
Return JSON: { "subject": "Re: ...", "body": "..." }`;

    const userPrompt = `Sender (last incoming): ${lastIncoming?.sender ?? 'unknown'}
Original subject: ${t.subject}
Original body:
${(lastIncoming?.body ?? '').slice(0, 1500)}

AI explanation: ${t.aiExplanation}
Category: ${t.category}
Urgency: ${t.urgency}

Draft a reply.`;

    try {
      const completion = await client.chat.completions.create({
        model: env.LLM_MODEL,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const content = completion.choices[0]?.message?.content ?? '{}';
      const json = JSON.parse(content);
      res.json(ok({
        subject: json.subject ?? subject,
        body: json.body ?? '',
        source: 'llm',
      }));
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Draft reply LLM failed; using fallback');
      const body = fallbackDraft(t.subject, lastIncoming?.body ?? '');
      res.json(ok({ subject, body, source: 'fallback' }));
    }
  } catch (err) {
    next(err);
  }
}

function fallbackDraft(subject: string, originalBody: string): string {
  return `Dear sender,

Thank you for your email regarding "${subject}". I have noted your message and will respond in detail shortly.

Best regards,
[Faculty Name]`;
}

export async function patchDraftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = DraftBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, ErrorCodes.INVALID_BODY, 'Invalid body');
    }
    const t = await getOwnedThread(req);
    const draft: Draft = {
      subject: parsed.data.subject,
      body: parsed.data.body,
      savedAt: new Date().toISOString(),
    };
    t.draftedReply = draft;
    await t.save();
    res.json(ok({ id: String(t._id), draftedReply: t.draftedReply }));
  } catch (err) {
    next(err);
  }
}
