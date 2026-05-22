/**
 * Chat State Store
 * Manages chat messages, sessions, streaming, and thinking state.
 * Communicates with OpenClaw Gateway via renderer WebSocket RPC.
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from './gateway';
import { useAgentsStore } from './agents';
import { resolveEventTargetSessionKey, type InFlightRunState } from './chat/event-routing';
import {
  finishInFlightRun as finishRegisteredInFlightRun,
  inFlightRunBySession,
  sessionKeyByRunId,
  trackInFlightRun,
} from './chat/run-registry';
import { createHistoryRequestController } from './chat/history-requests';
import { toMs } from './chat/time';
import { loadSessionFavorites, saveSessionFavorites } from './chat/session-favorites';
import { createMessageQueueScheduler } from './chat/message-queue';
import { createSessionLabelBackfillController } from './chat/session-label-backfill';
import { mergeLoadedHistoryWithVisibleMessages, mergeOptimisticDuringSend } from './chat/history-merge';
import {
  extractTextFromContent,
  getMessageText,
  hasNonToolAssistantContent,
  isToolOnlyMessage,
  isToolResultRole,
} from './chat/message-content';
import {
  formatModelRefForNotice,
  clearSessionEntryFromMap,
  getAgentIdFromSessionKey,
  getCanonicalPrefixFromSessionKey,
  getCanonicalPrefixFromSessions,
  isInternalSessionTitle,
  isNamedAgentMainSession,
  isPrimaryChatSession,
  parseSessionUpdatedAtMs,
  readSessionModel,
} from './chat/session-utils';
import {
  filterVisibleHistoryMessages,
  getMessageDedupeKey,
  getMessageTimeMs,
  isHiddenInternalChatMessage,
  isSameChatMessage,
  makeStableMessageId,
  normalizeVisibleMessages,
} from './chat/message-normalizer';
import { createRunMonitorController, type RunMonitorState } from './chat/run-monitor';
import { appendMessageToSessionCache, loadMsgCache, removeMsgCache, saveMsgCache } from './chat/session-message-cache';
import { buildCronSessionHistoryPath, isCronSessionKey } from './chat/cron-session-utils';
import { collectToolUpdates, upsertToolStatuses } from './chat/tool-updates';
import {
  cacheOutgoingAttachments,
  enrichWithCachedImages,
  enrichWithToolResultFiles,
  extractImagesAsAttachedFiles,
  extractMediaRefs,
  extractRawFilePaths,
  getToolCallFilePath,
  hasAssistantMessageAfter,
  loadMissingPreviews,
  makeAttachedFile,
} from './chat/media-attachments';
import type { AttachedFileMeta, ChatSession, ContentBlock, QueuedChatMessage, RawMessage, ToolStatus } from './chat/types';
import { formatDeepSeekReasoningReplayError, isDeepSeekReasoningReplayError } from '@/lib/deepseek-reasoning-error';
import { shouldForceDeepSeekV4ThinkingOff } from '@/lib/deepseek-v4-thinking';

// ── Types ────────────────────────────────────────────────────────

export type { AttachedFileMeta, ChatSession, ContentBlock, QueuedChatMessage, RawMessage, ToolStatus } from './chat/types';
export type { RunMonitorState } from './chat/run-monitor';

interface ChatState {
  // Messages
  messages: RawMessage[];
  loading: boolean;
  error: string | null;

  // Streaming
  sending: boolean;
  activeRunId: string | null;
  streamingText: string;
  streamingMessage: unknown | null;
  streamingTools: ToolStatus[];
  pendingFinal: boolean;
  lastUserMessageAt: number | null;
  /** Images collected from tool results, attached to the next assistant message */
  pendingToolImages: AttachedFileMeta[];
  messageQueue: QueuedChatMessage[];
  activityLabel: string | null;
  runMonitor: RunMonitorState | null;

  // Sessions
  sessions: ChatSession[];
  currentSessionKey: string;
  currentAgentId: string;
  /** First user message text per session key, used as display label */
  sessionLabels: Record<string, string>;
  /** User-starred sessions shown in chat and dashboard */
  favoriteSessionKeys: Record<string, boolean>;
  /** Last message timestamp (ms) per session key, used for sorting */
  sessionLastActivity: Record<string, number>;

  // Thinking
  showThinking: boolean;
  thinkingLevel: string | null;

  // Actions
  loadSessions: () => Promise<void>;
  switchSession: (key: string) => void;
  newSession: () => void;
  deleteSession: (key: string) => Promise<void>;
  cleanupEmptySession: () => void;
  setSessionLabel: (sessionKey: string, label: string) => void;
  toggleSessionFavorite: (sessionKey: string) => void;
  loadHistory: (quiet?: boolean) => Promise<void>;
  /** 加载历史，支持指定日期前或更大 limit */
  loadHistoryWithOptions: (options?: { beforeTs?: number; limit?: number }) => Promise<void>;
  sendMessage: (
    text: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>,
    targetAgentId?: string | null,
    forcedSessionKey?: string | null,
  ) => Promise<void>;
  drainMessageQueue: () => Promise<void>;
  abortRun: () => Promise<void>;
  handleChatEvent: (event: Record<string, unknown>) => void;
  toggleThinking: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

// Module-level timestamp tracking the last chat event received.
// Used by the safety timeout to avoid false-positive "no response" errors
// during tool-use conversations where streamingMessage is temporarily cleared
// between tool-result finals and the next delta.
let _lastChatEventAt = 0;
const _lastChatEventAtBySession = new Map<string, number>();
// Session key that was active when the most recent sendMessage was initiated.
// Kept only as a fallback for legacy Gateway events that do not carry sessionKey.
let _sendingSessionKey: string | null = null;
const _sessionAliasToCanonicalKey = new Map<string, string>();

const _locallyCreatedEmptySessions = new Set<string>();
const _knownEmptySessions = new Set<string>();

const runMonitorController = createRunMonitorController({
  getCurrentSessionKey: () => useChatStore.getState().currentSessionKey,
  setVisibleMonitor: (monitor) => useChatStore.setState({ runMonitor: monitor }),
});

const updateRunMonitor = runMonitorController.update;
const finishRunMonitor = runMonitorController.finish;

const messageQueueScheduler = createMessageQueueScheduler({
  drain: () => useChatStore.getState().drainMessageQueue(),
});

const scheduleQueuedMessageDrain = messageQueueScheduler.schedule;

function markChatEvent(sessionKey: string | null | undefined, at = Date.now()): void {
  _lastChatEventAt = at;
  if (sessionKey) _lastChatEventAtBySession.set(sessionKey, at);
}

function getLastChatEventAt(sessionKey: string): number {
  return _lastChatEventAtBySession.get(sessionKey) ?? _lastChatEventAt;
}

function shouldHideKnownEmptySession(sessionKey: string): boolean {
  return _knownEmptySessions.has(sessionKey) && !_locallyCreatedEmptySessions.has(sessionKey);
}

function rememberSessionHasMessages(sessionKey: string): void {
  _knownEmptySessions.delete(sessionKey);
  _locallyCreatedEmptySessions.delete(sessionKey);
}

function registerSessionAlias(
  alias: unknown,
  canonicalKey: string,
  options: { overwrite?: boolean } = {},
): void {
  const value = String(alias || '').trim();
  if (!value || !canonicalKey) return;
  const existing = _sessionAliasToCanonicalKey.get(value);
  if (existing && existing !== canonicalKey && !options.overwrite) return;
  _sessionAliasToCanonicalKey.set(value, canonicalKey);
}

function canonicalizeSessionKey(sessionKey: unknown): string {
  const value = String(sessionKey || '').trim();
  if (!value) return '';
  return _sessionAliasToCanonicalKey.get(value) || value;
}

function finishInFlightRun(sessionKey: string | null | undefined, runId?: string | null): void {
  finishRegisteredInFlightRun(sessionKey, runId);
  if (_sendingSessionKey && (!inFlightRunBySession.has(_sendingSessionKey))) {
    _sendingSessionKey = null;
  }
  scheduleQueuedMessageDrain();
}

// Timer for fallback history polling during active sends.
// If no streaming events arrive within a few seconds, we periodically
// poll chat.history to surface intermediate tool-call turns.
const _historyPollTimers = new Map<string, ReturnType<typeof setTimeout>>();
const historyRequests = createHistoryRequestController({
  getCurrentSessionKey: () => useChatStore.getState().currentSessionKey,
});

// Timers for delayed error finalization. When the Gateway reports a mid-stream
// error (e.g. "terminated"), it may retry internally and recover. Scope these
// by session so one conversation cannot cancel another conversation's recovery.
const _errorRecoveryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function hasErrorRecoveryTimer(sessionKey: string): boolean {
  return _errorRecoveryTimers.has(sessionKey);
}

function clearErrorRecoveryTimer(sessionKey?: string): void {
  if (sessionKey) {
    const timer = _errorRecoveryTimers.get(sessionKey);
    if (timer) clearTimeout(timer);
    _errorRecoveryTimers.delete(sessionKey);
    return;
  }
  for (const timer of _errorRecoveryTimers.values()) {
    clearTimeout(timer);
  }
  _errorRecoveryTimers.clear();
}

function scheduleErrorRecoveryTimer(sessionKey: string, callback: () => void, delayMs: number): void {
  clearErrorRecoveryTimer(sessionKey);
  _errorRecoveryTimers.set(sessionKey, setTimeout(() => {
    _errorRecoveryTimers.delete(sessionKey);
    callback();
  }, delayMs));
}

function clearHistoryPoll(sessionKey?: string): void {
  if (sessionKey) {
    const timer = _historyPollTimers.get(sessionKey);
    if (timer) clearTimeout(timer);
    _historyPollTimers.delete(sessionKey);
    return;
  }
  for (const timer of _historyPollTimers.values()) {
    clearTimeout(timer);
  }
  _historyPollTimers.clear();
}

function scheduleHistoryPoll(sessionKey: string, callback: () => void, delayMs: number): void {
  clearHistoryPoll(sessionKey);
  _historyPollTimers.set(sessionKey, setTimeout(callback, delayMs));
}

function applySessionPreviewFromMessages(sessionKey: string, messages: RawMessage[]): void {
  const visible = filterVisibleHistoryMessages(messages);
  const firstUser = visible.find((m) => m.role === 'user');
  const lastMsg = visible[visible.length - 1];
  useChatStore.setState((state) => {
    const next: Partial<ChatState> = {};
    if (visible.length === 0) return next;
    if (firstUser) {
      const labelText = getMessageText(firstUser.content).trim();
      if (labelText && !(state.sessionLabels?.[sessionKey] || '').trim()) {
        next.sessionLabels = {
          ...state.sessionLabels,
          [sessionKey]: labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText,
        };
      }
    }
    if (lastMsg?.timestamp) {
      next.sessionLastActivity = { ...state.sessionLastActivity, [sessionKey]: toMs(lastMsg.timestamp) };
    }
    return next;
  });
}

const sessionLabelBackfill = createSessionLabelBackfillController({
  getState: () => useChatStore.getState(),
  isInternalSessionTitle,
  loadCache: loadMsgCache,
  applyPreview: applySessionPreviewFromMessages,
  loadHistory: async (sessionKey, limit) => {
    const response = await useGatewayStore.getState().rpc<Record<string, unknown>>(
      'chat.history',
      { sessionKey, limit },
    );
    return Array.isArray(response.messages) ? response.messages as RawMessage[] : [];
  },
});

const scheduleSessionLabelBackfill = sessionLabelBackfill.schedule;

function hasVisibleCachedMessages(sessionKey: string): boolean {
  return filterVisibleHistoryMessages(loadMsgCache(sessionKey)).length > 0;
}

function tagMessagesForSession(messages: RawMessage[], sessionKey: string): RawMessage[] {
  return messages.map((message) => (
    message._sessionKey === sessionKey ? message : { ...message, _sessionKey: sessionKey }
  ));
}

const DEFAULT_CANONICAL_PREFIX = 'agent:main';
const DEFAULT_SESSION_KEY = `${DEFAULT_CANONICAL_PREFIX}:main`;

