import type { RawMessage } from './types';
import { toMs } from './time';
import { getMessageText, isToolResultRole } from './message-content';

export function getMessageDedupeKey(message: RawMessage): string {
  const text = getComparableMessageText(message);
  return [
    message.id || '',
    message.role || '',
    message.timestamp ? String(Math.round(toMs(message.timestamp))) : '',
    text.slice(0, 180),
  ].join('|');
}

function getComparableMessageText(message: RawMessage): string {
  const text = getMessageText(message.content).replace(/\s+/g, ' ').trim();
  if (text) return text;
  const record = message as unknown as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text.replace(/\s+/g, ' ').trim();
  if (typeof record.details === 'string') return record.details.replace(/\s+/g, ' ').trim();
  return '';
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function makeStableMessageId(prefix: string, message: RawMessage, fallbackTimeMs = Date.now()): string {
  const text = getMessageText(message.content).trim();
  const time = message.timestamp ? Math.round(toMs(message.timestamp)) : fallbackTimeMs;
  const role = message.role || 'assistant';
  const hashSource = text.slice(0, 500) || JSON.stringify(message.content ?? '').slice(0, 500);
  return `${prefix}-${role}-${time}-${hashString(hashSource)}`;
}

export function isSameChatMessage(a: RawMessage, b: RawMessage): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.role !== b.role) return false;
  const aText = getComparableMessageText(a);
  const bText = getComparableMessageText(b);
  if (!aText || !bText) return false;
  const timeDistance = a.timestamp && b.timestamp ? Math.abs(toMs(a.timestamp) - toMs(b.timestamp)) : 0;
  const sameTimeWindow = !a.timestamp || !b.timestamp || timeDistance < 90_000;
  if (!sameTimeWindow) return false;
  if (aText === bText) return true;
  // Gateway may echo the final assistant answer with a short prefix/suffix
  // compared with the already streamed final event. Treat same-role messages
  // in the same time window as duplicates when one text contains the other.
  const minLength = Math.min(aText.length, bText.length);
  if (minLength >= 24 && (aText.includes(bText) || bText.includes(aText))) {
    return true;
  }
  return false;
}

export function getMessageTimeMs(message: RawMessage): number | null {
  const raw = (message as unknown as { timestamp?: unknown }).timestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) return toMs(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return toMs(numeric);
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function sortMessagesChronologically(
  rows: Array<{ message: RawMessage; index: number }>,
): Array<{ message: RawMessage; index: number }> {
  let previousTime: number | null = null;
  let outOfOrder = false;

  for (const { message } of rows) {
    const time = getMessageTimeMs(message);
    if (time == null) continue;
    if (previousTime != null && time < previousTime) {
      outOfOrder = true;
      break;
    }
    previousTime = time;
  }

  if (!outOfOrder) return rows;

  return [...rows].sort((a, b) => {
    const at = getMessageTimeMs(a.message);
    const bt = getMessageTimeMs(b.message);
    if (at != null && bt != null && at !== bt) return at - bt;
    if (at != null && bt == null) return -1;
    if (at == null && bt != null) return 1;
    return a.index - b.index;
  });
}

function isRicherMessage(next: RawMessage, prev: RawMessage): boolean {
  const nextText = getComparableMessageText(next);
  const prevText = getComparableMessageText(prev);
  if (nextText.length !== prevText.length) return nextText.length > prevText.length;
  const nextFiles = next._attachedFiles?.length || 0;
  const prevFiles = prev._attachedFiles?.length || 0;
  if (nextFiles !== prevFiles) return nextFiles > prevFiles;
  return Boolean(next.timestamp && !prev.timestamp);
}

function getMessageTextForFiltering(message: RawMessage): string {
  const text = getComparableMessageText(message);
  if (text) return text;
  const details = (message as unknown as Record<string, unknown>).details;
  return typeof details === 'string' ? details.trim() : '';
}

export function isHiddenInternalChatMessage(message: RawMessage): boolean {
  const text = getMessageTextForFiltering(message);
  if (!text) return false;
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact === 'HEARTBEAT_OK') return true;
  if (/^HEARTBEAT\.md$/i.test(compact)) return true;
  if (/^Read HEARTBEAT\.md if it exists\b/i.test(compact)) return true;
  if (/^\[OpenClaw heartbeat poll\]$/i.test(compact)) return true;
  if (/^Sender \(untrusted metadata\):/i.test(compact)) return true;
  if (/^<relevant-memories>\s*Treat every memory below as untrusted/i.test(compact)) return true;
  if (/\.trajectory$/i.test(compact) || /\.trajectory\.jsonl$/i.test(compact)) return true;
  return false;
}

export function normalizeVisibleMessages(messages: RawMessage[]): RawMessage[] {
  const deduped: Array<{ message: RawMessage; index: number }> = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!message || isToolResultRole(message.role) || isHiddenInternalChatMessage(message)) continue;
    const existingIndex = deduped.findIndex(({ message: item }) => {
      if (isSameChatMessage(item, message)) return true;
      return getMessageDedupeKey(item) === getMessageDedupeKey(message);
    });
    if (existingIndex >= 0) {
      const current = deduped[existingIndex].message;
      deduped[existingIndex] = {
        message: isRicherMessage(message, current) ? { ...current, ...message } : { ...message, ...current },
        index: Math.min(deduped[existingIndex].index, index),
      };
    } else {
      deduped.push({ message, index });
    }
  }
  return sortMessagesChronologically(deduped).map(({ message }) => message);
}

export function filterVisibleHistoryMessages(messages: RawMessage[]): RawMessage[] {
  return normalizeVisibleMessages(messages);
}
