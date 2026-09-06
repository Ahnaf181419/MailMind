import { Types } from 'mongoose';
import { Thread, type ThreadDoc } from '../models/Thread.js';
import type {
  ThreadSummary,
  Category,
  Urgency,
  Status,
} from '@mailmind/shared/types';
import { env } from '../config/env.js';

export interface ThreadFilter {
  userId: string;
  categories?: Category[];
  urgencies?: Urgency[];
  status?: Status[];
  needsFollowUp?: boolean;
  isRead?: boolean;
}

// Looser type that accepts both ThreadDoc and lean results
type AnyThread = ThreadDoc | (Partial<ThreadDoc> & { _id: Types.ObjectId; messages: ThreadDoc['messages']; lastMessageAt: Date; isRead: boolean; status: Status; messagesTruncated?: boolean; urgency: Urgency; deadline?: Date | null; snoozedUntil?: Date | null; category: Category; correctedCategory?: Category | null });

function effectiveCategory(t: AnyThread): Category {
  return (t.correctedCategory ?? t.category) as Category;
}

export function toSummary(t: AnyThread): ThreadSummary {
  return {
    id: String(t._id),
    subject: t.subject ?? '',
    category: t.category,
    effectiveCategory: effectiveCategory(t),
    urgency: t.urgency,
    aiExplanation: t.aiExplanation ?? '',
    deadline: t.deadline ? t.deadline.toISOString() : null,
    isRead: t.isRead,
    needsFollowUp: t.needsFollowUp ?? false,
    status: t.status,
    lastMessageAt: t.lastMessageAt.toISOString(),
    messageCount: t.messageCount ?? t.messages.length,
    participants: t.participants ?? [],
  };
}

export function computeNeedsFollowUp(
  t: AnyThread,
  now: Date = new Date(),
): boolean {
  if (effectiveCategory(t) === 'Other') return false;
  if (t.status === 'replied' || t.status === 'actioned' || t.status === 'snoozed') return false;
  if (t.snoozedUntil && t.snoozedUntil > now) return false;
  if (!t.messages || t.messages.length === 0) return false;
  const last = t.messages[t.messages.length - 1];
  if (last.senderIsFaculty) return false;
  const ageHours = (now.getTime() - t.lastMessageAt.getTime()) / 36e5;
  return ageHours > env.FOLLOWUP_THRESHOLD_HOURS;
}

export function computeIsStale(
  t: AnyThread,
  thresholdHours: number,
  now: Date = new Date(),
): boolean {
  if (t.status === 'replied' || t.status === 'actioned' || t.status === 'snoozed') return false;
  if (t.snoozedUntil && t.snoozedUntil > now) return false;
  if (t.isRead) return false;
  const ageHours = (now.getTime() - t.lastMessageAt.getTime()) / 36e5;
  return ageHours > thresholdHours;
}

export async function listThreads(filter: ThreadFilter, opts: {
  page: number;
  limit: number;
  sort: 'urgency' | 'recent' | 'oldest';
}) {
  const q: Record<string, unknown> = { userId: filter.userId };
  if (filter.categories && filter.categories.length > 0) {
    q.$or = [
      { category: { $in: filter.categories } },
      { correctedCategory: { $in: filter.categories } },
    ];
  }
  if (filter.urgencies && filter.urgencies.length > 0) {
    q.urgency = { $in: filter.urgencies };
  }
  if (filter.status && filter.status.length > 0) {
    q.status = { $in: filter.status };
  }
  if (typeof filter.isRead === 'boolean') {
    q.isRead = filter.isRead;
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    urgency: { urgency: -1, lastMessageAt: -1 },
    recent: { lastMessageAt: -1 },
    oldest: { lastMessageAt: 1 },
  };

  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    Thread.find(q)
      .sort(sortMap[opts.sort] ?? sortMap.urgency)
      .skip(skip)
      .limit(opts.limit)
      .lean(),
    Thread.countDocuments(q),
  ]);

  const now = new Date();
  const summaries = (docs as unknown as AnyThread[]).map((d) => {
    const summary = toSummary(d);
    if (computeNeedsFollowUp(d, now)) summary.needsFollowUp = true;
    return summary;
  });

  return {
    summaries,
    meta: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    },
  };
}

export async function listFollowUp(userId: string) {
  const docs = await Thread.find({
    userId,
    status: { $in: ['unread', 'read'] },
    snoozedUntil: null,
  })
    .sort({ lastMessageAt: 1 })
    .lean();

  const now = new Date();
  const items = (docs as unknown as AnyThread[])
    .filter((d) => computeNeedsFollowUp(d, now))
    .map((d) => {
      const waitingHours = Math.floor((now.getTime() - d.lastMessageAt.getTime()) / 36e5);
      return {
        ...toSummary(d),
        waitingHours,
        reason: d.isRead ? 'Unanswered' : 'Unread and expects a reply',
      };
    });

  return { items, meta: { total: items.length } };
}