function normalizeOpenAiCodexSessionModel(
  modelRaw: string,
  providerRaw: string,
): { model: string; provider: string; changed: boolean } {
  const originalModel = String(modelRaw || '').trim();
  const originalProvider = String(providerRaw || '').trim();
  if (!originalModel) return { model: originalModel, provider: originalProvider, changed: false };

  let model = originalModel.replace(/cdoex/gi, 'codex');
  let provider = originalProvider;
  let leaf = model;
  const slashIndex = model.indexOf('/');
  if (slashIndex > 0) {
    provider = model.slice(0, slashIndex).trim() || provider;
    leaf = model.slice(slashIndex + 1).trim();
  }

  const unsupportedCodexLeaf = /^gpt-5\.2-codex$/i.test(leaf);
  if (unsupportedCodexLeaf) {
    leaf = 'gpt-5.4-mini';
  }
  if (/^gpt-5\.4$/i.test(leaf)) {
    leaf = 'gpt-5.4-mini';
  }

  const shouldUseCodexProvider = provider.toLowerCase() === 'openai' || provider.toLowerCase() === 'openai-codex';
  const isSupportedCodexAuthLeaf = /^gpt-5\.(?:3-codex|4-mini|5)$/i.test(leaf);
  if (!shouldUseCodexProvider || (!unsupportedCodexLeaf && !isSupportedCodexAuthLeaf)) {
    return {
      model,
      provider,
      changed: model !== originalModel || provider !== originalProvider,
    };
  }

  const nextProvider = 'openai-codex';
  const nextModel = `${nextProvider}/${leaf}`;
  return {
    model: nextModel,
    provider: nextProvider,
    changed: nextModel !== originalModel || nextProvider !== originalProvider,
  };
}

async function prepareSessionBeforeSend(sessionKey: string): Promise<void> {
  if (!sessionKey) return;

  const state = useChatStore.getState();
  const localSession = state.sessions.find((session) => session.key === sessionKey);
  let { model, provider, thinkingLevel } = readSessionModel(localSession);
  const originalModel = model;

  const codexNormalized = normalizeOpenAiCodexSessionModel(model, provider);
  if (codexNormalized.changed) {
    model = codexNormalized.model;
    provider = codexNormalized.provider;
    if (/openai-codex\/gpt-5\.2-codex/i.test(originalModel)) {
      appendLocalSystemNotice(sessionKey, '当前 OpenAI Codex 配置不支持 gpt-5.2-codex，已自动切换到 openai-codex/gpt-5.4-mini。');
    }
    await useGatewayStore.getState().rpc(
      'sessions.patch',
      { key: sessionKey, model },
      15_000,
    );
    useChatStore.setState((current) => ({
      sessions: current.sessions.map((session) => (
        session.key === sessionKey ? { ...session, model, modelProvider: provider } : session
      )),
    }));
    try {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('axon:session-model-pref-updated', {
          detail: { sessionKey, model, provider },
        });
        window.dispatchEvent(event);
      }
    } catch {
      // ignore UI preference sync failures
    }
  }

  if (!model || !provider) return;
  if (!shouldForceDeepSeekV4ThinkingOff(model, provider) || thinkingLevel === 'off') {
    return;
  }

  await useGatewayStore.getState().rpc(
    'sessions.patch',
    { key: sessionKey, thinkingLevel: 'off' },
    15_000,
  );

  useChatStore.setState((current) => ({
    thinkingLevel: current.currentSessionKey === sessionKey ? 'off' : current.thinkingLevel,
    sessions: current.sessions.map((session) => (
      session.key === sessionKey ? { ...session, thinkingLevel: 'off' } : session
    )),
  }));
}

function isOpenAiCodexNetworkFailure(errorText: string): boolean {
  const text = String(errorText || '').toLowerCase();
  return text.includes('openai-codex')
    && (
      text.includes('network connection error')
      || text.includes('fetch failed')
      || text.includes('llm request failed')
    );
}

function isOpenAiCodexModelContext(modelRaw: string, providerRaw: string): boolean {
  const model = String(modelRaw || '').trim().toLowerCase();
  const provider = String(providerRaw || '').trim().toLowerCase();
  return provider === 'openai-codex'
    || model.startsWith('openai-codex/')
    || (
      (provider === 'openai' || provider === 'openai-codex')
      && /(?:^|\/)gpt-5\.(?:3-codex|4-mini|5|2-codex)$/i.test(model)
    );
}

function isOpenAiCodexRegionAuthFailure(errorText: string): boolean {
  const text = String(errorText || '').toLowerCase();
  return (
    text.includes('unsupported_country_region_territory')
    || (
      text.includes('token refresh failed')
      && (
        text.includes('unsupported country')
        || text.includes('country_region')
        || text.includes('region')
      )
    )
  );
}

