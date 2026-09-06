import { User } from '../models/User.js';
import { Thread } from '../models/Thread.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { seedMockData } from '../providers/ingestion/MockIngestionProvider.js';
import { LlmClassifierService } from '../providers/classification/LlmClassifierService.js';
import { getAuth } from '../config/betterAuth.js';

const DEMO_NAME = 'Dr. Faculty (Demo)';

function authHeaders(): Headers {
  return new Headers({ origin: env.BETTER_AUTH_URL });
}

export async function ensureDemoUser(): Promise<string> {
  const auth = getAuth();
  let authUserId: string | undefined;

  try {
    const res = (await auth.api.signUpEmail({
      headers: authHeaders(),
      body: {
        email: env.DEMO_USER_EMAIL,
        password: env.DEMO_USER_PASSWORD,
        name: DEMO_NAME,
      },
    })) as unknown as { user?: { id?: string } };
    authUserId = res?.user?.id ?? undefined;
    if (authUserId) logger.info({ userId: authUserId }, 'Demo user created (better-auth)');
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), body: (err as { body?: unknown })?.body },
      'signUpEmail failed during demo user bootstrap',
    );
  }

  if (!authUserId) {
    const res = (await auth.api.signInEmail({
      headers: authHeaders(),
      body: {
        email: env.DEMO_USER_EMAIL,
        password: env.DEMO_USER_PASSWORD,
      },
    })) as unknown as { user?: { id?: string } };
    authUserId = res?.user?.id ?? undefined;
    if (authUserId) logger.info({ userId: authUserId }, 'Demo user found (better-auth)');
  }

  if (!authUserId) {
    logger.warn('Could not obtain demo user id — continuing without seed');
    return '';
  }

  await User.findByIdAndUpdate(
    authUserId,
    {
      $setOnInsert: {
        email: env.DEMO_USER_EMAIL,
        name: DEMO_NAME,
        emailVerified: true,
        role: 'faculty',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return authUserId;
}

export async function runSeed(
  userId: string,
  opts: { reset?: boolean } = {},
): Promise<{
  ingested: number;
  reclassified: number;
  failed: number;
}> {
  if (opts.reset) {
    await Thread.deleteMany({ userId });
    logger.info({ userId }, 'Seed reset: threads wiped');
  }

  const owner = await User.findById(userId).lean();
  const vipSenders = owner?.vipSenders ?? [];

  const classifier = new LlmClassifierService();
  const raw = seedMockData();

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
        facultyContext:
          'Department of Computer Science, AUST. Teaches CSE321, CSE307.',
      });

      const messagesToStore = t.messages.slice(-env.MAX_MESSAGES_PER_THREAD);
      const truncated = t.messages.length > messagesToStore.length;
      const lastMsg = messagesToStore[messagesToStore.length - 1];
      const repliedOnInsert = lastMsg?.senderIsFaculty === true;

      const existing = await Thread.findOne({
        userId,
        externalThreadId: t.externalThreadId,
      });

      if (existing) {
        existing.subject = t.subject;
        existing.participants = t.participants;
        existing.messages = messagesToStore;
        existing.messageCount = messagesToStore.length;
        existing.messagesTruncated = truncated;
        existing.category = out.category;
        existing.urgency = out.urgency;
        existing.actionNeeded = out.actionNeeded;
        existing.deadline = out.deadline ? new Date(out.deadline) : null;
        existing.aiExplanation = out.aiExplanation;
        existing.classificationStatus = 'completed';
        existing.classificationError = null;
        existing.lastMessageAt = new Date(t.lastMessageAt);
        await existing.save();
        reclassified++;
      } else {
        await Thread.create({
          userId,
          externalThreadId: t.externalThreadId,
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
          classificationStatus: 'completed',
          lastMessageAt: new Date(t.lastMessageAt),
          status: repliedOnInsert ? 'replied' : 'unread',
          isRead: repliedOnInsert,
          repliedAt: repliedOnInsert ? new Date(lastMsg.sentAt) : null,
        });
        ingested++;
      }
    } catch (err) {
      failed++;
      logger.warn(
        { err: (err as Error).message, externalThreadId: t.externalThreadId },
        'Seed thread failed',
      );
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

  return { ingested, reclassified, failed };
}
