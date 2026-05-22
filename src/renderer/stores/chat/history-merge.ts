import type { RawMessage } from './types';
import { toMs } from './time';
import {
  getMessageDedupeKey,
  isHiddenInternalChatMessage,
  isSameChatMessage,
  normalizeVisibleMessages,
} from './message-normalizer';

function belongsToSession(message: RawMessage, sessionKey?: string): boolean {
  if (!sessionKey) return true;
  return message._sessionKey === sessionKey;
}

export function mergeOptimisticDuringSend(
  incoming: RawMessage[],
  previous: RawMessage[],
  lastUserMessageAt: number | null,
  sessionKey?: string,
): RawMessage[] {
  if (!lastUserMessageAt) return incoming;
  const userMs = toMs(lastUserMessageAt);
  const hasUser = incoming.some(
    (message) => message.role === 'user' && message.timestamp && Math.abs(toMs(message.timestamp) - userMs) < 30_000,
  );
  const optimistic = [...previous].reverse().find(
    (message) => belongsToSession(message, sessionKey)
      && message.role === 'user'
      && message.timestamp
      && Math.abs(toMs(message.timestamp) - userMs) < 30_000,
  );
  const withOptimistic = hasUser || !optimistic ? incoming : [...incoming, optimistic];

  const merged = previous.filter(
    (message) => message
      && belongsToSession(message, sessionKey)
      && !isHiddenInternalChatMessage(message),
  );
  for (const message of withOptimistic) {
    const existingIndex = merged.findIndex((item) => {
      if (isSameChatMessage(item, message)) return true;
      return getMessageDedupeKey(item) === getMessageDedupeKey(message);
    });
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...message };
    } else {
      merged.push(message);
    }
  }
  return normalizeVisibleMessages(merged);
}

export function mergeLoadedHistoryWithVisibleMessages(
  incoming: RawMessage[],
  visible: RawMessage[],
  sessionKey?: string,
): RawMessage[] {
  if (visible.length === 0) return incoming;
  const merged = [...incoming];
  const hasTimestampedIncoming = incoming.some((message) => Boolean(message?.timestamp));
  for (const message of visible) {
    if (!message || isHiddenInternalChatMessage(message)) continue;
    if (!belongsToSession(message, sessionKey)) continue;
    // A stale local cache row without a timestamp cannot be ordered safely.
    // When Gateway history exists, preserving that row can append old content
    // after the latest assistant response, which looks like session/message
    // cross-talk. Live user/final assistant messages are timestamped before
    // they enter this merge path, so skipping timestamp-less local rows here is
    // safer than corrupting the visible transcript order.
    if (hasTimestampedIncoming && !message.timestamp) continue;
    const existingIndex = merged.findIndex((item) => {
      if (isSameChatMessage(item, message)) return true;
      return getMessageDedupeKey(item) === getMessageDedupeKey(message);
    });
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...message, ...merged[existingIndex] };
    } else {
      merged.push(message);
    }
  }
  return normalizeVisibleMessages(merged);
}
