export interface InFlightRunState {
  sessionKey: string;
  runId: string | null;
  lastUserMessageAt: number | null;
}

export interface ResolveEventTargetInput {
  eventSessionKey: string | null;
  runId: string;
  currentSessionKey: string;
  activeRunId: string | null;
  sendingSessionKey: string | null;
  inFlightRunBySession: Map<string, InFlightRunState>;
  sessionKeyByRunId: Map<string, string>;
}

function getOnlyCompatibleInFlightSessionKey(
  runId: string,
  inFlightRunBySession: Map<string, InFlightRunState>,
): string | null {
  const entries = Array.from(inFlightRunBySession.entries());
  if (entries.length !== 1) return null;
  const [sessionKey, inFlight] = entries[0];
  return !inFlight.runId || inFlight.runId === runId ? sessionKey : null;
}

export function resolveEventTargetSessionKey(input: ResolveEventTargetInput): string | null {
  const {
    eventSessionKey,
    runId,
    currentSessionKey,
    activeRunId,
    sendingSessionKey,
    inFlightRunBySession,
    sessionKeyByRunId,
  } = input;

  if (!runId) return eventSessionKey;

  const mappedSessionKey = sessionKeyByRunId.get(runId);
  if (mappedSessionKey) return mappedSessionKey;

  if (activeRunId && runId === activeRunId) return currentSessionKey;

  // Some Gateway events carry the storage sessionId or a short key instead of
  // the canonical UI session key. Prefer run ownership above; only trust the
  // event session key after known run mappings have been checked.
  if (eventSessionKey) return eventSessionKey;

  const sendingRun = sendingSessionKey ? inFlightRunBySession.get(sendingSessionKey) : undefined;
  if (sendingSessionKey && sendingRun && (!sendingRun.runId || sendingRun.runId === runId)) {
    return sendingSessionKey;
  }

  return getOnlyCompatibleInFlightSessionKey(runId, inFlightRunBySession);
}
