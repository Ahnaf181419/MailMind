import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Thread } from '../models/Thread.js';
import { DigestCache } from '../models/DigestCache.js';
import { env } from '../config/env.js';
import { ok } from '@mailmind/shared/envelope';
import type { ThreadDoc } from '../models/Thread.js';

export async function digestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const cached = await DigestCache.findOne({ userId }).lean();

    const topThreads = await Thread.find({ userId })
      .sort({ urgency: -1, lastMessageAt: -1 })
      .limit(10)
      .lean();

    const topIds = topThreads.map((t) => t._id);

    const fresh =
      cached &&
      now.getTime() - new Date(cached.generatedAt).getTime() <
        env.DIGEST_CACHE_TTL_SECONDS * 1000 &&
      topIds.length === cached.basedOnThreadIds.length &&
      topIds.every((id, i) => String(id) === String(cached.basedOnThreadIds[i]));

    if (fresh && cached) {
      res.json(ok({
        digestText: cached.digestText,
        generatedAt: cached.generatedAt.toISOString(),
        stale: false,
      }));
      return;
    }

    const text = buildDigestText(topThreads as unknown as ThreadDoc[]);

    await DigestCache.findOneAndUpdate(
      { userId },
      {
        $set: {
          digestText: text,
          generatedAt: now,
          basedOnThreadIds: topIds,
        },
      },
      { upsert: true, new: true },
    );

    res.json(ok({
      digestText: text,
      generatedAt: now.toISOString(),
      stale: !cached,
    }));
  } catch (err) {
    next(err);
  }
}

function buildDigestText(threads: ThreadDoc[]): string {
  if (!threads || threads.length === 0) {
    return 'No emails synced yet - run a sync to get started.';
  }
  const lines: string[] = [];
  lines.push(`Daily digest - top ${threads.length} items`);
  for (const t of threads) {
    const ec = (t.correctedCategory ?? t.category) as string;
    lines.push(`- [${t.urgency}] ${ec} - ${t.subject}`);
  }
  return lines.join('\n');
}
