import type { ChatSession, RawMessage } from './types';

const SESSION_LABEL_BACKFILL_LIMIT = 24;
const SESSION_LABEL_HISTORY_LIMIT = 32;
const SESSION_LABEL_BACKFILL_CONCURRENCY = 3;

type BackfillState = {
  sessionLabels: Record<string, string>;
};

type SessionLabelBackfillController = {
  schedule: (sessions: ChatSession[]) => void;
  cancel: () => void;
};

function isNamedAgentMainSession(sessionKey: string): boolean {
  if (!sessionKey.startsWith('agent:') || !sessionKey.endsWith(':main')) return false;
  const parts = sessionKey.split(':');
  return (parts[1] || 'main') !== 'main';
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  shouldContinue: () => boolean,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (shouldContinue()) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.allSettled(workers);
}

export function createSessionLabelBackfillController(options: {
  getState: () => BackfillState;
  isInternalSessionTitle: (value: unknown) => boolean;
  loadCache: (sessionKey: string) => RawMessage[];
  applyPreview: (sessionKey: string, messages: RawMessage[]) => void;
  loadHistory: (sessionKey: string, limit: number) => Promise<RawMessage[]>;
}): SessionLabelBackfillController {
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    seq += 1;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (sessions: ChatSession[]): void => {
    cancel();
    const currentSeq = seq;
    timer = setTimeout(() => {
      timer = null;
      const state = options.getState();
      const candidates = [...sessions]
        .filter((session) => {
          if (!session.key || isNamedAgentMainSession(session.key)) return false;
          if ((state.sessionLabels?.[session.key] || '').trim()) return false;
          if (options.isInternalSessionTitle(session.displayName || session.label)) return false;
          const cached = options.loadCache(session.key);
          if (cached.length > 0) {
            options.applyPreview(session.key, cached);
            return false;
          }
          return true;
        })
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, SESSION_LABEL_BACKFILL_LIMIT);

      if (candidates.length === 0) return;
      void runWithConcurrency(
        candidates,
        SESSION_LABEL_BACKFILL_CONCURRENCY,
        async (session) => {
          try {
            const rawMessages = await options.loadHistory(session.key, SESSION_LABEL_HISTORY_LIMIT);
            if (currentSeq !== seq) return;
            options.applyPreview(session.key, rawMessages);
          } catch {
            // Per-session label failures should not break chat loading.
          }
        },
        () => currentSeq === seq,
      );
    }, 300);
  };

  return { schedule, cancel };
}
