import type { IngestionProvider } from './IngestionProvider.js';

export class GmailIngestionProvider implements IngestionProvider {
  readonly kind = 'gmail' as const;

  async fetchThreads(_userId: string): Promise<never[]> {
    throw new Error(
      'GmailIngestionProvider is Phase 2 — not implemented in MVP. Use MockIngestionProvider.',
    );
  }
}
