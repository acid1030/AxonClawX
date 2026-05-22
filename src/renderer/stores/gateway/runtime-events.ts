export interface RuntimeChatEvent {
  runId?: unknown;
  sessionKey?: unknown;
  stream?: unknown;
  seq?: unknown;
  state?: unknown;
  message?: unknown;
  errorMessage?: unknown;
  [key: string]: unknown;
}

export interface GatewayNotification {
  method?: string;
  params?: Record<string, unknown>;
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function extractErrorMessage(...records: Array<Record<string, unknown>>): string | undefined {
  for (const record of records) {
    for (const key of ['errorMessage', 'error']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        if (typeof nested.message === 'string' && nested.message.trim()) return nested.message.trim();
      }
    }
  }
  return undefined;
}

function firstStringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractRunId(...records: Array<Record<string, unknown>>): string | undefined {
  for (const record of records) {
    const value = firstStringValue(record.runId, record.run_id);
    if (value) return value;
  }
  return undefined;
}

function extractSessionKey(...records: Array<Record<string, unknown>>): string | undefined {
  for (const record of records) {
    const value = firstStringValue(
      record.sessionKey,
      record.session_key,
      record.session,
      record.sessionId,
      record.session_id,
      record.threadKey,
      record.thread_id,
      record.conversationId,
      record.conversation_id,
    );
    if (value) return value;
  }
  return undefined;
}

function phaseToState(phase: unknown): RuntimeChatEvent['state'] {
  switch (phase) {
    case 'started':
      return 'started';
    case 'completed':
    case 'done':
    case 'finished':
    case 'end':
      return 'final';
    case 'error':
    case 'failed':
      return 'error';
    case 'aborted':
    case 'abort':
      return 'aborted';
    default:
      return undefined;
  }
}

export function normalizeGatewayNotification(notification: GatewayNotification | undefined): RuntimeChatEvent | null {
  if (!notification || notification.method !== 'agent' || !notification.params || typeof notification.params !== 'object') {
    return null;
  }

  const p = notification.params;
  const data = objectRecord(p.data);
  const message = p.message ?? data.message;
  const messageRecord = objectRecord(message);
  const phase = data.phase ?? p.phase;
  const state = p.state ?? data.state ?? phaseToState(phase);
  const errorMessage = extractErrorMessage(p, data, messageRecord);

  if (!state && !message && !errorMessage) return null;

  return {
    ...data,
    runId: extractRunId(p, data, messageRecord),
    sessionKey: extractSessionKey(p, data, messageRecord),
    stream: p.stream ?? data.stream,
    seq: p.seq ?? data.seq,
    state,
    message,
    errorMessage,
  };
}

export function normalizeGatewayChatMessage(data: unknown): RuntimeChatEvent | null {
  const chatData = objectRecord(data);
  const payload = ('message' in chatData && typeof chatData.message === 'object')
    ? objectRecord(chatData.message)
    : chatData;

  if (Object.keys(payload).length === 0) return null;

  return {
    ...(payload.state ? payload : {}),
    state: payload.state ?? 'final',
    message: payload.state ? (payload.message ?? ((payload.role || payload.content) ? payload : undefined)) : payload,
    runId: extractRunId(chatData, payload),
    sessionKey: extractSessionKey(chatData, payload),
    errorMessage: payload.errorMessage ?? payload.error,
  };
}
