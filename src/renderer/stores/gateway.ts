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
import {
  normalizeGatewayChatMessage,
  normalizeGatewayNotification,
  type GatewayNotification,
} from './gateway/runtime-events';

let gatewayInitPromise: Promise<void> | null = null;
let gatewayEventUnsubscribers: Array<() => void> | null = null;

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

function handleGatewayNotification(notification: GatewayNotification | undefined): void {
  const payload = notification;
  if (!payload || payload.method !== 'agent' || !payload.params || typeof payload.params !== 'object') {
    return;
  }
  useTaskMonitorStore.getState().handleGatewayNotification(payload);

  const normalizedEvent = normalizeGatewayNotification(payload);
  if (normalizedEvent) useChatStore.getState().handleChatEvent(normalizedEvent);
}

function handleGatewayChatMessage(data: unknown): void {
  const normalizedEvent = normalizeGatewayChatMessage(data);
  if (!normalizedEvent) return;

  useTaskMonitorStore.getState().handleGatewayNotification({
    method: 'agent',
    params: {
      state: normalizedEvent.state,
      runId: normalizedEvent.runId,
      sessionKey: normalizedEvent.sessionKey,
      message: normalizedEvent.message,
      errorMessage: normalizedEvent.errorMessage,
    },
  });

  useChatStore.getState().handleChatEvent(normalizedEvent);
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
