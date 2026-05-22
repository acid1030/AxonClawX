import type { ChatSession } from './types';
import { toMs } from './time';

export function isInternalSessionTitle(value: string | undefined): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return /<relevant-memories>|read heartbeat\.md|heartbeat_ok|sender \(untrusted metadata\)|\.trajectory(?:\.jsonl)?$/i.test(text);
}

export function getCanonicalPrefixFromSessions(sessions: ChatSession[]): string | null {
  const canonical = sessions.find((s) => s.key.startsWith('agent:'))?.key;
  if (!canonical) return null;
  const parts = canonical.split(':');
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts[1]}`;
}

export function getCanonicalPrefixFromSessionKey(sessionKey: string): string | null {
  if (!sessionKey.startsWith('agent:')) return null;
  const parts = sessionKey.split(':');
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts[1]}`;
}

export function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const parts = sessionKey.split(':');
  return parts[1] || 'main';
}

export function isNamedAgentMainSession(sessionKey: string): boolean {
  return sessionKey.startsWith('agent:')
    && sessionKey.endsWith(':main')
    && getAgentIdFromSessionKey(sessionKey) !== 'main';
}

export function clearSessionEntryFromMap<T extends Record<string, unknown>>(entries: T, sessionKey: string): T {
  return Object.fromEntries(Object.entries(entries).filter(([key]) => key !== sessionKey)) as T;
}

function isPrimaryChatSessionKey(sessionKey: string): boolean {
  if (!sessionKey.startsWith('agent:')) return true;
  const parts = sessionKey.split(':');
  return !parts.includes('subagent');
}

export function isPrimaryChatSession(session: ChatSession): boolean {
  if (!session.key || !isPrimaryChatSessionKey(session.key)) return false;
  if (session.spawnedBy || session.parentSessionKey || session.parentRunId || session.parentId) return false;
  const kind = String(session.kind || '').toLowerCase();
  return kind !== 'subagent' && kind !== 'child' && kind !== 'spawned';
}

export function parseSessionUpdatedAtMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return toMs(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function readSessionModel(session: ChatSession | undefined): { model: string; provider: string; thinkingLevel: string } {
  return {
    model: String(session?.model || '').trim(),
    provider: String(session?.modelProvider || '').trim(),
    thinkingLevel: String(session?.thinkingLevel || '').trim(),
  };
}

export function formatModelRefForNotice(modelRaw: string, providerRaw: string): string {
  const model = String(modelRaw || '').trim();
  const provider = String(providerRaw || '').trim();
  if (!model) return provider || 'unknown';
  if (model.includes('/')) return model;
  return provider ? `${provider}/${model}` : model;
}
