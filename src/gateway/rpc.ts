/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */

import { getResolvedGatewayPort, resolveGatewayPort, setResolvedGatewayPort } from './port';
import { GATEWAY_TOKEN } from './constants';
import { getSetting, isInitialized } from '../database';

const GW_MODE_KEY = 'gateway.connection.mode';
const GW_REMOTE_PROTOCOL_KEY = 'gateway.remote.protocol';
const GW_REMOTE_HOST_KEY = 'gateway.remote.host';
const GW_REMOTE_PORT_KEY = 'gateway.remote.port';
const GW_REMOTE_TOKEN_KEY = 'gateway.remote.token';

type GatewayRuntimeConfig = {
  mode: 'local' | 'remote';
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  token: string;
};

function getGatewayRuntimeConfig(): GatewayRuntimeConfig {
  const defaults: GatewayRuntimeConfig = {
    mode: 'local',
    protocol: 'ws',
    host: '127.0.0.1',
    port: getResolvedGatewayPort(),
    token: GATEWAY_TOKEN,
  };

  try {
    if (!isInitialized()) return defaults;
    const modeRaw = (getSetting(GW_MODE_KEY) || 'local').toLowerCase();
    if (modeRaw !== 'remote') return defaults;

    const protocolRaw = (getSetting(GW_REMOTE_PROTOCOL_KEY) || 'ws').toLowerCase();
    const protocol: 'ws' | 'wss' = protocolRaw === 'wss' ? 'wss' : 'ws';
    const host = (getSetting(GW_REMOTE_HOST_KEY) || '').trim();
    const portRaw = parseInt(getSetting(GW_REMOTE_PORT_KEY) || '', 10);
    const token = (getSetting(GW_REMOTE_TOKEN_KEY) || '').trim() || GATEWAY_TOKEN;
    const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 18789;

    if (!host) return defaults;
    return { mode: 'remote', protocol, host, port, token };
  } catch {
    return defaults;
  }
}

function getGatewayWsUrl(): string {
  const cfg = getGatewayRuntimeConfig();
  return `${cfg.protocol}://${cfg.host}:${cfg.port}/ws`;
}

function getGatewayToken(): string {
  return getGatewayRuntimeConfig().token;
}

/** 是否为连接类错误（可尝试重新探测端口后重试） */
function isConnectionError(err: unknown): boolean {
  const msg = String(err ?? '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('websocket error') ||
    msg.includes('connection closed') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset')
  );
}

export interface GatewayRpcResult {
  success: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * 调用 Gateway JSON-RPC（主进程内使用）
 */
export async function callGatewayRpc(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30000
): Promise<GatewayRpcResult> {
  const WebSocket = require('ws');
  const ws = new WebSocket(getGatewayWsUrl());

  return new Promise((resolve) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve({ success: false, ok: false, error: 'Timeout' });
      }
    }, timeoutMs);

    const doRpc = () => {
      ws.send(
        JSON.stringify({
          type: 'req',
          id: `rpc-${Date.now()}`,
          method,
          params,
        })
      );
    };

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(
            JSON.stringify({
              type: 'req',
              id: 'connect-' + Date.now(),
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  displayName: 'AxonClaw',
                  version: '0.1.0',
                  platform: process.platform,
                  mode: 'ui',
                },
                auth: { token: getGatewayToken() },
                role: 'operator',
                scopes: ['operator.admin'],
              },
            })
          );
          return;
        }

        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({
              success: false,
              ok: false,
              error: String(msg.error?.message ?? msg.error ?? 'Connect failed'),
            });
            return;
          }
          doRpc();
          return;
        }

        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            const ok = msg.ok !== false && !msg.error;
            const result = msg.result ?? msg.payload;
            const error =
              msg.error != null
                ? String(
                    typeof msg.error === 'object' && msg.error && 'message' in msg.error
                      ? (msg.error as { message?: string }).message
                      : msg.error
                  )
                : undefined;
            resolve({ success: ok, ok, result, error });
          }
        }
      } catch {
        /* ignore parse errors */
      }
    });

    ws.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: 'WebSocket error' });
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: 'Connection closed' });
      }
    });
  });
}

/**
 * 带端口重试的 RPC：失败时重新探测端口并重试一次（用于智能代理等首次请求可能端口未缓存场景）
 */
export async function callGatewayRpcWithRetry(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30000
): Promise<GatewayRpcResult> {
  let result = await callGatewayRpc(method, params, timeoutMs);
  if (result.ok) return result;
  if (!isConnectionError(result.error)) return result;

  if (getGatewayRuntimeConfig().mode === 'remote') {
    return result;
  }

  const r = await resolveGatewayPort();
  if (r.success && r.port) {
    setResolvedGatewayPort(r.port);
    result = await callGatewayRpc(method, params, timeoutMs);
  }
  return result;
}