function formatOpenAiCodexRegionAuthFailure(errorText: string): string {
  const raw = String(errorText || '').trim();
  const detail = raw
    .replace(/^error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
  return [
    'OpenAI GPT 登录认证刷新失败，当前账号或网络出口被 OpenAI 判定为不支持的国家/地区。',
    '这类错误来自 OpenAI OAuth 刷新令牌接口，切换同一个 OpenAI Codex 模型不会解决。',
    '请在「模型认证」中重新登录，或切换到可用地区的稳定网络/代理后再使用 OpenAI GPT Auth 模式。',
    detail ? `原始错误：${detail}` : '',
  ].filter(Boolean).join('\n');
}

function formatOpenAiCodexNetworkFailure(errorText: string): string {
  const raw = String(errorText || '').trim();
  const detail = raw
    .replace(/^error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
  return [
    'OpenAI GPT Auth 网络请求失败，当前无法连接 ChatGPT 后端服务。',
    '这不是普通 API Key 缺失问题；GPT 登录模式需要访问 https://chatgpt.com/backend-api，当前链路返回 fetch failed / network connection error。',
    '切换 gpt-5.4-mini、gpt-5.3-codex 或 gpt-5.5 不会解决，因为它们都依赖同一条 OpenAI Codex Auth 网络链路。',
    '请检查代理/VPN 是否对 AxonClawX、OpenClaw 的 Node 进程生效，或临时切换到可用的 API Key 模型。',
    detail ? `原始错误：${detail}` : '',
  ].filter(Boolean).join('\n');
}

function appendLocalSystemNotice(
  sessionKey: string,
  content: string,
): void {
  const notice: RawMessage = {
    role: 'system',
    content,
    timestamp: Date.now() / 1000,
    id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    _sessionKey: sessionKey,
  };
  const cached = loadMsgCache(sessionKey);
  saveMsgCache(sessionKey, normalizeVisibleMessages([...cached, notice]));
  useChatStore.setState((state) => {
    if (state.currentSessionKey !== sessionKey) return state;
    const messages = [...state.messages, notice];
    return { messages };
  });
}

async function loadCronFallbackMessages(sessionKey: string, limit = 200): Promise<RawMessage[]> {
  if (!isCronSessionKey(sessionKey)) return [];
  try {
    const response = await hostApiFetch<{ messages?: RawMessage[] }>(
      buildCronSessionHistoryPath(sessionKey, limit),
    );
    return Array.isArray(response.messages) ? response.messages : [];
  } catch (error) {
    console.warn('Failed to load cron fallback history:', error);
    return [];
  }
}

function normalizeAgentId(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase() || 'main';
}

function buildFallbackMainSessionKey(agentId: string): string {
  return `agent:${normalizeAgentId(agentId)}:main`;
}

function resolveMainSessionKeyForAgent(agentId: string | undefined | null): string | null {
  if (!agentId) return null;
  const normalizedAgentId = normalizeAgentId(agentId);
  const summary = useAgentsStore.getState().agents.find((agent) => agent.id === normalizedAgentId);
  return summary?.mainSessionKey || buildFallbackMainSessionKey(normalizedAgentId);
}

function ensureSessionEntry(sessions: ChatSession[], sessionKey: string): ChatSession[] {
  const canonicalKey = canonicalizeSessionKey(sessionKey);
  if (sessions.some((session) => session.key === canonicalKey)) {
    return sessions;
  }
  return [...sessions, { key: canonicalKey, displayName: canonicalKey }];
}

function buildSessionSwitchPatch(
  state: Pick<
    ChatState,
    'currentSessionKey' | 'messages' | 'sessions' | 'sessionLabels' | 'favoriteSessionKeys' | 'sessionLastActivity'
  >,
  nextSessionKey: string,
): Partial<ChatState> {
  const leavingEmpty = !state.currentSessionKey.endsWith(':main') && state.messages.length === 0;
  const nextSessions = leavingEmpty
    ? state.sessions.filter((session) => session.key !== state.currentSessionKey)
    : state.sessions;
  const nextFavoriteSessionKeys = leavingEmpty
    ? clearSessionEntryFromMap(state.favoriteSessionKeys, state.currentSessionKey)
    : state.favoriteSessionKeys;
  if (leavingEmpty && state.favoriteSessionKeys[state.currentSessionKey]) {
    saveSessionFavorites(nextFavoriteSessionKeys);
  }

  const nextInFlight = inFlightRunBySession.get(nextSessionKey);
  const nextMonitor = runMonitorController.get(nextSessionKey);
  return {
    currentSessionKey: nextSessionKey,
    currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
    sessions: ensureSessionEntry(nextSessions, nextSessionKey),
    sessionLabels: leavingEmpty
      ? clearSessionEntryFromMap(state.sessionLabels, state.currentSessionKey)
      : state.sessionLabels,
    favoriteSessionKeys: nextFavoriteSessionKeys,
    sessionLastActivity: leavingEmpty
      ? clearSessionEntryFromMap(state.sessionLastActivity, state.currentSessionKey)
      : state.sessionLastActivity,
    messages: [],
    streamingText: '',
    streamingMessage: null,
    streamingTools: [],
    sending: !!nextInFlight,
    activeRunId: nextInFlight?.runId ?? null,
    error: null,
    pendingFinal: false,
    lastUserMessageAt: nextInFlight?.lastUserMessageAt ?? null,
    pendingToolImages: [],
    runMonitor: nextMonitor,
    activityLabel: nextInFlight ? (nextMonitor?.lastEventLabel || 'activityStarted') : null,
  };
}

/** True if the in-flight assistant stream has anything worth persisting locally. */
function streamingAssistantHasVisiblePayload(stream: RawMessage): boolean {
  const text = extractTextFromContent(stream.content).trim();
  if (text.length > 0) return true;
  const c = stream.content;
  if (Array.isArray(c)) {
    for (const b of c as ContentBlock[]) {
      if (b.type === 'thinking' && b.thinking?.trim()) return true;
      if ((b.type === 'tool_use' || b.type === 'toolCall') && b.name) return true;
    }
  }
  const rec = stream as Record<string, unknown>;
  const toolCalls = rec.tool_calls ?? rec.toolCalls;
  return Array.isArray(toolCalls) && toolCalls.length > 0;
}

/**
 * Snapshot partial streaming assistant output into messages[] before clearing
 * stream state (abort, stale poll, etc.) so the user does not lose text.
 */
function flushPartialStreamingToMessages(
  get: () => ChatState,
  set: (partial: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void,
): void {
  const { streamingMessage, currentSessionKey } = get();
  if (!streamingMessage || typeof streamingMessage !== 'object') return;
  const stream = streamingMessage as RawMessage;
  if (isToolResultRole(stream.role)) return;
  if (stream.role != null && stream.role !== 'assistant') return;
  if (!streamingAssistantHasVisiblePayload(stream)) return;
  const snapId = `local-partial-${Date.now()}`;
  const snapshot: RawMessage = {
    ...stream,
    role: 'assistant',
    id: snapId,
    timestamp: stream.timestamp ?? Math.floor(Date.now() / 1000),
    _sessionKey: currentSessionKey,
  };
  set((s) => ({ messages: normalizeVisibleMessages([...s.messages, snapshot]) }));
  saveMsgCache(currentSessionKey, tagMessagesForSession(get().messages, currentSessionKey));
}

/** Re-attach assistant rows saved locally after abort/stop; Gateway often has no row for them yet. */
function appendPreservedLocalPartials(
  incoming: RawMessage[],
  previous: RawMessage[],
  options: { afterMs?: number | null; allow?: boolean } = {},
): RawMessage[] {
  if (!options.allow) return normalizeVisibleMessages(incoming);
  const incomingIds = new Set(
    incoming.map((m) => m.id).filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const incomingAssistants = incoming.filter((m) => m.role === 'assistant');
  const lastIncomingText = incomingAssistants.length
    ? getMessageText(incomingAssistants[incomingAssistants.length - 1].content).trim()
    : '';
  const extra = previous.filter((m) => {
    if (m.role !== 'assistant' || typeof m.id !== 'string' || !m.id.startsWith('local-partial-')) return false;
    if (incomingIds.has(m.id)) return false;
    if (options.afterMs != null) {
      const msgMs = getMessageTimeMs(m);
      if (!msgMs || msgMs < options.afterMs - 1_000) return false;
    }
    const ptext = getMessageText(m.content).trim();
    if (lastIncomingText && ptext) {
      const prefix = ptext.slice(0, Math.min(ptext.length, 160));
      if (prefix.length > 0 && lastIncomingText.includes(prefix)) return false;
    }
    return true;
  });
  return normalizeVisibleMessages(extra.length > 0 ? [...incoming, ...extra] : incoming);
}

async function refreshSessionHistoryCache(sessionKey: string, limit = 200): Promise<void> {
  if (!sessionKey) return;
  try {
    const data = await useGatewayStore.getState().rpc<Record<string, unknown>>(
      'chat.history',
      { sessionKey, limit },
    );
    registerSessionAlias(data?.sessionId, sessionKey, { overwrite: true });
    let rawMessages = Array.isArray(data?.messages) ? data.messages as RawMessage[] : [];
    if (rawMessages.length === 0 && isCronSessionKey(sessionKey)) {
      rawMessages = await loadCronFallbackMessages(sessionKey, limit);
    }
    if (rawMessages.length === 0) return;

    const messagesWithToolImages = enrichWithToolResultFiles(rawMessages);
    const filteredMessages = filterVisibleHistoryMessages(messagesWithToolImages);
    const enrichedMessages = enrichWithCachedImages(filteredMessages);
    const cached = loadMsgCache(sessionKey);
    const inFlight = inFlightRunBySession.get(sessionKey);
    let finalMessages = appendPreservedLocalPartials(enrichedMessages, cached, {
      allow: Boolean(inFlight),
      afterMs: inFlight?.lastUserMessageAt ?? null,
    });
    finalMessages = mergeLoadedHistoryWithVisibleMessages(finalMessages, cached, sessionKey);
    const currentState = useChatStore.getState();
    if (currentState.currentSessionKey === sessionKey && currentState.messages.length > 0) {
      finalMessages = mergeLoadedHistoryWithVisibleMessages(finalMessages, currentState.messages, sessionKey);
    }
    finalMessages = tagMessagesForSession(finalMessages, sessionKey);
    saveMsgCache(sessionKey, finalMessages);

    const lastMsg = finalMessages[finalMessages.length - 1];
    const lastAt = lastMsg?.timestamp ? toMs(lastMsg.timestamp) : Date.now();
    useChatStore.setState((s) => {
      const patch: Partial<ChatState> = {
        sessionLastActivity: { ...s.sessionLastActivity, [sessionKey]: lastAt },
      };

      if (!isNamedAgentMainSession(sessionKey) && !s.sessionLabels[sessionKey]) {
        const firstUserMsg = finalMessages.find((m) => m.role === 'user');
        const labelText = firstUserMsg ? getMessageText(firstUserMsg.content).trim() : '';
        if (labelText) {
          patch.sessionLabels = {
            ...s.sessionLabels,
            [sessionKey]: labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText,
          };
        }
      }

      if (s.currentSessionKey === sessionKey) {
        patch.messages = normalizeVisibleMessages(finalMessages);
        patch.loading = false;
      }

      return patch;
    });
  } catch (error) {
    console.warn(`[chat] Failed to refresh background session history (${sessionKey}):`, error);
  }
}

function handleBackgroundChatEvent(
  sessionKey: string,
  runId: string,
  resolvedState: string,
  event: Record<string, unknown>,
): void {
  if (!sessionKey) return;
  if (runId) trackInFlightRun(sessionKey, runId);
  updateRunMonitor(sessionKey, {
    runId: runId || null,
    status: resolvedState === 'error'
      ? 'failed'
      : resolvedState === 'aborted'
        ? 'aborted'
        : 'running',
    lastEventLabel: resolvedState === 'delta'
      ? 'activityGenerating'
      : resolvedState === 'final'
        ? 'activityFinalizing'
        : resolvedState === 'error'
          ? 'activityRecovering'
          : resolvedState === 'aborted'
            ? 'activityAborted'
            : 'activityStarted',
    touch: true,
  });

  switch (resolvedState) {
    case 'started': {
      trackInFlightRun(sessionKey, runId || null);
      break;
    }
    case 'final': {
      const finalMsg = event.message as RawMessage | undefined;
      if (finalMsg && isHiddenInternalChatMessage(finalMsg)) {
        void refreshSessionHistoryCache(sessionKey);
        break;
      }
      if (finalMsg && !isToolResultRole(finalMsg.role)) {
        const hasOutput = hasNonToolAssistantContent(finalMsg);
        const msgId = finalMsg.id || makeStableMessageId(runId ? `run-${runId}` : 'bg', finalMsg);
        const normalized: RawMessage = {
          ...finalMsg,
          role: (finalMsg.role || 'assistant') as RawMessage['role'],
          id: msgId,
          timestamp: finalMsg.timestamp ?? Math.floor(Date.now() / 1000),
          _sessionKey: sessionKey,
        };
        appendMessageToSessionCache(sessionKey, normalized);
        useChatStore.setState((s) => ({
          sessionLastActivity: {
            ...s.sessionLastActivity,
            [sessionKey]: toMs(normalized.timestamp || Math.floor(Date.now() / 1000)),
          },
        }));
        if (hasOutput) {
          finishRunMonitor(sessionKey, 'completed');
          finishInFlightRun(sessionKey, runId);
        }
      } else if (!finalMsg) {
        finishRunMonitor(sessionKey, 'completed');
        finishInFlightRun(sessionKey, runId);
      }
      void refreshSessionHistoryCache(sessionKey);
      break;
    }
    case 'error':
    case 'aborted': {
      finishRunMonitor(sessionKey, resolvedState === 'aborted' ? 'aborted' : 'failed');
      finishInFlightRun(sessionKey, runId);
      void refreshSessionHistoryCache(sessionKey);
      break;
    }
    default:
      break;
  }
}

function isMessageOlderThanInFlightUser(message: unknown, inFlight: InFlightRunState | undefined): boolean {
  if (!inFlight?.lastUserMessageAt || !message || typeof message !== 'object') return false;
  const timestamp = (message as RawMessage).timestamp;
  if (!timestamp) return false;
  return toMs(timestamp) < inFlight.lastUserMessageAt - 500;
}

// ── Store ────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  sending: false,
  activeRunId: null,
  streamingText: '',
  streamingMessage: null,
  streamingTools: [],
  pendingFinal: false,
  lastUserMessageAt: null,
  pendingToolImages: [],
  messageQueue: [],
  activityLabel: null,
  runMonitor: null,

  sessions: [],
  currentSessionKey: DEFAULT_SESSION_KEY,
  currentAgentId: 'main',
  sessionLabels: {},
  favoriteSessionKeys: loadSessionFavorites(),
  sessionLastActivity: {},

  showThinking: true,
  thinkingLevel: null,

  // ── Load sessions via sessions.list ──

  loadSessions: async () => {
    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>('sessions.list', {});
      if (data) {
        const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
        const sessions: ChatSession[] = rawSessions.map((s: Record<string, unknown>) => ({
          key: String(s.key || ''),
          sessionId: s.sessionId ? String(s.sessionId) : undefined,
          label: s.label ? String(s.label) : undefined,
          displayName: s.displayName ? String(s.displayName) : undefined,
          kind: s.kind ? String(s.kind) : undefined,
          spawnedBy: s.spawnedBy ? String(s.spawnedBy) : undefined,
          parentSessionKey: s.parentSessionKey ? String(s.parentSessionKey) : undefined,
          parentRunId: s.parentRunId ? String(s.parentRunId) : undefined,
          parentId: s.parentId ? String(s.parentId) : undefined,
          thinkingLevel: s.thinkingLevel ? String(s.thinkingLevel) : undefined,
          model: s.model ? String(s.model) : undefined,
          modelProvider: s.modelProvider ? String(s.modelProvider) : undefined,
          updatedAt: parseSessionUpdatedAtMs(s.updatedAt),
        }))
          .filter((s: ChatSession) => isPrimaryChatSession(s))
          .filter((s: ChatSession) => !shouldHideKnownEmptySession(s.key));

        _sessionAliasToCanonicalKey.clear();
        const canonicalBySuffix = new Map<string, string>();
        for (const session of sessions) {
          registerSessionAlias(session.key, session.key, { overwrite: true });
        }
        for (const session of sessions) {
          registerSessionAlias(session.sessionId, session.key, { overwrite: true });
        }
        for (const session of sessions) {
          if (!session.key.startsWith('agent:')) continue;
          const parts = session.key.split(':');
          if (parts.length < 3) continue;
          const suffix = parts.slice(2).join(':');
          if (suffix && !canonicalBySuffix.has(suffix)) {
            canonicalBySuffix.set(suffix, session.key);
            registerSessionAlias(suffix, session.key);
          }
        }

        // Deduplicate: if both short and canonical existed, keep canonical only
        const seen = new Set<string>();
        const dedupedSessionsRaw = sessions.filter((s) => {
          const canonicalForShortKey = !s.key.startsWith('agent:') ? canonicalizeSessionKey(s.key) : s.key;
          if (!s.key.startsWith('agent:') && canonicalForShortKey !== s.key) return false;
          if (seen.has(s.key)) return false;
          seen.add(s.key);
          return true;
        });

        const { currentSessionKey, sessions: localSessions, favoriteSessionKeys } = get();
        const dedupedSessions = dedupedSessionsRaw.filter((session) => {
          const title = session.displayName || session.label;
          if (!isInternalSessionTitle(title)) return true;
          if (favoriteSessionKeys[session.key]) return true;
          return false;
        });

        let nextSessionKey = currentSessionKey || DEFAULT_SESSION_KEY;
        if (!nextSessionKey.startsWith('agent:')) {
          const canonicalMatch = canonicalizeSessionKey(nextSessionKey) || canonicalBySuffix.get(nextSessionKey);
          if (canonicalMatch) {
            nextSessionKey = canonicalMatch;
          }
        }
        if (!dedupedSessions.find((s) => s.key === nextSessionKey) && dedupedSessions.length > 0) {
          // Preserve only locally-created pending sessions. On initial boot the
          // default ghost key (`agent:main:main`) should yield to real history.
          const localPendingSession = localSessions.find((session) => session.key === nextSessionKey);
          const localPendingTitle = localPendingSession?.displayName || localPendingSession?.label;
          const shouldPreserveLocalPending = Boolean(localPendingSession)
            && !isInternalSessionTitle(localPendingTitle)
            && (
              _locallyCreatedEmptySessions.has(nextSessionKey)
              || inFlightRunBySession.has(nextSessionKey)
              || hasVisibleCachedMessages(nextSessionKey)
              || Boolean(get().sessionLabels[nextSessionKey])
              || Boolean(get().favoriteSessionKeys[nextSessionKey])
            );
          if (!shouldPreserveLocalPending) {
            nextSessionKey = dedupedSessions[0].key;
          }
        }

        const localKeepSessions = localSessions.filter((session) => {
          if (!session.key || dedupedSessions.some((item) => item.key === session.key)) return false;
          if (shouldHideKnownEmptySession(session.key)) return false;
          if (inFlightRunBySession.has(session.key)) return true;
          if (isInternalSessionTitle(session.displayName || session.label) && !favoriteSessionKeys[session.key]) {
            return false;
          }
          if (!_locallyCreatedEmptySessions.has(session.key) && loadMsgCache(session.key).length === 0) {
            const state = get();
            if (!state.sessionLabels[session.key] && !state.favoriteSessionKeys[session.key]) return false;
          }
          return true;
        });

        const mergedSessions = [...dedupedSessions, ...localKeepSessions];

        const sessionsWithCurrent = !mergedSessions.find((s) => s.key === nextSessionKey) && nextSessionKey
          ? [
            ...mergedSessions,
            { key: nextSessionKey, displayName: nextSessionKey },
          ]
          : mergedSessions;

        const discoveredActivity = Object.fromEntries(
          sessionsWithCurrent
            .filter((session) => typeof session.updatedAt === 'number' && Number.isFinite(session.updatedAt))
            .map((session) => [session.key, session.updatedAt!]),
        );

        set((state) => {
          const remappedLabels: Record<string, string> = { ...state.sessionLabels };
          for (const [k, v] of Object.entries(state.sessionLabels || {})) {
            if (!k.startsWith('agent:')) {
              const canonical = canonicalizeSessionKey(k) || canonicalBySuffix.get(k);
              if (canonical && !remappedLabels[canonical]) {
                remappedLabels[canonical] = v;
              }
            }
          }
          const remappedFavorites: Record<string, boolean> = { ...state.favoriteSessionKeys };
          for (const [k, v] of Object.entries(state.favoriteSessionKeys || {})) {
            if (!v || k.startsWith('agent:')) continue;
            const canonical = canonicalizeSessionKey(k) || canonicalBySuffix.get(k);
            if (canonical) {
              remappedFavorites[canonical] = true;
              delete remappedFavorites[k];
            }
          }
          saveSessionFavorites(remappedFavorites);

          return {
            sessions: sessionsWithCurrent,
            currentSessionKey: nextSessionKey,
            currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
            sessionLabels: remappedLabels,
            favoriteSessionKeys: remappedFavorites,
            sessionLastActivity: {
              ...state.sessionLastActivity,
              ...discoveredActivity,
            },
          };
        });

        if (currentSessionKey !== nextSessionKey) {
          get().loadHistory();
        }

        // Backfill missing session titles off the critical path. Older code
        // fetched chat.history(limit=1000) for every session at once, which
        // made opening the chat page slow and overloaded the Gateway on users
        // with many sessions.
        scheduleSessionLabelBackfill(sessionsWithCurrent);
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err);
    }
  },

  // ── Switch session ──

  switchSession: (key: string) => {
    const targetKey = canonicalizeSessionKey(key);
    if (targetKey === get().currentSessionKey) return;
    flushPartialStreamingToMessages(get, set);
    saveMsgCache(get().currentSessionKey, tagMessagesForSession(get().messages, get().currentSessionKey));
    // Cache-first: pre-populate with localStorage snapshot so the user sees
    // content instantly while the Gateway RPC runs in the background.
    const cached = tagMessagesForSession(loadMsgCache(targetKey), targetKey);
    set((s) => ({
      ...buildSessionSwitchPatch(s, targetKey),
      // Override the empty messages from the patch with cached content.
      // If cache is empty the patch's `messages: []` stays (shows spinner).
      ...(cached.length > 0 ? { messages: cached, loading: false } : {}),
    }));
    // quiet=true when we already have cached content → silent background refresh
    get().loadHistory(cached.length > 0);
    scheduleQueuedMessageDrain();
  },

  // ── Delete session ──
  //
  // NOTE: The OpenClaw Gateway does NOT expose a sessions.delete (or equivalent)
  // RPC — confirmed by inspecting client.ts, protocol.ts and the full codebase.
  // Deletion is therefore a local-only UI operation: the session is removed from
  // the sidebar list and its labels/activity maps are cleared.  The underlying
  // JSONL history file on disk is intentionally left intact, consistent with the
  // newSession() design that avoids sessions.reset to preserve history.

  deleteSession: async (key: string) => {
    const targetKey = canonicalizeSessionKey(key);
    // Soft-delete the session's JSONL transcript on disk.
    // The main process renames <suffix>.jsonl → <suffix>.deleted.jsonl so that
    // sessions.list skips it automatically.
    try {
      const result = await hostApiFetch<{
        success: boolean;
        error?: string;
      }>('/api/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ sessionKey: targetKey }),
      });
      if (!result.success) {
        console.warn(`[deleteSession] IPC reported failure for ${targetKey}:`, result.error);
      }
    } catch (err) {
      console.warn(`[deleteSession] IPC call failed for ${targetKey}:`, err);
    }

    const { currentSessionKey, sessions } = get();
    const remaining = sessions.filter((s) => s.key !== targetKey);
    removeMsgCache(targetKey);
    _knownEmptySessions.add(targetKey);
    _locallyCreatedEmptySessions.delete(targetKey);

    if (currentSessionKey === targetKey) {
      // Switched away from deleted session — pick the first remaining or create new
      const next = remaining[0];
      set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== targetKey)),
        favoriteSessionKeys: Object.fromEntries(Object.entries(s.favoriteSessionKeys).filter(([k]) => k !== targetKey)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== targetKey)),
        messages: [],
        streamingText: '',
        streamingMessage: null,
        streamingTools: [],
        activeRunId: null,
        error: null,
        pendingFinal: false,
        lastUserMessageAt: null,
        pendingToolImages: [],
        currentSessionKey: next?.key ?? DEFAULT_SESSION_KEY,
        currentAgentId: getAgentIdFromSessionKey(next?.key ?? DEFAULT_SESSION_KEY),
      }));
      if (next) {
        get().loadHistory();
      }
    } else {
      set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== targetKey)),
        favoriteSessionKeys: Object.fromEntries(Object.entries(s.favoriteSessionKeys).filter(([k]) => k !== targetKey)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== targetKey)),
      }));
    }
    saveSessionFavorites(Object.fromEntries(Object.entries(get().favoriteSessionKeys).filter(([k]) => k !== targetKey)));
  },

  // ── New session ──

  newSession: () => {
    // Generate a new unique session key and switch to it.
    // NOTE: We intentionally do NOT call sessions.reset on the old session.
    // sessions.reset archives (renames) the session JSONL file, making old
    // conversation history inaccessible when the user switches back to it.
    const { currentSessionKey, messages, sessions } = get();
    const leavingEmpty = !currentSessionKey.endsWith(':main') && messages.length === 0;
    const prefix = getCanonicalPrefixFromSessionKey(currentSessionKey)
      ?? getCanonicalPrefixFromSessions(sessions)
      ?? DEFAULT_CANONICAL_PREFIX;
    const newKey = `${prefix}:session-${Date.now()}`;
    _locallyCreatedEmptySessions.add(newKey);
    _knownEmptySessions.delete(newKey);
    const newSessionEntry: ChatSession = { key: newKey, displayName: newKey };
    if (leavingEmpty && get().favoriteSessionKeys[currentSessionKey]) {
      saveSessionFavorites(clearSessionEntryFromMap(get().favoriteSessionKeys, currentSessionKey));
    }
    set((s) => ({
      currentSessionKey: newKey,
      currentAgentId: getAgentIdFromSessionKey(newKey),
      sessions: [
        ...(leavingEmpty ? s.sessions.filter((sess) => sess.key !== currentSessionKey) : s.sessions),
        newSessionEntry,
      ],
      sessionLabels: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey))
        : s.sessionLabels,
      favoriteSessionKeys: leavingEmpty
        ? Object.fromEntries(Object.entries(s.favoriteSessionKeys).filter(([k]) => k !== currentSessionKey))
        : s.favoriteSessionKeys,
      sessionLastActivity: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey))
        : s.sessionLastActivity,
      messages: [],
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      activeRunId: null,
      error: null,
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
    }));
  },

  // ── Cleanup empty session on navigate away ──

  cleanupEmptySession: () => {
    const { currentSessionKey, messages } = get();
    // Only remove non-main sessions that were never used (no messages sent).
    // This mirrors the "leavingEmpty" logic in switchSession so that creating
    // a new session and immediately navigating away doesn't leave a ghost entry
    // in the sidebar.
    const isEmptyNonMain = _locallyCreatedEmptySessions.has(currentSessionKey)
      && !currentSessionKey.endsWith(':main')
      && messages.length === 0;
    if (!isEmptyNonMain) return;
    if (get().favoriteSessionKeys[currentSessionKey]) {
      saveSessionFavorites(clearSessionEntryFromMap(get().favoriteSessionKeys, currentSessionKey));
    }
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.key !== currentSessionKey),
      sessionLabels: Object.fromEntries(
        Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey),
      ),
      favoriteSessionKeys: Object.fromEntries(
        Object.entries(s.favoriteSessionKeys).filter(([k]) => k !== currentSessionKey),
      ),
      sessionLastActivity: Object.fromEntries(
        Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey),
      ),
    }));
    _locallyCreatedEmptySessions.delete(currentSessionKey);
  },

  // ── Load chat history ──

  loadHistory: async (quiet = false) => {
    const { currentSessionKey } = get();
    const requestSessionKey = currentSessionKey;
    const existingHistoryRequest = historyRequests.getInFlight(requestSessionKey);
    if (existingHistoryRequest) {
      if (!quiet) {
        const preCache = loadMsgCache(requestSessionKey);
        if (preCache.length > 0) {
          set({ messages: preCache, loading: false, error: null });
        }
      }
      await existingHistoryRequest.catch(() => undefined);
      return;
    }
    const requestId = historyRequests.begin(requestSessionKey);
    let finishHistoryRequest: () => void = () => {};
    const historyRequestPromise = new Promise<void>((resolve) => {
      finishHistoryRequest = resolve;
    });
    historyRequests.setInFlight(requestSessionKey, historyRequestPromise);
    if (!quiet) {
      // Show cached content immediately (stale-while-revalidate): eliminates
      // the blank-screen period while the Gateway RPC is in flight.
      const preCache = loadMsgCache(requestSessionKey);
      if (preCache.length > 0) {
        set({ messages: preCache, loading: false, error: null });
      } else {
        set({ loading: true, error: null });
      }
    }

    const applyLoadedMessages = (rawMessages: RawMessage[], thinkingLevel: string | null) => {
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      // Before filtering: attach images/files from tool_result messages to the next assistant message
      const messagesWithToolImages = enrichWithToolResultFiles(rawMessages);
      const filteredMessages = filterVisibleHistoryMessages(messagesWithToolImages);
      // Restore file attachments for user/assistant messages (from cache + text patterns)
      const enrichedMessages = enrichWithCachedImages(filteredMessages);

      // Preserve the optimistic user message during an active send.
      // The Gateway may not include the user's message in chat.history
      // until the run completes, causing it to flash out of the UI.
      let finalMessages = enrichedMessages;
      const stateBeforeMerge = get();
      const userMsgAt = stateBeforeMerge.lastUserMessageAt;
      if (stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.sending && userMsgAt) {
        finalMessages = mergeOptimisticDuringSend(enrichedMessages, stateBeforeMerge.messages, userMsgAt, requestSessionKey);
      } else if (stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.messages.length > 0) {
        finalMessages = mergeLoadedHistoryWithVisibleMessages(enrichedMessages, stateBeforeMerge.messages, requestSessionKey);
      } else if (finalMessages.length === 0) {
        const previous = stateBeforeMerge.currentSessionKey === requestSessionKey ? stateBeforeMerge.messages : [];
        const cached = loadMsgCache(requestSessionKey);
        finalMessages = previous.length > 0 ? previous : cached;
      }

      const preservedSource = stateBeforeMerge.currentSessionKey === requestSessionKey
        ? stateBeforeMerge.messages
        : loadMsgCache(requestSessionKey);
      finalMessages = appendPreservedLocalPartials(finalMessages, preservedSource, {
        allow: Boolean(stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.sending && userMsgAt),
        afterMs: userMsgAt,
      });

      finalMessages = normalizeVisibleMessages(finalMessages);
      finalMessages = tagMessagesForSession(finalMessages, requestSessionKey);
      if (finalMessages.length > 0) {
        rememberSessionHasMessages(requestSessionKey);
      }
      const isVisibleRequestSession = get().currentSessionKey === requestSessionKey;
      if (isVisibleRequestSession) {
        set({ messages: finalMessages, thinkingLevel, loading: false });
      }
      saveMsgCache(requestSessionKey, finalMessages);

      // Extract first user message text as a session label for display in the toolbar.
      // Skip main sessions (key ends with ":main") — they rely on the Gateway-provided
      // displayName (e.g. the configured agent name "ClawX") instead.
      if (!isNamedAgentMainSession(requestSessionKey)) {
        const firstUserMsg = finalMessages.find((m) => m.role === 'user');
        if (firstUserMsg) {
          const labelText = getMessageText(firstUserMsg.content).trim();
          if (labelText) {
            const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
            set((s) => {
              const existing = (s.sessionLabels?.[requestSessionKey] || '').trim();
              if (existing) return {};
              return {
                sessionLabels: { ...s.sessionLabels, [requestSessionKey]: truncated },
              };
            });
          }
        }
      }

      // Record last activity time from the last message in history
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.timestamp) {
        const lastAt = toMs(lastMsg.timestamp);
        set((s) => ({
          sessionLastActivity: { ...s.sessionLastActivity, [requestSessionKey]: lastAt },
        }));
      }

      // Async: load missing image previews from disk (updates in background)
      loadMissingPreviews(finalMessages).then((updated) => {
        if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
        if (get().currentSessionKey !== requestSessionKey) return;
        if (updated) {
          set((s) => {
            if (s.currentSessionKey !== requestSessionKey) return {};
            const merged = mergeLoadedHistoryWithVisibleMessages(finalMessages, s.messages, requestSessionKey);
            return {
              messages: merged.map(msg =>
                msg._attachedFiles
                  ? { ...msg, _attachedFiles: msg._attachedFiles.map(f => ({ ...f })) }
                  : msg
              ),
            };
          });
        }
      });
      if (!isVisibleRequestSession) return;

      const { pendingFinal, lastUserMessageAt, sending: isSendingNow } = get();

      // If we're sending but haven't received streaming events, check
      // whether the loaded history reveals intermediate tool-call activity.
      // This surfaces progress via the pendingFinal → ActivityIndicator path.
      const userMsTs = lastUserMessageAt ? toMs(lastUserMessageAt) : 0;
      const isAfterUserMsg = (msg: RawMessage): boolean => {
        if (!userMsTs) return true;
        if (!msg.timestamp) return false;
        return toMs(msg.timestamp) >= userMsTs - 500;
      };

      if (isSendingNow && !pendingFinal) {
        const hasRecentAssistantActivity = [...filteredMessages].reverse().some((msg) => {
          if (msg.role !== 'assistant') return false;
          return isAfterUserMsg(msg);
        });
        if (hasRecentAssistantActivity) {
          set({ pendingFinal: true });
        }
      }

      // If pendingFinal, check whether the AI produced a final text response.
      if (pendingFinal || get().pendingFinal) {
        const recentAssistant = [...filteredMessages].reverse().find((msg) => {
          if (msg.role !== 'assistant') return false;
          if (!hasNonToolAssistantContent(msg)) return false;
          return isAfterUserMsg(msg);
        });
        if (recentAssistant) {
          clearHistoryPoll(requestSessionKey);
          _sendingSessionKey = null;
          set({ sending: false, activeRunId: null, pendingFinal: false, activityLabel: null });
        }
      }
    };

    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>(
        'chat.history',
        { sessionKey: requestSessionKey, limit: 200 },
      );
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      if (data) {
        registerSessionAlias(data.sessionId, requestSessionKey, { overwrite: true });
        let rawMessages = Array.isArray(data.messages) ? data.messages as RawMessage[] : [];
        const thinkingLevel = data.thinkingLevel ? String(data.thinkingLevel) : null;
        if (rawMessages.length === 0 && isCronSessionKey(requestSessionKey)) {
          rawMessages = await loadCronFallbackMessages(requestSessionKey, 200);
        }
        if (rawMessages.length === 0) {
          const cached = loadMsgCache(requestSessionKey);
          const current = get().currentSessionKey === requestSessionKey ? get().messages : [];
          const fallback = current.length > 0 ? current : cached;
          if (fallback.length > 0) {
            rememberSessionHasMessages(requestSessionKey);
            if (get().currentSessionKey === requestSessionKey) {
              set({ messages: fallback, thinkingLevel, loading: false });
            }
            return;
          }
        }

        applyLoadedMessages(rawMessages, thinkingLevel);
      } else {
        const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, 200);
        if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
        if (fallbackMessages.length > 0) {
          applyLoadedMessages(fallbackMessages, null);
        } else {
          // Gateway returned nothing — restore from localStorage cache rather
          // than wiping the message list (protects against transient disconnect).
          const state = get();
          if (state.sending && state.currentSessionKey === requestSessionKey) {
            set({ loading: false });
          } else {
            const cached = loadMsgCache(requestSessionKey);
            if (state.currentSessionKey === requestSessionKey) {
              const fallback = state.messages.length > 0 ? state.messages : cached;
              set({ messages: fallback, loading: false });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
      const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, 200);
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      if (fallbackMessages.length > 0) {
        applyLoadedMessages(fallbackMessages, null);
      } else {
        const state = get();
        if (state.sending && state.currentSessionKey === requestSessionKey) {
          set({ loading: false });
        } else {
          const cached = loadMsgCache(requestSessionKey);
          if (state.currentSessionKey === requestSessionKey) {
            const fallback = state.messages.length > 0 ? state.messages : cached;
            set({ messages: fallback, loading: false });
          }
        }
      }
    } finally {
      historyRequests.clearInFlight(requestSessionKey, historyRequestPromise);
      finishHistoryRequest();
    }
  },

  loadHistoryWithOptions: async (options?: { beforeTs?: number; limit?: number }) => {
    const { currentSessionKey } = get();
    const requestSessionKey = currentSessionKey;
    const requestId = historyRequests.begin(requestSessionKey);
    set({ loading: true, error: null });

    const limit = options?.limit ?? 500;
    const beforeTs = options?.beforeTs;

    const params: Record<string, unknown> = { sessionKey: requestSessionKey, limit };
    if (beforeTs != null) params.beforeTs = beforeTs;

    const applyLoadedMessages = (rawMessages: RawMessage[], thinkingLevel: string | null) => {
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      let toApply = rawMessages;
      if (beforeTs != null) {
        toApply = rawMessages.filter((m) => !m.timestamp || toMs(m.timestamp) <= beforeTs);
      }
      const messagesWithToolImages = enrichWithToolResultFiles(toApply);
      const filteredMessages = filterVisibleHistoryMessages(messagesWithToolImages);
      const enrichedMessages = enrichWithCachedImages(filteredMessages);

      let finalMessages = enrichedMessages;
      const stateBeforeMerge = get();
      const userMsgAt = stateBeforeMerge.lastUserMessageAt;
      if (stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.sending && userMsgAt) {
        finalMessages = mergeOptimisticDuringSend(enrichedMessages, stateBeforeMerge.messages, userMsgAt, requestSessionKey);
      } else if (stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.messages.length > 0) {
        finalMessages = mergeLoadedHistoryWithVisibleMessages(enrichedMessages, stateBeforeMerge.messages, requestSessionKey);
      } else if (finalMessages.length === 0) {
        const previous = stateBeforeMerge.currentSessionKey === requestSessionKey ? stateBeforeMerge.messages : [];
        const cached = loadMsgCache(requestSessionKey);
        finalMessages = previous.length > 0 ? previous : cached;
      }

      const preservedSource = stateBeforeMerge.currentSessionKey === requestSessionKey
        ? stateBeforeMerge.messages
        : loadMsgCache(requestSessionKey);
      finalMessages = appendPreservedLocalPartials(finalMessages, preservedSource, {
        allow: Boolean(stateBeforeMerge.currentSessionKey === requestSessionKey && stateBeforeMerge.sending && userMsgAt),
        afterMs: userMsgAt,
      });

      finalMessages = normalizeVisibleMessages(finalMessages);
      finalMessages = tagMessagesForSession(finalMessages, requestSessionKey);
      if (finalMessages.length > 0) {
        rememberSessionHasMessages(requestSessionKey);
      }
      const isVisibleRequestSession = get().currentSessionKey === requestSessionKey;
      if (isVisibleRequestSession) {
        set({ messages: finalMessages, thinkingLevel, loading: false });
      }
      saveMsgCache(requestSessionKey, finalMessages);

      if (!isNamedAgentMainSession(requestSessionKey)) {
        const firstUserMsg = finalMessages.find((m) => m.role === 'user');
        if (firstUserMsg) {
          const labelText = getMessageText(firstUserMsg.content).trim();
          if (labelText) {
            const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
            set((s) => {
              const existing = (s.sessionLabels?.[requestSessionKey] || '').trim();
              if (existing) return {};
              return {
                sessionLabels: { ...s.sessionLabels, [requestSessionKey]: truncated },
              };
            });
          }
        }
      }

      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.timestamp) {
        const lastAt = toMs(lastMsg.timestamp);
        set((s) => ({
          sessionLastActivity: { ...s.sessionLastActivity, [requestSessionKey]: lastAt },
        }));
      }

      loadMissingPreviews(finalMessages).then((updated) => {
        if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
        if (get().currentSessionKey !== requestSessionKey) return;
        if (updated) {
          set((s) => {
            if (s.currentSessionKey !== requestSessionKey) return {};
            const merged = mergeLoadedHistoryWithVisibleMessages(finalMessages, s.messages, requestSessionKey);
            return {
              messages: merged.map((msg) =>
                msg._attachedFiles ? { ...msg, _attachedFiles: msg._attachedFiles.map((f) => ({ ...f })) } : msg,
              ),
            };
          });
        }
      });
    };

    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>('chat.history', params);
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      if (data) {
        registerSessionAlias(data.sessionId, requestSessionKey, { overwrite: true });
        let rawMessages = Array.isArray(data.messages) ? data.messages as RawMessage[] : [];
        const thinkingLevel = data.thinkingLevel ? String(data.thinkingLevel) : null;
        if (rawMessages.length === 0 && isCronSessionKey(requestSessionKey)) {
          rawMessages = await loadCronFallbackMessages(requestSessionKey, limit);
        }
        if (rawMessages.length === 0) {
          const cached = loadMsgCache(requestSessionKey);
          const current = get().currentSessionKey === requestSessionKey ? get().messages : [];
          const fallback = current.length > 0 ? current : cached;
          if (fallback.length > 0) {
            rememberSessionHasMessages(requestSessionKey);
            if (get().currentSessionKey === requestSessionKey) {
              set({ messages: fallback, thinkingLevel, loading: false });
            }
            return;
          }
        }
        applyLoadedMessages(rawMessages, thinkingLevel);
      } else {
        const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, limit);
        if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
        if (fallbackMessages.length > 0) {
          applyLoadedMessages(fallbackMessages, null);
        } else {
          const state = get();
          if (state.sending && state.currentSessionKey === requestSessionKey) {
            set({ loading: false });
          } else {
            const cached = loadMsgCache(requestSessionKey);
            if (state.currentSessionKey === requestSessionKey) {
              const fallback = state.messages.length > 0 ? state.messages : cached;
              set({ messages: fallback, loading: false });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history with options:', err);
      const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, limit);
      if (!historyRequests.isLatest(requestSessionKey, requestId)) return;
      if (fallbackMessages.length > 0) {
        applyLoadedMessages(fallbackMessages, null);
      } else {
        const state = get();
        if (state.sending && state.currentSessionKey === requestSessionKey) {
          set({ loading: false });
        } else {
          const cached = loadMsgCache(requestSessionKey);
          if (state.currentSessionKey === requestSessionKey) {
            const fallback = state.messages.length > 0 ? state.messages : cached;
            set({ messages: fallback, loading: false });
          }
        }
      }
    }
  },

  // ── Send message ──

  sendMessage: async (
    text: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>,
    targetAgentId?: string | null,
    forcedSessionKey?: string | null,
  ) => {
    const trimmed = text.trim();
    if (!trimmed && (!attachments || attachments.length === 0)) return;

    const targetSessionKey = forcedSessionKey
      || resolveMainSessionKeyForAgent(targetAgentId)
      || get().currentSessionKey;
    const isBackgroundSend = Boolean(forcedSessionKey && targetSessionKey !== get().currentSessionKey);
    _locallyCreatedEmptySessions.delete(targetSessionKey);
    _knownEmptySessions.delete(targetSessionKey);

    const hasActiveRunForTarget = inFlightRunBySession.has(targetSessionKey);
    if (hasActiveRunForTarget) {
      const queued: QueuedChatMessage = {
        id: crypto.randomUUID(),
        sessionKey: targetSessionKey,
        text: trimmed,
        attachments,
        targetAgentId,
        createdAt: Date.now(),
      };
      set((s) => ({
        messageQueue: [...s.messageQueue, queued],
        activityLabel: 'activityQueued',
        error: null,
      }));
      return;
    }

    if (targetSessionKey !== get().currentSessionKey && !isBackgroundSend) {
      flushPartialStreamingToMessages(get, set);
      saveMsgCache(get().currentSessionKey, tagMessagesForSession(get().messages, get().currentSessionKey));
      set((s) => buildSessionSwitchPatch(s, targetSessionKey));
      await get().loadHistory(true);
    }

    const currentSessionKey = targetSessionKey;
    _sendingSessionKey = currentSessionKey;

    // Add user message optimistically (with local file metadata for UI display)
    const nowMs = Date.now();
    const userMsg: RawMessage = {
      role: 'user',
      content: trimmed || (attachments?.length ? '(file attached)' : ''),
      timestamp: nowMs / 1000,
      id: crypto.randomUUID(),
      _sessionKey: currentSessionKey,
      _attachedFiles: attachments?.map(a => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        preview: a.preview,
        filePath: a.stagedPath,
      })),
    };
    if (isBackgroundSend) {
      const cachedMessages = loadMsgCache(currentSessionKey);
      saveMsgCache(currentSessionKey, tagMessagesForSession(normalizeVisibleMessages([...cachedMessages, userMsg]), currentSessionKey));
      set((s) => ({
        error: null,
        sessionLastActivity: { ...s.sessionLastActivity, [currentSessionKey]: nowMs },
      }));
    } else {
      set((s) => ({
        messages: normalizeVisibleMessages([...s.messages, userMsg]),
        sending: true,
        error: null,
        streamingText: '',
        streamingMessage: null,
        streamingTools: [],
        pendingFinal: false,
        lastUserMessageAt: nowMs,
        activityLabel: 'activityPlanning',
      }));
    }
    trackInFlightRun(currentSessionKey, null, nowMs);
    updateRunMonitor(currentSessionKey, {
      runId: null,
      status: 'running',
      lastEventLabel: 'activityPlanning',
      reset: true,
    });
    if (!isBackgroundSend) saveMsgCache(currentSessionKey, tagMessagesForSession(get().messages, currentSessionKey));

    // Update session label with first user message text as soon as it's sent
    const { sessionLabels, messages } = get();
    const sessionMessagesForLabel = isBackgroundSend ? loadMsgCache(currentSessionKey) : messages;
    const isFirstMessage = !sessionMessagesForLabel.slice(0, -1).some((m) => m.role === 'user');
    if (!isNamedAgentMainSession(currentSessionKey) && isFirstMessage && !sessionLabels[currentSessionKey] && trimmed) {
      const truncated = trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
      set((s) => ({ sessionLabels: { ...s.sessionLabels, [currentSessionKey]: truncated } }));
    }

    // Mark this session as most recently active
    set((s) => ({ sessionLastActivity: { ...s.sessionLastActivity, [currentSessionKey]: nowMs } }));

    // Start the history poll and safety timeout IMMEDIATELY (before the
    // RPC await) because the gateway's chat.send RPC may block until the
    // entire agentic conversation finishes — the poll must run in parallel.
    markChatEvent(currentSessionKey);
    clearHistoryPoll(currentSessionKey);
    clearErrorRecoveryTimer(currentSessionKey);

    const POLL_START_DELAY = 1_000;
    const POLL_INTERVAL = 2_500;
    const STREAM_STALE_MS = 25_000;
    const pollHistory = () => {
      const state = get();
      if (!inFlightRunBySession.has(currentSessionKey)) { clearHistoryPoll(currentSessionKey); return; }
      const isVisibleSession = state.currentSessionKey === currentSessionKey;

      // 正常流式过程中不打断；但若长时间没有新事件，认为流式中断，改为主动拉历史
      if (isVisibleSession && state.streamingMessage) {
        const idleMs = Date.now() - getLastChatEventAt(currentSessionKey);
        if (idleMs < STREAM_STALE_MS) {
          scheduleHistoryPoll(currentSessionKey, pollHistory, POLL_INTERVAL);
          return;
        }
        console.warn(`[chat.poll] streaming stale for ${idleMs}ms, fallback to history refresh`);
        flushPartialStreamingToMessages(get, set);
        if (get().currentSessionKey === currentSessionKey) {
          set({ streamingMessage: null, streamingText: '' });
        }
        updateRunMonitor(currentSessionKey, {
          status: 'stale',
          lastEventLabel: 'activityStreamStale',
          touch: false,
        });
      }

      updateRunMonitor(currentSessionKey, {
        lastEventLabel: isVisibleSession ? 'activityPollingHistory' : 'activityPollingBackground',
        touch: false,
      });
      if (isVisibleSession) {
        state.loadHistory(true);
      } else {
        void refreshSessionHistoryCache(currentSessionKey);
      }
      scheduleHistoryPoll(currentSessionKey, pollHistory, POLL_INTERVAL);
    };
    scheduleHistoryPoll(currentSessionKey, pollHistory, POLL_START_DELAY);

    const SAFETY_TIMEOUT_MS = 90_000;
    const checkStuck = () => {
      const state = get();
      const inFlight = inFlightRunBySession.get(currentSessionKey);
      if (!inFlight) return;
      const isVisibleSession = state.currentSessionKey === currentSessionKey;
      const relevantMessages = isVisibleSession
        ? state.messages
        : loadMsgCache(currentSessionKey);
      if (hasAssistantMessageAfter(relevantMessages, inFlight.lastUserMessageAt)) {
        clearHistoryPoll(currentSessionKey);
        finishRunMonitor(currentSessionKey, 'completed');
        finishInFlightRun(currentSessionKey, inFlight.runId);
        if (isVisibleSession) {
          set({
            sending: false,
            activeRunId: null,
            pendingFinal: false,
            lastUserMessageAt: null,
            activityLabel: null,
          });
        }
        return;
      }
      if (isVisibleSession && (state.streamingMessage || state.streamingText)) return;
      if (isVisibleSession && state.pendingFinal) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      if (Date.now() - getLastChatEventAt(currentSessionKey) < SAFETY_TIMEOUT_MS) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      clearHistoryPoll(currentSessionKey);
      finishInFlightRun(currentSessionKey, inFlightRunBySession.get(currentSessionKey)?.runId);
      if (get().currentSessionKey === currentSessionKey) {
        const session = get().sessions.find((item) => item.key === currentSessionKey);
        const modelContext = readSessionModel(session);
        const errorMessage = isOpenAiCodexModelContext(modelContext.model, modelContext.provider)
          ? formatOpenAiCodexNetworkFailure(
            `OpenClaw did not receive a model response within ${Math.round(SAFETY_TIMEOUT_MS / 1000)}s. `
            + `Current model: ${formatModelRefForNotice(modelContext.model, modelContext.provider)}.`,
          )
          : 'No response received from the model. The provider may be unavailable or the API key may have insufficient quota. Please check your provider settings.';
        appendLocalSystemNotice(currentSessionKey, errorMessage);
        finishRunMonitor(currentSessionKey, 'failed');
        set({
          error: errorMessage,
          sending: false,
          activeRunId: null,
          lastUserMessageAt: null,
          activityLabel: null,
        });
      }
    };
    setTimeout(checkStuck, 30_000);

    const idempotencyKey = crypto.randomUUID();

    try {
      const hasMedia = attachments && attachments.length > 0;
      const sendPayloadBase: Record<string, unknown> = {
        sessionKey: currentSessionKey,
        deliver: false,
        idempotencyKey,
      };

      if (hasMedia) {
        console.log('[sendMessage] Media paths:', attachments!.map(a => a.stagedPath));
      }

      // Cache image attachments BEFORE the IPC call to avoid race condition:
      // history may reload (via Gateway event) before the RPC returns.
      // Keyed by staged file path which appears in [media attached: <path> ...].
      if (hasMedia) cacheOutgoingAttachments(attachments);

      let result: { success: boolean; result?: { runId?: string }; error?: string };

      // Longer timeout for chat sends to tolerate high-latency networks (avoids connect error)
      const CHAT_SEND_TIMEOUT_MS = 120_000;

      await prepareSessionBeforeSend(currentSessionKey);

      if (hasMedia) {
        // 将媒体附件信息以 [media attached: ...] 标记嵌入消息文本，通过 chat.send RPC 发送
        const mediaTagLines = attachments!.map((a) =>
          `[media attached: ${a.stagedPath} (${a.mimeType}) | ${a.fileName}]`,
        );
        const messageWithMedia = (trimmed || 'Process the attached file(s).') + '\n' + mediaTagLines.join('\n');
        console.log('[sendMessage] Sending with media tags via RPC:', messageWithMedia);
        const rpcResult = await useGatewayStore.getState().rpc<{ runId?: string }>('chat.send', {
          ...sendPayloadBase,
          message: messageWithMedia,
        }, CHAT_SEND_TIMEOUT_MS);
        result = { success: true, result: rpcResult };
      } else {
        const rpcResult = await useGatewayStore.getState().rpc<{ runId?: string }>('chat.send', {
          ...sendPayloadBase,
          message: trimmed,
        }, CHAT_SEND_TIMEOUT_MS);
        result = { success: true, result: rpcResult };
      }

      console.log(`[sendMessage] RPC result: success=${result.success}, runId=${result.result?.runId || 'none'}`);

      if (!result.success) {
        clearHistoryPoll(currentSessionKey);
        finishRunMonitor(currentSessionKey, 'failed');
        finishInFlightRun(currentSessionKey, null);
        const message = result.error || 'Failed to send message';
        appendLocalSystemNotice(currentSessionKey, message);
        if (get().currentSessionKey === currentSessionKey) {
          set({ error: message, sending: false, activityLabel: null });
        }
      } else if (result.result?.runId) {
        trackInFlightRun(currentSessionKey, result.result.runId, nowMs);
        updateRunMonitor(currentSessionKey, {
          runId: result.result.runId,
          status: 'running',
          lastEventLabel: 'activityStarted',
          touch: true,
        });
        if (get().currentSessionKey === currentSessionKey) {
          set({ activeRunId: result.result.runId });
        }
      }
    } catch (err) {
      const errText = String(err || '');
      if (isOpenAiCodexRegionAuthFailure(errText)) {
        const message = formatOpenAiCodexRegionAuthFailure(errText);
        appendLocalSystemNotice(currentSessionKey, message);
        clearHistoryPoll(currentSessionKey);
        clearErrorRecoveryTimer(currentSessionKey);
        finishRunMonitor(currentSessionKey, 'failed');
        finishInFlightRun(currentSessionKey, inFlightRunBySession.get(currentSessionKey)?.runId);
        if (get().currentSessionKey === currentSessionKey) {
          set({
            error: message,
            sending: false,
            activeRunId: null,
            streamingText: '',
            streamingMessage: null,
            streamingTools: [],
            pendingFinal: false,
            lastUserMessageAt: null,
            activityLabel: null,
            pendingToolImages: [],
          });
        }
        return;
      }
      if (isOpenAiCodexNetworkFailure(errText)) {
        const inFlight = inFlightRunBySession.get(currentSessionKey);
        if (hasAssistantMessageAfter(get().messages, inFlight?.lastUserMessageAt)) {
          clearHistoryPoll(currentSessionKey);
          clearErrorRecoveryTimer(currentSessionKey);
          finishRunMonitor(currentSessionKey, 'completed');
          finishInFlightRun(currentSessionKey, inFlight?.runId);
          if (get().currentSessionKey === currentSessionKey) {
            set({
              error: null,
              sending: false,
              activeRunId: null,
              streamingText: '',
              streamingMessage: null,
              streamingTools: [],
              pendingFinal: false,
              lastUserMessageAt: null,
              activityLabel: null,
              pendingToolImages: [],
            });
          }
          return;
        }
        const message = formatOpenAiCodexNetworkFailure(errText);
        appendLocalSystemNotice(currentSessionKey, message);
        clearHistoryPoll(currentSessionKey);
        clearErrorRecoveryTimer(currentSessionKey);
        finishRunMonitor(currentSessionKey, 'failed');
        finishInFlightRun(currentSessionKey, inFlightRunBySession.get(currentSessionKey)?.runId);
        if (get().currentSessionKey === currentSessionKey) {
          set({
            error: message,
            sending: false,
            activeRunId: null,
            streamingText: '',
            streamingMessage: null,
            streamingTools: [],
            pendingFinal: false,
            lastUserMessageAt: null,
            activityLabel: null,
            pendingToolImages: [],
          });
        }
        return;
      }
      if (isDeepSeekReasoningReplayError(errText)) {
        try {
          await useGatewayStore.getState().rpc(
            'sessions.patch',
            { key: currentSessionKey, thinkingLevel: 'off' },
            15_000,
          );
          if (get().currentSessionKey === currentSessionKey) {
            set({ thinkingLevel: 'off' });
          }
          const retryThinkOff = await useGatewayStore.getState().rpc<{ runId?: string }>('chat.send', {
            sessionKey: currentSessionKey,
            message: trimmed,
            deliver: false,
            idempotencyKey: `${idempotencyKey}-retry-thinkoff`,
          }, 120_000);
          if (retryThinkOff?.runId) {
            _sendingSessionKey = currentSessionKey;
            trackInFlightRun(currentSessionKey, retryThinkOff.runId, nowMs);
            updateRunMonitor(currentSessionKey, {
              runId: retryThinkOff.runId,
              status: 'running',
              lastEventLabel: 'activityRecovering',
              touch: true,
            });
            if (get().currentSessionKey === currentSessionKey) {
              set({ activeRunId: retryThinkOff.runId, error: null, sending: true });
            }
            return;
          }
        } catch {
          // fall through
        }
        try {
          await useGatewayStore.getState().rpc('sessions.compact', { key: currentSessionKey }, 30_000);
          const retryResult = await useGatewayStore.getState().rpc<{ runId?: string }>('chat.send', {
            sessionKey: currentSessionKey,
            message: trimmed,
            deliver: false,
            idempotencyKey: `${Date.now()}-retry`,
          }, 120_000);
          if (retryResult?.runId) {
            _sendingSessionKey = currentSessionKey;
            trackInFlightRun(currentSessionKey, retryResult.runId, nowMs);
            updateRunMonitor(currentSessionKey, {
              runId: retryResult.runId,
              status: 'running',
              lastEventLabel: 'activityRecovering',
              touch: true,
            });
            if (get().currentSessionKey === currentSessionKey) {
              set({ activeRunId: retryResult.runId, error: null, sending: true });
            }
            return;
          }
        } catch {
          // fall through to normal error path
        }
      }
      clearHistoryPoll(currentSessionKey);
      finishRunMonitor(currentSessionKey, 'failed');
      finishInFlightRun(currentSessionKey, inFlightRunBySession.get(currentSessionKey)?.runId);
      appendLocalSystemNotice(currentSessionKey, formatDeepSeekReasoningReplayError(errText));
      if (get().currentSessionKey === currentSessionKey) {
        set({
          error: formatDeepSeekReasoningReplayError(errText),
          sending: false,
          activityLabel: null,
        });
      }
    }
  },

  drainMessageQueue: async () => {
    const state = get();
    if (state.messageQueue.length === 0) return;

    const visibleSessionKey = state.currentSessionKey;
    const nextIndex = state.messageQueue.findIndex((item) => {
      const queuedSessionKey = item.sessionKey || visibleSessionKey;
      return !inFlightRunBySession.has(queuedSessionKey);
    });
    if (nextIndex < 0) return;

    const next = state.messageQueue[nextIndex];
    const nextSessionKey = next.sessionKey || visibleSessionKey;
    set((s) => ({
      messageQueue: s.messageQueue.filter((item) => item.id !== next.id),
      activityLabel: s.messageQueue.length > 1 ? 'activitySendingQueued' : null,
    }));
    await get().sendMessage(next.text, next.attachments, next.targetAgentId, nextSessionKey);
  },

  // ── Abort active run ──

  abortRun: async () => {
    const { currentSessionKey, activeRunId } = get();
    clearHistoryPoll(currentSessionKey);
    clearErrorRecoveryTimer(currentSessionKey);
    flushPartialStreamingToMessages(get, set);
    finishRunMonitor(currentSessionKey, 'aborted');
    finishInFlightRun(currentSessionKey, activeRunId);
    set({ sending: false, streamingText: '', streamingMessage: null, pendingFinal: false, lastUserMessageAt: null, pendingToolImages: [], activityLabel: null });
    set({ streamingTools: [] });

    try {
      await useGatewayStore.getState().rpc(
        'chat.abort',
        { sessionKey: currentSessionKey },
      );
    } catch (err) {
      set({ error: String(err) });
    } finally {
      void get().loadHistory(true);
    }
  },

  // ── Handle incoming chat events from Gateway ──

  handleChatEvent: (event: Record<string, unknown>) => {
    const runId = String(event.runId || '');
    const eventState = String(event.state || '');
    const eventSessionKey = event.sessionKey != null ? canonicalizeSessionKey(event.sessionKey) : null;
    const { activeRunId, currentSessionKey, sending } = get();

    // Defensive: if state is missing but we have a message, try to infer state.
    let resolvedState = eventState;
    if (!resolvedState && event.message && typeof event.message === 'object') {
      const msg = event.message as Record<string, unknown>;
      const stopReason = msg.stopReason ?? msg.stop_reason;
      if (stopReason) {
        resolvedState = 'final';
      } else if (msg.role || msg.content) {
        resolvedState = 'delta';
      }
    }

    const targetSessionKey = resolveEventTargetSessionKey({
      eventSessionKey,
      runId,
      currentSessionKey,
      activeRunId,
      sendingSessionKey: _sendingSessionKey,
      inFlightRunBySession: inFlightRunBySession,
      sessionKeyByRunId: sessionKeyByRunId,
    });
    // Ambiguous event (no session key and no run mapping) must not be attached
    // to whichever conversation happens to be visible. Dropping it is safer
    // than corrupting another session's transcript.
    if (!targetSessionKey) return;

    if (runId) {
      trackInFlightRun(targetSessionKey, runId);
    }

    if (targetSessionKey !== currentSessionKey) {
      markChatEvent(targetSessionKey);
      handleBackgroundChatEvent(targetSessionKey, runId, resolvedState, event);
      return;
    }

    const currentInFlight = inFlightRunBySession.get(currentSessionKey);
    if (
      currentInFlight
      && runId
      && !currentInFlight.runId
      && resolvedState !== 'started'
      && isMessageOlderThanInFlightUser(event.message, currentInFlight)
    ) {
      return;
    }

    // Only reject events that are explicitly mapped to another session. Some
    // providers emit recovery / child-run events with a new runId for the same
    // conversation; dropping those events leaves the UI stuck or missing the
    // final assistant message.
    if (activeRunId && runId && runId !== activeRunId) {
      const mappedSessionForRun = sessionKeyByRunId.get(runId);
      if (mappedSessionForRun && mappedSessionForRun !== currentSessionKey) return;
    }

    markChatEvent(currentSessionKey);
    updateRunMonitor(currentSessionKey, {
      runId: runId || null,
      status: resolvedState === 'error'
        ? 'failed'
        : resolvedState === 'aborted'
          ? 'aborted'
          : 'running',
      lastEventLabel: resolvedState === 'delta'
        ? 'activityGenerating'
        : resolvedState === 'final'
          ? 'activityFinalizing'
          : resolvedState === 'error'
            ? 'activityRecovering'
            : resolvedState === 'aborted'
              ? 'activityAborted'
              : 'activityStarted',
      touch: true,
    });

    // Only pause the history poll when we receive actual streaming data.
    // The gateway sends "agent" events with { phase, startedAt } that carry
    // no message — these must NOT kill the poll, since the poll is our only
    // way to track progress when the gateway doesn't stream intermediate turns.
    const hasUsefulData = resolvedState === 'delta' || resolvedState === 'final'
      || resolvedState === 'error' || resolvedState === 'aborted';
    if (hasUsefulData) {
      // Keep the history poll alive during delta streaming. If the stream
      // later stalls, the poll loop detects the idle period and reloads
      // authoritative history instead of leaving the UI stuck forever.
      if (resolvedState !== 'delta') {
        clearHistoryPoll(currentSessionKey);
      }
      // Adopt run started from another client (e.g. console at 127.0.0.1:18789):
      // show loading/streaming in the app when this session has an active run.
      const { sending } = get();
      if (!sending && runId) {
        trackInFlightRun(currentSessionKey, runId);
        set({ sending: true, activeRunId: runId, error: null });
      }
    }

    switch (resolvedState) {
      case 'started': {
        // Run just started (e.g. from console); show loading immediately.
        if (runId) trackInFlightRun(currentSessionKey, runId);
        const { sending: currentSending } = get();
        if (!currentSending && runId) {
          trackInFlightRun(currentSessionKey, runId);
          set({ sending: true, activeRunId: runId, error: null });
        }
        set({ activityLabel: 'activityStarted' });
        break;
      }
      case 'delta': {
        // If we're receiving new deltas, the Gateway has recovered from any
        // prior error — cancel the error finalization timer and clear the
        // stale error banner so the user sees the live stream again.
        if (hasErrorRecoveryTimer(currentSessionKey)) {
          clearErrorRecoveryTimer(currentSessionKey);
          set({ error: null });
        }
        const updates = collectToolUpdates(event.message, resolvedState);
        if (updates.length > 0) {
          updateRunMonitor(currentSessionKey, {
            runId: runId || null,
            status: 'running',
            lastEventLabel: `activityTool:${updates[updates.length - 1]?.name || 'tool'}`,
            touch: true,
          });
        }
        set((s) => ({
          activityLabel: updates.length > 0
            ? `activityTool:${updates[updates.length - 1]?.name || 'tool'}`
            : 'activityGenerating',
          streamingMessage: (() => {
            if (event.message && typeof event.message === 'object') {
              const msgRole = (event.message as RawMessage).role;
              if (isToolResultRole(msgRole)) return s.streamingMessage;
            }
            return event.message ?? s.streamingMessage;
          })(),
          streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
        }));
        break;
      }
      case 'final': {
        clearErrorRecoveryTimer(currentSessionKey);
        if (get().error) set({ error: null });
        // Message complete - add to history and clear streaming
        const finalMsg = event.message as RawMessage | undefined;
        if (finalMsg) {
          if (isHiddenInternalChatMessage(finalMsg)) {
            void get().loadHistory(true);
            break;
          }
          const updates = collectToolUpdates(finalMsg, resolvedState);
          if (isToolResultRole(finalMsg.role)) {
            // Resolve file path from the streaming assistant message's matching tool call
            const currentStreamForPath = get().streamingMessage as RawMessage | null;
            const matchedPath = (currentStreamForPath && finalMsg.toolCallId)
              ? getToolCallFilePath(currentStreamForPath, finalMsg.toolCallId)
              : undefined;

            // Mirror enrichWithToolResultFiles: collect images + file refs for next assistant msg
            const toolFiles: AttachedFileMeta[] = [
              ...extractImagesAsAttachedFiles(finalMsg.content),
            ];
            if (matchedPath) {
              for (const f of toolFiles) {
                if (!f.filePath) {
                  f.filePath = matchedPath;
                  f.fileName = matchedPath.split(/[\\/]/).pop() || 'image';
                }
              }
            }
            const text = getMessageText(finalMsg.content);
            if (text) {
              const mediaRefs = extractMediaRefs(text);
              const mediaRefPaths = new Set(mediaRefs.map(r => r.filePath));
              for (const ref of mediaRefs) toolFiles.push(makeAttachedFile(ref));
              for (const ref of extractRawFilePaths(text)) {
                if (!mediaRefPaths.has(ref.filePath)) toolFiles.push(makeAttachedFile(ref));
              }
            }
            set((s) => {
              // Snapshot the current streaming assistant message (thinking + tool_use) into
              // messages[] before clearing it. The Gateway does NOT send separate 'final'
              // events for intermediate tool-use turns — it only sends deltas and then the
              // tool result. Without snapshotting here, the intermediate thinking+tool steps
              // would be overwritten by the next turn's deltas and never appear in the UI.
              const currentStream = s.streamingMessage as RawMessage | null;
              const snapshotMsgs: RawMessage[] = [];
              if (currentStream) {
                const streamRole = currentStream.role;
                if (streamRole === 'assistant' || streamRole === undefined) {
                  // Use message's own id if available, otherwise derive a stable one from runId
                  const snapId = currentStream.id
                    || `${runId || 'run'}-turn-${s.messages.length}`;
                  if (!s.messages.some(m => m.id === snapId)) {
                    snapshotMsgs.push({
                      ...(currentStream as RawMessage),
                      role: 'assistant',
                      id: snapId,
                      timestamp: currentStream.timestamp ?? Math.floor(Date.now() / 1000),
                      _sessionKey: currentSessionKey,
                    });
                  }
                }
              }
              return {
                messages: snapshotMsgs.length > 0 ? [...s.messages, ...snapshotMsgs] : s.messages,
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                pendingToolImages: toolFiles.length > 0
                  ? [...s.pendingToolImages, ...toolFiles]
                  : s.pendingToolImages,
                streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
              };
            });
            saveMsgCache(currentSessionKey, tagMessagesForSession(get().messages, currentSessionKey));
            const previewSessionKey = currentSessionKey;
            const previewMessages = tagMessagesForSession(get().messages, previewSessionKey);
            void loadMissingPreviews(previewMessages).then((updated) => {
              if (!updated) return;
              if (get().currentSessionKey !== previewSessionKey) return;
              set((s) => ({
                messages: s.messages.map(msg =>
                  msg._attachedFiles
                    ? { ...msg, _attachedFiles: msg._attachedFiles.map(f => ({ ...f })) }
                    : msg,
                ),
              }));
            });
            break;
          }
          const toolOnly = isToolOnlyMessage(finalMsg);
          const hasOutput = hasNonToolAssistantContent(finalMsg);
          const msgId = finalMsg.id || makeStableMessageId(
            toolOnly ? `run-${runId || 'unknown'}-tool` : `run-${runId || 'unknown'}`,
            finalMsg,
          );
          set((s) => {
            const nextTools = updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools;
            const streamingTools = hasOutput ? [] : nextTools;

            // Attach any images collected from preceding tool results
            const pendingImgs = s.pendingToolImages;
            const msgWithImages: RawMessage = pendingImgs.length > 0
              ? {
                ...finalMsg,
                role: (finalMsg.role || 'assistant') as RawMessage['role'],
                id: msgId,
                timestamp: finalMsg.timestamp ?? Math.floor(Date.now() / 1000),
                _sessionKey: currentSessionKey,
                _attachedFiles: [...(finalMsg._attachedFiles || []), ...pendingImgs],
              }
              : {
                ...finalMsg,
                role: (finalMsg.role || 'assistant') as RawMessage['role'],
                id: msgId,
                timestamp: finalMsg.timestamp ?? Math.floor(Date.now() / 1000),
                _sessionKey: currentSessionKey,
              };
            const clearPendingImages = { pendingToolImages: [] as AttachedFileMeta[] };

            // Check if message already exists (prevent duplicates)
            const alreadyExists = s.messages.some(m => m.id === msgId);
            if (alreadyExists) {
              return toolOnly ? {
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                streamingTools,
                ...clearPendingImages,
              } : {
                streamingText: '',
                streamingMessage: null,
                sending: hasOutput ? false : s.sending,
                activeRunId: hasOutput ? null : s.activeRunId,
                pendingFinal: hasOutput ? false : true,
                streamingTools,
                ...clearPendingImages,
              };
            }
            return toolOnly ? {
              messages: normalizeVisibleMessages([...s.messages, msgWithImages]),
              streamingText: '',
              streamingMessage: null,
              pendingFinal: true,
              streamingTools,
              ...clearPendingImages,
            } : {
              messages: normalizeVisibleMessages([...s.messages, msgWithImages]),
              streamingText: '',
              streamingMessage: null,
              sending: hasOutput ? false : s.sending,
              activeRunId: hasOutput ? null : s.activeRunId,
              pendingFinal: hasOutput ? false : true,
              streamingTools,
              ...clearPendingImages,
            };
          });
          // Persist committed messages to localStorage immediately so a
          // renderer reload (e.g. refresh) can restore them before Gateway
          // has a chance to return the history via chat.history RPC.
          saveMsgCache(currentSessionKey, tagMessagesForSession(get().messages, currentSessionKey));
          // Eagerly load any missing image previews for the just-committed
          // messages (e.g. tool-output images whose filePath needs a data: URL).
          // loadMissingPreviews calls /api/files/thumbnails; it is idempotent.
          const previewSessionKey = currentSessionKey;
          const previewMessages = tagMessagesForSession(get().messages, previewSessionKey);
          void loadMissingPreviews(previewMessages).then((updated) => {
            if (!updated) return;
            if (get().currentSessionKey !== previewSessionKey) return;
            set((s) => ({
              messages: s.messages.map(msg =>
                msg._attachedFiles
                  ? { ...msg, _attachedFiles: msg._attachedFiles.map(f => ({ ...f })) }
                  : msg,
              ),
            }));
          });
          if (hasOutput && !toolOnly) {
            clearHistoryPoll(currentSessionKey);
            finishRunMonitor(currentSessionKey, 'completed');
            finishInFlightRun(currentSessionKey, runId);
            set({ activityLabel: null });
            // Quietly reload to get Gateway's authoritative record (with stable IDs)
            void get().loadHistory(true);
          }
        } else {
          // No message in final event - reload history to get complete data
          set({ streamingText: '', streamingMessage: null, pendingFinal: true });
          get().loadHistory();
        }
        break;
      }
      case 'error': {
        const errorMsg = String(event.errorMessage || 'An error occurred');
        const wasSending = get().sending;

        if (isOpenAiCodexRegionAuthFailure(errorMsg)) {
          const message = formatOpenAiCodexRegionAuthFailure(errorMsg);
          appendLocalSystemNotice(currentSessionKey, message);
          clearHistoryPoll(currentSessionKey);
          clearErrorRecoveryTimer(currentSessionKey);
          finishRunMonitor(currentSessionKey, 'failed');
          finishInFlightRun(currentSessionKey, runId);
          set({
            error: message,
            sending: false,
            activeRunId: null,
            streamingText: '',
            streamingMessage: null,
            streamingTools: [],
            pendingFinal: false,
            lastUserMessageAt: null,
            activityLabel: null,
            pendingToolImages: [],
          });
          break;
        }

        if (isOpenAiCodexNetworkFailure(errorMsg)) {
          const inFlight = inFlightRunBySession.get(currentSessionKey);
          if (hasAssistantMessageAfter(get().messages, inFlight?.lastUserMessageAt)) {
            clearHistoryPoll(currentSessionKey);
            clearErrorRecoveryTimer(currentSessionKey);
            finishRunMonitor(currentSessionKey, 'completed');
            finishInFlightRun(currentSessionKey, runId);
            set({
              error: null,
              sending: false,
              activeRunId: null,
              streamingText: '',
              streamingMessage: null,
              streamingTools: [],
              pendingFinal: false,
              lastUserMessageAt: null,
              activityLabel: null,
              pendingToolImages: [],
            });
            break;
          }
          const message = formatOpenAiCodexNetworkFailure(errorMsg);
          appendLocalSystemNotice(currentSessionKey, message);
          clearHistoryPoll(currentSessionKey);
          clearErrorRecoveryTimer(currentSessionKey);
          finishRunMonitor(currentSessionKey, 'failed');
          finishInFlightRun(currentSessionKey, runId);
          set({
            error: message,
            sending: false,
            activeRunId: null,
            streamingText: '',
            streamingMessage: null,
            streamingTools: [],
            pendingFinal: false,
            lastUserMessageAt: null,
            activityLabel: null,
            pendingToolImages: [],
          });
          break;
        }

        if (isDeepSeekReasoningReplayError(errorMsg)) {
          void useGatewayStore.getState().rpc(
            'sessions.patch',
            { key: currentSessionKey, thinkingLevel: 'off' },
            15_000,
          ).then(() => {
            if (get().currentSessionKey !== currentSessionKey) return;
            set({ thinkingLevel: 'off' });
          }).catch(() => { /* ignore */ });
        }

        // Snapshot the current streaming message into messages[] so partial
        // content ("Let me get that written down...") is preserved in the UI
        // rather than being silently discarded.
        const currentStream = get().streamingMessage as RawMessage | null;
        if (currentStream && (currentStream.role === 'assistant' || currentStream.role === undefined)) {
          const snapId = (currentStream as RawMessage).id
            || `error-snap-${Date.now()}`;
          const alreadyExists = get().messages.some(m => m.id === snapId);
          if (!alreadyExists) {
            set((s) => ({
              messages: normalizeVisibleMessages([
                ...s.messages,
                {
                  ...currentStream,
                  role: 'assistant' as const,
                  id: snapId,
                  timestamp: currentStream.timestamp ?? Math.floor(Date.now() / 1000),
                  _sessionKey: currentSessionKey,
                },
              ]),
            }));
          }
        }

        set({
          error: isDeepSeekReasoningReplayError(errorMsg) ? formatDeepSeekReasoningReplayError(errorMsg) : errorMsg,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          activityLabel: 'activityRecovering',
          pendingToolImages: [],
        });
        appendLocalSystemNotice(
          currentSessionKey,
          isDeepSeekReasoningReplayError(errorMsg) ? formatDeepSeekReasoningReplayError(errorMsg) : errorMsg,
        );

        // Don't immediately give up: the Gateway often retries internally
        // after transient API failures (e.g. "terminated"). Keep `sending`
        // true for a grace period so that recovery events are processed and
        // the agent-phase-completion handler can still trigger loadHistory.
        if (wasSending) {
          const ERROR_RECOVERY_GRACE_MS = 15_000;
          scheduleErrorRecoveryTimer(currentSessionKey, () => {
            const state = get();
            if (state.currentSessionKey !== currentSessionKey) return;
            if (state.sending && !state.streamingMessage) {
              clearHistoryPoll(currentSessionKey);
              finishRunMonitor(currentSessionKey, 'failed');
              finishInFlightRun(currentSessionKey, runId);
              // Grace period expired with no recovery — finalize the error
              set({
                sending: false,
                activeRunId: null,
                lastUserMessageAt: null,
                activityLabel: null,
              });
              // One final history reload in case the Gateway completed in the
              // background and we just missed the event.
              state.loadHistory(true);
            }
          }, ERROR_RECOVERY_GRACE_MS);
        } else {
          clearHistoryPoll(currentSessionKey);
          finishRunMonitor(currentSessionKey, 'failed');
          finishInFlightRun(currentSessionKey, runId);
          set({ sending: false, activeRunId: null, lastUserMessageAt: null, activityLabel: null });
        }
        break;
      }
      case 'aborted': {
        clearHistoryPoll(currentSessionKey);
        clearErrorRecoveryTimer(currentSessionKey);
        flushPartialStreamingToMessages(get, set);
        finishRunMonitor(currentSessionKey, 'aborted');
        finishInFlightRun(currentSessionKey, runId);
        set({
          sending: false,
          activeRunId: null,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          lastUserMessageAt: null,
          activityLabel: null,
          pendingToolImages: [],
        });
        break;
      }
      default: {
        // Unknown or empty state — if we're currently sending and receive an event
        // with a message, attempt to process it as streaming data. This handles
        // edge cases where the Gateway sends events without a state field.
        const { sending } = get();
        if (sending && event.message && typeof event.message === 'object') {
          console.warn(`[handleChatEvent] Unknown event state "${resolvedState}", treating message as streaming delta. Event keys:`, Object.keys(event));
          const updates = collectToolUpdates(event.message, 'delta');
          set((s) => ({
            streamingMessage: event.message ?? s.streamingMessage,
            streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
          }));
        }
        break;
      }
    }
  },

  // ── Toggle thinking visibility ──

  toggleThinking: () => set((s) => ({ showThinking: !s.showThinking })),

  setSessionLabel: (sessionKey: string, label: string) => {
    const trimmed = label.trim();
    set((s) => ({
      sessionLabels: { ...s.sessionLabels, [sessionKey]: trimmed || s.sessionLabels[sessionKey] || '' },
    }));
  },

  toggleSessionFavorite: (sessionKey: string) => {
    set((s) => {
      const next = { ...s.favoriteSessionKeys };
      if (next[sessionKey]) {
        delete next[sessionKey];
      } else {
        next[sessionKey] = true;
      }
      saveSessionFavorites(next);
      return { favoriteSessionKeys: next };
    });
  },

  // ── Refresh: reload history + sessions ──

  refresh: async () => {
    const { loadHistory, loadSessions } = get();
    // 先加载会话列表，确保 currentSessionKey 正确，再加载历史
    await loadSessions();
    await loadHistory();
  },

  clearError: () => set({ error: null }),
}));
