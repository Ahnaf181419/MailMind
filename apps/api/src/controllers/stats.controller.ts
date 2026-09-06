import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Thread } from '../models/Thread.js';
import { User } from '../models/User.js';
import { toSummary, computeIsStale } from '../services/threadService.js';
import { ok } from '@mailmind/shared/envelope';
import { HttpError } from '../middleware/errorHandler.js';

export async function statsOverviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const owner = await User.findById(userId).lean();
    const threshold = owner?.staleThresholdHrs ?? 48;

    const docs = await Thread.find({ userId }).lean();
    const now = new Date();

    let critical = 0;
    let high = 0;
    let unread = 0;
    let stale = 0;
    let needsFollowUp = 0;

    for (const d of docs) {
      const t = d as unknown as Parameters<typeof computeIsStale>[0];
      const effective = (t.correctedCategory ?? t.category) as string;
      if (effective !== 'Other' && t.urgency === 'Critical') critical++;
      if (effective !== 'Other' && t.urgency === 'High') high++;
      if (t.status === 'unread') unread++;
      if (computeIsStale(t, threshold, now)) stale++;
      const last = t.messages[t.messages.length - 1];
      if (last && !last.senderIsFaculty) {
        const ageH = (now.getTime() - t.lastMessageAt.getTime()) / 36e5;
        if (ageH > 48 && effective !== 'Other' &&
            t.status !== 'replied' && t.status !== 'actioned' && t.status !== 'snoozed') {
          needsFollowUp++;
        }
      }
    }

    res.json(ok({
      critical,
      high,
      urgent: critical + high,
      needsFollowUp,
      unread,
      stale,
      totalThreads: docs.length,
    }));
  } catch (err) {
    next(err);
  }
}

export async function dashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const owner = await User.findById(userId).lean();
    const threshold = owner?.staleThresholdHrs ?? 48;

    const docs = await Thread.find({ userId }).sort({ urgency: -1, lastMessageAt: -1 }).lean();
    const now = new Date();

    const byCategory: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    let unread = 0;
    let stale = 0;
    let urgent = 0;
    const todaysAttention: ReturnType<typeof toSummary>[] = [];

    for (const d of docs) {
      const t = d as unknown as Parameters<typeof computeIsStale>[0];
      const effective = (t.correctedCategory ?? t.category) as string;
      byCategory[effective] = (byCategory[effective] ?? 0) + 1;
      byUrgency[t.urgency] = (byUrgency[t.urgency] ?? 0) + 1;
      if (t.status === 'unread') unread++;
      const isStale = computeIsStale(t, threshold, now);
      if (isStale) stale++;
      if ((t.urgency === 'Critical' || t.urgency === 'High') && effective !== 'Other') urgent++;
      const last = t.messages[t.messages.length - 1];
      const lastIsOutgoing = last?.senderIsFaculty;
      const ageH = (now.getTime() - t.lastMessageAt.getTime()) / 36e5;
      const upcomingDeadline = t.deadline && (t.deadline.getTime() - now.getTime()) / 36e5 < 48;
      const attention =
        (t.urgency === 'Critical') ||
        (isStale) ||
        (upcomingDeadline) ||
        (ageH > 48 && !lastIsOutgoing && effective !== 'Other' && t.status !== 'replied' && t.status !== 'actioned');
      if (attention) todaysAttention.push(toSummary(t));
    }

    res.json(ok({
      total: docs.length,
      unread,
      urgent,
      stale,
      byCategory,
      byUrgency,
      todaysAttention: todaysAttention.slice(0, 8),
    }));
  } catch (err) {
    next(err);
  }
}
