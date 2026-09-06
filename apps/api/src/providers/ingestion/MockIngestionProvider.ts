import type { IngestionProvider, RawThread } from './IngestionProvider.js';
import { SEED_THREADS } from '../../seed/faculty-threads.js';

export class MockIngestionProvider implements IngestionProvider {
  readonly kind = 'mock' as const;

  async fetchThreads(_userId: string): Promise<RawThread[]> {
    return SEED_THREADS;
  }
}

export function seedMockData(): RawThread[] {
  return SEED_THREADS;
}
