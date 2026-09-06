import type { Message } from '@mailmind/shared/types';

export interface RawThread {
  externalThreadId: string;
  subject: string;
  participants: string[];
  messages: Message[];
  lastMessageAt: string;
}

export interface IngestionProvider {
  fetchThreads(userId: string): Promise<RawThread[]>;
  readonly kind: 'mock' | 'gmail';
}
