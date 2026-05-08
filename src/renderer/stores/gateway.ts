/**
 * Gateway State Store
 * Uses Host API + SSE for lifecycle/status and a direct renderer WebSocket for runtime RPC.
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { subscribeHostEvent } from '@/lib/host-events';
import type { GatewayStatus } from '../types/gateway';
import { useChatStore } from './chat';
import { useChannelsStore } from './channels';
import { useTaskMonitorStore } from './task-monitor';

let gatewayInitPromise: Promise<void> | null = null;
let gatewayEventUnsubscribers: Array<() => void> | null = null;

// 完成事件宽限期：多轮对话中 Gateway 会在每个 agent step 发送 completed，
// 延迟处理避免中间 step 的 completed 提前结束 sending 状态
let _completionGraceTimer: ReturnType<typeof setTimeout> | null = null;
function clearCompletionGrace() {
  if (_completionGraceTimer) {
    clearTimeout(_completionGraceTimer);
    _completionGraceTimer = null;
  }
}

interface GatewayHealth {
  ok: boolean;
  error?: string;
  uptime?: number;
}

interface GatewayState {
  status: GatewayStatus;
  health: GatewayHealth | null;
  isInitialized: boolean;
  lastError: string | null;
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  checkHealth: () => Promise<GatewayHealth>;
  rpc: <T>(method: string, params?: unknown, timeoutMs?: number) => Promise<T>;
  setStatus: (status: GatewayStatus) => void;
  clearError: () => void;
}

function handleGatewayNotification(notification: { method?: string; params?: Record<string, unknown> } | undefined): void {
  const payload = notification;
  if (!payload || payload.method !== 'agent' || !payload.params || typeof payload.params !== 'object') {
    return;
  }
  useTaskMonitorStore.getState().handleGatewayNotification(payload);

  const p = payload.params;
  const data = (p.data && typeof p.data === 'object') ? (p.data as Record<string, unknown>) : {};
  const phase = data.phase ?? p.phase;
  const inferredState = p.state ?? data.state ?? (
    phase === 'error' || phase === 'failed'
      ? 'error'
      : (phase === 'aborted' || phase === 'abort' ? 'aborted' : undefined)
  );
  const inferredErrorMessage = (() => {
    if (typeof p.errorMessage === 'string' && p.errorMessage.trim()) return p.errorMessage.trim();
    if (typeof data.errorMessage === 'string' && data.errorMessage.trim()) return data.errorMessage.trim();
    if (typeof p.error === 'string' && p.error.trim()) return p.error.trim();
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    if (p.error && typeof p.error === 'object') {
      const err = p.error as Record<string, unknown>;
      if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    }
    if (data.error && typeof data.error === 'object') {
      const err = data.error as Record<string, unknown>;
      if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    }
    if (p.message && typeof p.message === 'object') {
      const msg = p.message as Record<string, unknown>;
      if (typeof msg.errorMessage === 'string' && msg.errorMessage.trim()) return msg.errorMessage.trim();
      if (typeof msg.error === 'string' && msg.error.trim()) return msg.error.trim();
      if (msg.error && typeof msg.error === 'object') {
        const err = msg.error as Record<string, unknown>;
        if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
      }
    }
    return undefined;
  })();
  const hasChatData = inferredState || (p.message ?? data.message) || inferredErrorMessage;

  if (hasChatData) {
    // 收到新的流式数据，取消待处理的完成宽限（说明对话仍在继续）
    clearCompletionGrace();
    const normalizedEvent: Record<string, unknown> = {
      ...data,
      runId: p.runId ?? data.runId,
      sessionKey: p.sessionKey ?? data.sessionKey,
      stream: p.stream ?? data.stream,
      seq: p.seq ?? data.seq,
      state: inferredState,
      message: p.message ?? data.message,
      errorMessage: inferredErrorMessage,
    };
    useChatStore.getState().handleChatEvent(normalizedEvent);
  }

  const runId = p.runId ?? data.runId;
  const sessionKey = p.sessionKey ?? data.sessionKey;
  if (phase === 'started' && runId != null && sessionKey != null) {
    // 新 run 启动，取消任何待处理的完成宽限
    clearCompletionGrace();
    const state = useChatStore.getState();
    const resolvedSessionKey = String(sessionKey);
    const shouldRefreshSessions =
      resolvedSessionKey !== state.currentSessionKey
      || !state.sessions.some((session) => session.key === resolvedSessionKey);
    if (shouldRefreshSessions) {
      void state.loadSessions();
    }

    state.handleChatEvent({
      state: 'started',
      runId,
      sessionKey: resolvedSessionKey,
    });
  }

  if (phase === 'completed' || phase === 'done' || phase === 'finished' || phase === 'end') {
    const state = useChatStore.getState();
    const resolvedSessionKey = sessionKey != null ? String(sessionKey) : null;
    const shouldRefreshSessions = resolvedSessionKey != null && (
      resolvedSessionKey !== state.currentSessionKey
      || !state.sessions.some((session) => session.key === resolvedSessionKey)
    );
    if (shouldRefreshSessions) {
      void state.loadSessions();
    }

    const matchesCurrentSession = resolvedSessionKey == null || resolvedSessionKey === state.currentSessionKey;
    const matchesActiveRun = runId != null && state.activeRunId != null && String(runId) === state.activeRunId;

    if (matchesCurrentSession || matchesActiveRun) {
      void state.loadHistory(true);
    } else if (resolvedSessionKey != null) {
      state.handleChatEvent({
        state: 'final',
        runId,
        sessionKey: resolvedSessionKey,
      });
    }
    if ((matchesCurrentSession || matchesActiveRun) && state.sending) {
      // 多轮对话中 Gateway 会在每个 agent step 发送 completed，
      // 使用宽限期延迟结束，让新 run 有机会启动
      clearCompletionGrace();
      const COMPLETION_GRACE_MS = 5_000;
      _completionGraceTimer = setTimeout(() => {
        _completionGraceTimer = null;
        const s = useChatStore.getState();
        if (s.sending) {
          useChatStore.setState({
            sending: false,
            activeRunId: null,
            pendingFinal: false,
            lastUserMessageAt: null,
          });
          // 宽限期结束后再刷新一次历史，确保获取完整对话
          void s.loadHistory(true);
        }
      }, COMPLETION_GRACE_MS);
    }
  }
}

function handleGatewayChatMessage(data: unknown): void {
  const chatData = data as Record<string, unknown>;
  const payload = ('message' in chatData && typeof chatData.message === 'object')
    ? chatData.message as Record<string, unknown>
    : chatData;
  useTaskMonitorStore.getState().handleGatewayNotification({
    method: 'agent',
    params: {
      state: payload.state ?? 'final',
      runId: chatData.runId ?? payload.runId,
      sessionKey: chatData.sessionKey ?? payload.sessionKey,
      message: payload,
      errorMessage: payload.errorMessage ?? payload.error,
    },
  });

  if (payload.state) {
    useChatStore.getState().handleChatEvent({
      ...payload,
      runId: chatData.runId ?? payload.runId,
      sessionKey: chatData.sessionKey ?? payload.sessionKey,
    });
    return;
  }

  useChatStore.getState().handleChatEvent({
    state: 'final',
    message: payload,
    runId: chatData.runId ?? payload.runId,
    sessionKey: chatData.sessionKey ?? payload.sessionKey,
  });
}

function mapChannelStatus(status: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
  switch (status) {
    case 'connected':
    case 'running':
      return 'connected';
    case 'connecting':
    case 'starting':
      return 'connecting';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'disconnected';
  }
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  status: {
    state: 'stopped',
    port: 18789,
  },
  health: null,
  isInitialized: false,
  lastError: null,

  init: async () => {
    if (get().isInitialized) return;
    if (gatewayInitPromise) {
      await gatewayInitPromise;
      return;
    }

    gatewayInitPromise = (async () => {
      try {
        console.log('[Gateway] Starting init...');
        // 从主进程拉取最新状态，确保与 main 一致
        let status: GatewayStatus = { state: 'stopped', port: 18789 };
        try {
          const mainStatus = await invokeIpc<GatewayStatus>('gateway:status');
          if (mainStatus?.state) status = { ...status, ...mainStatus };
        } catch {
          // 主进程未就绪时保留默认 stopped
        }

        // 如果 IPC 返回 stopped，做一次真实连接检测来修正状态
        // （概览页通过 checkConnection 做了同样的事，会话页缺少此步骤导致状态不同步）
        if (status.state === 'stopped' || status.state === 'error') {
          try {
            const conn = await invokeIpc<{ success: boolean; port?: number; error?: string }>('gateway:checkConnection');
            if (conn?.success) {
              status = { ...status, state: 'running', port: conn.port ?? status.port };
              console.log('[Gateway] Connection check succeeded, correcting state to running');
            }
          } catch {
            // 连接检测失败，保留原始 stopped 状态
          }
        }

        set({ status, health: { ok: status.state === 'running' }, isInitialized: true });
        console.log(`[Gateway] Init complete, state=${status.state}, port=${status.port}`);

        if (!gatewayEventUnsubscribers) {
          const unsubscribers: Array<() => void> = [];
          unsubscribers.push(subscribeHostEvent<GatewayStatus>('gateway:status', (payload) => {
            set({ status: payload });
          }));
          unsubscribers.push(subscribeHostEvent<{ message?: string }>('gateway:error', (payload) => {
            set({ lastError: payload.message || 'Gateway error' });
          }));
          unsubscribers.push(subscribeHostEvent<{ method?: string; params?: Record<string, unknown> }>(
            'gateway:notification',
            (payload) => {
              handleGatewayNotification(payload);
            },
          ));
          unsubscribers.push(subscribeHostEvent('gateway:chat-message', (payload) => {
            handleGatewayChatMessage(payload);
          }));
          unsubscribers.push(subscribeHostEvent<{ channelId?: string; status?: string }>(
            'gateway:channel-status',
            (update) => {
              if (!update.channelId || !update.status) return;
              const state = useChannelsStore.getState();
              const channel = state.channels.find((item) => item.type === update.channelId);
              if (channel) {
                state.updateChannel(channel.id, { status: mapChannelStatus(update.status) });
              }
            },
          ));
          gatewayEventUnsubscribers = unsubscribers;
        }

        // 如果初始化后仍是 stopped/error，启动定期重连检测（每 10 秒一次，成功后自动停止）
        if (status.state !== 'running') {
          const retryTimer = window.setInterval(async () => {
            try {
              const conn = await invokeIpc<{ success: boolean; port?: number }>('gateway:checkConnection');
              if (conn?.success) {
                set({
                  status: { ...get().status, state: 'running', port: conn.port ?? get().status.port },
                  health: { ok: true },
                });
                console.log('[Gateway] Reconnect check succeeded, state corrected to running');
                window.clearInterval(retryTimer);
              }
            } catch {
              // 继续重试
            }
          }, 10000);
        }
      } catch (error) {
        console.error('Failed to initialize Gateway:', error);
        set({ lastError: String(error) });
      } finally {
        gatewayInitPromise = null;
      }
    })();

    await gatewayInitPromise;
  },

  start: async () => {
    try {
      set({ status: { ...get().status, state: 'starting' }, lastError: null });
      const result = await hostApiFetch<{
        success: boolean;
        error?: string;
        diagnostics?: string[];
        logTail?: string[];
        selfHealTried?: boolean;
        selfHealSucceeded?: boolean;
        status?: GatewayStatus;
      }>('/api/gateway/start', {
        method: 'POST',
      });
      if (!result.success) {
        const diag = Array.isArray(result.diagnostics) && result.diagnostics.length > 0
          ? `\n\nDiagnostics:\n${result.diagnostics.map((line) => `- ${line}`).join('\n')}`
          : '';
        const logTail = Array.isArray(result.logTail) && result.logTail.length > 0
          ? `\n\nRecent Gateway Logs:\n${result.logTail.slice(-25).join('\n')}`
          : '';
        const enrichedError = `${result.error || 'Failed to start Gateway'}${diag}${logTail}`;
        set({
          status: result.status
            ? { ...get().status, ...result.status, state: 'error', error: result.error || result.status.error }
            : { ...get().status, state: 'error', error: result.error },
          lastError: enrichedError,
        });
      } else if (result.status) {
        set({ status: { ...get().status, ...result.status }, lastError: null });
      }
    } catch (error) {
      set({
        status: { ...get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  },

  stop: async () => {
    try {
      const status = await invokeIpc<GatewayStatus>('gateway:stop');
      set({ status: { ...get().status, ...status }, lastError: null });
    } catch (error) {
      console.error('Failed to stop Gateway:', error);
      set({ lastError: String(error) });
    }
  },

  restart: async () => {
    try {
      set({ status: { ...get().status, state: 'starting' }, lastError: null });
      const result = await invokeIpc<{ success: boolean; error?: string }>('gateway:restart');
      if (!result.success) {
        set({
          status: { ...get().status, state: 'error', error: result.error },
          lastError: result.error || 'Failed to restart Gateway',
        });
      }
    } catch (error) {
      set({
        status: { ...get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  },

  checkHealth: async () => {
    try {
      const result = await hostApiFetch<GatewayHealth>('/api/gateway/health');
      set({ health: result });
      return result;
    } catch (error) {
      const health: GatewayHealth = { ok: false, error: String(error) };
      set({ health });
      return health;
    }
  },

  rpc: async <T>(method: string, params?: unknown, timeoutMs?: number): Promise<T> => {
    const response = await invokeIpc<{
      success: boolean;
      result?: T;
      error?: string;
    }>('gateway:rpc', method, params, timeoutMs);
    if (!response.success) {
      throw new Error(response.error || `Gateway RPC failed: ${method}`);
    }
    return response.result as T;
  },

  setStatus: (status) => set({ status }),
  clearError: () => set({ lastError: null }),
}));
