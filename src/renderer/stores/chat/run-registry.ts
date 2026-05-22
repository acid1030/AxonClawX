import type { InFlightRunState } from './event-routing';

export const inFlightRunBySession = new Map<string, InFlightRunState>();
export const sessionKeyByRunId = new Map<string, string>();

export function trackInFlightRun(
  sessionKey: string,
  runId: string | null,
  lastUserMessageAt?: number | null,
): void {
  if (!sessionKey) return;
  const previous = inFlightRunBySession.get(sessionKey);
  const next: InFlightRunState = {
    sessionKey,
    runId: runId || previous?.runId || null,
    lastUserMessageAt: lastUserMessageAt ?? previous?.lastUserMessageAt ?? null,
  };
  inFlightRunBySession.set(sessionKey, next);
  if (next.runId) {
    sessionKeyByRunId.set(next.runId, sessionKey);
  }
}

export function finishInFlightRun(
  sessionKey: string | null | undefined,
  runId?: string | null,
): void {
  if (sessionKey) {
    const existing = inFlightRunBySession.get(sessionKey);
    if (!runId || !existing?.runId || existing.runId === runId) {
      inFlightRunBySession.delete(sessionKey);
      if (existing?.runId) {
        sessionKeyByRunId.delete(existing.runId);
      }
    }
  }
  if (runId) {
    sessionKeyByRunId.delete(runId);
  }
}
