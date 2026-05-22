import type { RawMessage } from './types';
import { getMessageDedupeKey, isSameChatMessage, normalizeVisibleMessages } from './message-normalizer';

// LocalStorage fallback keeps renderer reloads and delayed Gateway persistence
// from erasing visible conversation state.
const MSG_CACHE_PREFIX = 'axon.chat.session-msgs.v2.';
const MSG_CACHE_MAX_PER_SESSION = 200;

function msgCacheKey(sessionKey: string): string {
  return MSG_CACHE_PREFIX + encodeURIComponent(sessionKey);
}

export function saveMsgCache(sessionKey: string, messages: RawMessage[]): void {
  if (!sessionKey) return;
  try {
    if (messages.length === 0 && localStorage.getItem(msgCacheKey(sessionKey))) {
      return;
    }
    const toSave = normalizeVisibleMessages(messages).slice(-MSG_CACHE_MAX_PER_SESSION);
    localStorage.setItem(msgCacheKey(sessionKey), JSON.stringify(toSave));
  } catch {
    // ignore storage failures
  }
}

export function loadMsgCache(sessionKey: string): RawMessage[] {
  if (!sessionKey) return [];
  try {
    const raw = localStorage.getItem(msgCacheKey(sessionKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RawMessage[]).map((message) => (
      message?._sessionKey === sessionKey ? message : { ...message, _sessionKey: sessionKey }
    ));
  } catch {
    return [];
  }
}

export function removeMsgCache(sessionKey: string): void {
  if (!sessionKey) return;
  try {
    localStorage.removeItem(msgCacheKey(sessionKey));
  } catch {
    // ignore storage failures
  }
}

export function appendMessageToSessionCache(sessionKey: string, message: RawMessage): RawMessage[] {
  const cached = loadMsgCache(sessionKey);
  const msgKey = getMessageDedupeKey(message);
  const exists = cached.some((item) => {
    if (isSameChatMessage(item, message)) return true;
    return getMessageDedupeKey(item) === msgKey;
  });
  const next = normalizeVisibleMessages(exists ? cached : [...cached, message]).slice(-MSG_CACHE_MAX_PER_SESSION);
  saveMsgCache(sessionKey, next);
  return next;
}
