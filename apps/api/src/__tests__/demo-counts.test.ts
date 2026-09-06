import { describe, it, expect } from 'vitest';
import { SEED_THREADS } from '../seed/faculty-threads.js';

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

describe('faculty-threads seed', () => {
  it('contains 19-22 threads total', () => {
    expect(SEED_THREADS.length).toBeGreaterThanOrEqual(19);
    expect(SEED_THREADS.length).toBeLessThanOrEqual(22);
  });

  it('every thread has at least one incoming message (senderIsFaculty: false)', () => {
    for (const t of SEED_THREADS) {
      const hasIncoming = t.messages.some((m) => !m.senderIsFaculty);
      expect(hasIncoming, `Thread ${t.externalThreadId} has no incoming messages`).toBe(true);
    }
  });

  it('contains exactly 7 unread-status candidates (last incoming, age > 1h)', () => {
    const unreadCandidates = SEED_THREADS.filter((t) => {
      const last = t.messages[t.messages.length - 1];
      if (last.senderIsFaculty) return false;
      return hoursAgo(last.sentAt) > 1;
    });
    expect(unreadCandidates.length).toBe(7);
  });

  it('contains at least 3 critical/urgent keyword candidates', () => {
    const criticalKeywords = /(re-?evaluation|moderation|today|critical|deadline)/i;
    const critical = SEED_THREADS.filter(
      (t) =>
        criticalKeywords.test(t.subject) ||
        t.messages.some((m) => criticalKeywords.test(m.body)),
    );
    expect(critical.length).toBeGreaterThanOrEqual(3);
  });

  it('contains at least 4 stale candidates (>48h unreplied, incoming last)', () => {
    const stale = SEED_THREADS.filter((t) => {
      const last = t.messages[t.messages.length - 1];
      if (last.senderIsFaculty) return false;
      return hoursAgo(last.sentAt) > 48;
    });
    expect(stale.length).toBeGreaterThanOrEqual(4);
  });

  it('every thread includes the faculty address in participants', () => {
    for (const t of SEED_THREADS) {
      expect(t.participants, t.externalThreadId).toContain('faculty.cse@aust.edu');
    }
  });

  it('every externalThreadId is unique', () => {
    const ids = new Set<string>();
    for (const t of SEED_THREADS) {
      expect(ids.has(t.externalThreadId)).toBe(false);
      ids.add(t.externalThreadId);
    }
  });

  it('every thread has at least one message', () => {
    for (const t of SEED_THREADS) {
      expect(t.messages.length).toBeGreaterThan(0);
    }
  });

  it('messages within a thread are sorted by sentAt ascending', () => {
    for (const t of SEED_THREADS) {
      for (let i = 1; i < t.messages.length; i++) {
        const prev = new Date(t.messages[i - 1].sentAt).getTime();
        const cur = new Date(t.messages[i].sentAt).getTime();
        expect(cur).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it('includes the headline re-evaluation thread (Tanvir)', () => {
    const found = SEED_THREADS.some((t) =>
      t.subject.toLowerCase().includes('re-evaluation'),
    );
    expect(found).toBe(true);
  });

  it('covers all 8 categories', () => {
    const text = SEED_THREADS.map((t) => t.subject + ' ' + t.messages.map((m) => m.body).join(' ')).join(' ').toLowerCase();
    expect(text).toMatch(/meeting|minutes|agenda/);
    expect(text).toMatch(/class|lab|room|cancel/);
    expect(text).toMatch(/student|re-evaluation/);
    expect(text).toMatch(/moderation|exam|grading|script|paper/);
    expect(text).toMatch(/circular|notice|accounts|registrar/);
    expect(text).toMatch(/research|review|journal|paper|draft/);
  });
});
