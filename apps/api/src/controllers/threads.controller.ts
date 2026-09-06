import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Thread } from '../models/Thread.js';
import { User } from '../models/User.js';
import {
  listThreads,
  listFollowUp,
  toSummary,
  computeNeedsFollowUp,
} from '../services/threadService.js';
import { validateQuery } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { ok, ErrorCodes } from '@mailmind/shared/envelope';
import {
  CATEGORIES,
  STATUSES,
  URGENCIES,
  type Category,
  type Urgency,
  type Status,
} from '@mailmind/shared/types';
import { categoryFromSlug } from '@mailmind/shared/categories';

const CATEGORY_VALUES = CATEGORIES as unknown as readonly [Category, ...Category[]];
const URGENCY_VALUES = URGENCIES as unknown as readonly [Urgency, ...Urgency[]];
const STATUS_VALUES = STATUSES as unknown as readonly [Status, ...Status[]];

const ListQuery = z.object({
  category: z.string().optional(),
  urgency: z.enum(URGENCY_VALUES).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  needsFollowUp: z.coerce.boolean().optional(),
  isRead: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['urgency', 'recent', 'oldest']).default('urgency'),
});

export async function listThreadsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const q = (req as Request & { validatedQuery: z.infer<typeof ListQuery> })
      .validatedQuery;

    let categories: Category[] | undefined;
    if (q.category && q.category !== 'All') {
      categories = categoryFromSlug(q.category);
    }

    const result = await listThreads(
      {
        userId,
        categories,
        urgencies: q.urgency ? [q.urgency] : undefined,
        status: q.status ? [q.status] : undefined,
        needsFollowUp: q.needsFollowUp,
        isRead: q.isRead,
      },
      { page: q.page, limit: q.limit, sort: q.sort },
    );

    res.json(ok(result.summaries, result.meta));
  } catch (err) {
    next(err);
  }
}

export async function followUpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { items, meta } = await listFollowUp(userId);
    res.json(ok(items, meta));
  } catch (err) {
    next(err);
  }
}

export async function otherHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const all = await Thread.countDocuments({ userId });
    const others = await Thread.find({
      userId,
      $or: [{ category: 'Other' }, { correctedCategory: 'Other' }],
    })
      .sort({ lastMessageAt: -1 })
      .lean();
    const summaries = (others as unknown as Parameters<typeof toSummary>[0][]).map((d) =>
      toSummary(d),
    );
    const filteredPercentOfInbox = all > 0
      ? Math.round((summaries.length / all) * 100)
      : 0;
    res.json(
      ok(summaries, {
        total: summaries.length,
        filteredPercentOfInbox,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function threadDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, ErrorCodes.THREAD_NOT_FOUND, 'Thread not found');
    }
    const thread = await Thread.findOne({ _id: id, userId }).lean();
    if (!thread) {
      throw new HttpError(404, ErrorCodes.THREAD_NOT_FOUND, 'Thread not found');
    }
    const owner = await User.findById(userId).lean();
    const staleThreshold = owner?.staleThresholdHrs ?? 48;
    const now = new Date();
    const summary = toSummary(thread as unknown as Parameters<typeof toSummary>[0]);
    if (computeNeedsFollowUp(thread as unknown as Parameters<typeof computeNeedsFollowUp>[0], now)) summary.needsFollowUp = true;
    res.json(
      ok({
        ...summary,
        messages: thread.messages,
        messagesTruncated: thread.messagesTruncated,
        correctedCategory: thread.correctedCategory,
        classificationStatus: thread.classificationStatus,
        classificationError: thread.classificationError,
        actionNeeded: thread.actionNeeded,
        deadline: thread.deadline ? thread.deadline.toISOString() : null,
        snoozedUntil: thread.snoozedUntil ? thread.snoozedUntil.toISOString() : null,
        repliedAt: thread.repliedAt ? thread.repliedAt.toISOString() : null,
        actionedAt: thread.actionedAt ? thread.actionedAt.toISOString() : null,
        draftedReply: thread.draftedReply,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        staleThresholdHrs: staleThreshold,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export const listThreadsValidator = validateQuery(ListQuery);

export const router_exports = { listThreadsHandler, followUpHandler, otherHandler, threadDetailHandler };
