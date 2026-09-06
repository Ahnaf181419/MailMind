import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Thread } from '../models/Thread.js';
import { User } from '../models/User.js';
import { ok } from '@mailmind/shared/envelope';
import { MockIngestionProvider, seedMockData } from '../providers/ingestion/MockIngestionProvider.js';
import { LlmClassifierService } from '../providers/classification/LlmClassifierService.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const SyncBody = z.object({ reset: z.boolean().optional() }).optional();

export async function syncMockHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SyncBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_BODY', message: 'Invalid body' },
      });
      return;
    }
    const userId = req.user!.id;
    const reset = parsed.data?.reset === true;

    if (reset) {
      await Thread.deleteMany({ userId });
    }

    const owner = await User.findById(userId).lean();
    const vipSenders = owner?.vipSenders ?? [];
    const rawThreads = reset || (await Thread.countDocuments({ userId })) === 0
      ? seedMockData()
      : seedMockData();

    const provider = new MockIngestionProvider();
    const classifier = new LlmClassifierService();
    const raw = await provider.fetchThreads(String(userId));

    let ingested = 0;
    let reclassified = 0;
    let failed = 0;

    for (const t of raw) {
      try {
        const out = await classifier.classify({
          externalThreadId: t.externalThreadId,
          subject: t.subject,
          participants: t.participants,
          messages: t.messages,
          vipSenders,
          facultyContext: 'Department of Computer Science, AUST. Teaches CSE321, CSE307.',
        });

        const messagesToStore = t.messages.slice(-env.MAX_MESSAGES_PER_THREAD);
        const truncated = t.messages.length > messagesToStore.length;
        const lastMsg = messagesToStore[messagesToStore.length - 1];
        const repliedOnInsert = lastMsg?.senderIsFaculty === true;

        const update = {
          $set: {
            subject: t.subject,
            participants: t.participants,
            messages: messagesToStore,
            messageCount: messagesToStore.length,
            messagesTruncated: truncated,
            category: out.category,
            urgency: out.urgency,
            actionNeeded: out.actionNeeded,
            deadline: out.deadline ? new Date(out.deadline) : null,
            aiExplanation: out.aiExplanation,
            classificationStatus: 'completed' as const,
            classificationError: null,
            lastMessageAt: new Date(t.lastMessageAt),
          },
          $setOnInsert: {
            userId,
            externalThreadId: t.externalThreadId,
            status: repliedOnInsert ? 'replied' : 'unread',
            isRead: repliedOnInsert,
            repliedAt: repliedOnInsert ? new Date(lastMsg.sentAt) : null,
          },
        };

        const result = await Thread.findOneAndUpdate(
          { userId, externalThreadId: t.externalThreadId },
          update,
          { upsert: true, new: true },
        );

        if (result?.classificationStatus === 'completed') {
          ingested++;
        } else {
          reclassified++;
        }
      } catch (err) {
        failed++;
        logger.warn({ err: (err as Error).message, externalThreadId: t.externalThreadId }, 'Thread ingest failed');
        await Thread.findOneAndUpdate(
          { userId, externalThreadId: t.externalThreadId },
          {
            $set: {
              subject: t.subject,
              participants: t.participants,
              messages: t.messages.slice(-env.MAX_MESSAGES_PER_THREAD),
              messageCount: t.messages.length,
              category: 'Other',
              urgency: 'Low',
              aiExplanation: 'Classification failed — please review manually.',
              classificationStatus: 'failed',
              classificationError: (err as Error).message,
              lastMessageAt: new Date(t.lastMessageAt),
            },
            $setOnInsert: { userId, externalThreadId: t.externalThreadId },
          },
          { upsert: true, new: true },
        );
      }
    }

    res.json(ok({ ingested, reclassified, failed }));
  } catch (err) {
    next(err);
  }
}
