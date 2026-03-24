/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */

import { getResolvedGatewayPort, resolveGatewayPort, setResolvedGatewayPort } from './port';
import { GATEWAY_TOKEN } from './constants';

function getGatewayWsUrl(): string {
  return `ws://127.0.0.1:${getResolvedGatewayPort()}/ws`;
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
                auth: { token: GATEWAY_TOKEN },
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

  const r = await resolveGatewayPort();
  if (r.success && r.port) {
    setResolvedGatewayPort(r.port);
    result = await callGatewayRpc(method, params, timeoutMs);
  }
  return result;
}
