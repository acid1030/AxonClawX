import { hostApiFetch } from './host-api';

type GatewayInfo = {
  wsUrl: string;
  token: string;
  port: number;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type GatewayEventHandler = (payload: unknown) => void;

class GatewayBrowserClient {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private gatewayInfo: GatewayInfo | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<GatewayEventHandler>>();

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = this.openSocket();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Gateway connection closed'));
    }
    this.pendingRequests.clear();
  }

  async rpc<T>(method: string, params?: unknown, timeoutMs = 30000): Promise<T> {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway socket is not connected');
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const request = {
      type: 'req',
      id,
      method,
      params,
    };

    return await new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Gateway RPC timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
      this.ws!.send(JSON.stringify(request));
    });
  }

  on(eventName: string, handler: GatewayEventHandler): () => void {
    const handlers = this.eventHandlers.get(eventName) || new Set<GatewayEventHandler>();
    handlers.add(handler);
    this.eventHandlers.set(eventName, handlers);

    return () => {
      const current = this.eventHandlers.get(eventName);
      current?.delete(handler);
      if (current && current.size === 0) {
        this.eventHandlers.delete(eventName);
      }
    };
  }

  private async openSocket(): Promise<void> {
    console.log('[GatewayClient] Fetching gateway info...');
    this.gatewayInfo = await hostApiFetch<GatewayInfo>('/api/app/gateway-info');
    console.log('[GatewayClient] Gateway info:', this.gatewayInfo);

    await new Promise<void>((resolve, reject) => {
      console.log('[GatewayClient] Connecting to WebSocket:', this.gatewayInfo!.wsUrl);
      const ws = new WebSocket(this.gatewayInfo!.wsUrl);
      let resolved = false;
      let challengeTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (challengeTimer) {
          clearTimeout(challengeTimer);
          challengeTimer = null;
        }
      };

      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.log('[GatewayClient] WebSocket connected!');
          resolve();
        }
      };

      const rejectOnce = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error('[GatewayClient] WebSocket error:', error);
          reject(error);
        }
      };

      ws.onerror = (err) => {
        console.error('[GatewayClient] WebSocket onerror:', err);
        rejectOnce(new Error('WebSocket error'));
      };

      ws.onopen = () => {
        console.log('[GatewayClient] WebSocket opened, waiting for challenge...');
        challengeTimer = setTimeout(() => {
          rejectOnce(new Error('Gateway connect challenge timeout'));
          ws.close();
        }, 10000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as Record<string, unknown>;
          console.log('[GatewayClient] WebSocket message:', message.type, message.event || message.id);
          
          if (message.type === 'event' && message.event === 'connect.challenge') {
            const nonce = (message.payload as { nonce?: string } | undefined)?.nonce;
            if (!nonce) {
              rejectOnce(new Error('Gateway connect.challenge missing nonce'));
              return;
            }
            console.log('[GatewayClient] Got challenge nonce, sending connect...');
            const connectFrame = {
              type: 'req',
              id: `connect-${Date.now()}`,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  displayName: 'ClawX',
                  version: '0.1.0',
                  platform: navigator.platform,
                  mode: 'ui',
                },
                auth: {
                  token: this.gatewayInfo?.token,
                },
                caps: [],
                role: 'operator',
                scopes: ['operator.admin'],
              },
            };
            console.log('[GatewayClient] Sending connect with token:', this.gatewayInfo?.token?.slice(0, 10) + '...');
            ws.send(JSON.stringify(connectFrame));
            return;
          }

          if (message.type === 'res' && typeof message.id === 'string') {
            if (String(message.id).startsWith('connect-')) {
              console.log('[GatewayClient] Connect response:', message);
              if ((message as any).error) {
                rejectOnce(new Error(`Connect failed: ${(message as any).error?.message || JSON.stringify((message as any).error)}`));
                return;
              }
              this.ws = ws;
              resolveOnce();
              return;
            }

            const pending = this.pendingRequests.get(message.id);
            if (!pending) {
              return;
            }
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(message.id);
            if (message.ok === false || message.error) {
              const errorMessage = typeof message.error === 'object' && message.error !== null
                ? String((message.error as { message?: string }).message || JSON.stringify(message.error))
                : String(message.error || 'Gateway request failed');
              pending.reject(new Error(errorMessage));
            } else {
              pending.resolve(message.payload);
            }
            return;
          }

          if (message.type === 'event' && typeof message.event === 'string') {
            this.emitEvent(message.event, message.payload);
            return;
          }

          if (typeof message.method === 'string') {
            this.emitEvent(message.method, message.params);
          }
        } catch (error) {
          rejectOnce(error instanceof Error ? error : new Error(String(error)));
        }
      };

      ws.onerror = () => {
        rejectOnce(new Error('Gateway WebSocket error'));
      };

      ws.onclose = () => {
        this.ws = null;
        if (!resolved) {
          rejectOnce(new Error('Gateway WebSocket closed before connect'));
          return;
        }
        for (const [, request] of this.pendingRequests) {
          clearTimeout(request.timeout);
          request.reject(new Error('Gateway connection closed'));
        }
        this.pendingRequests.clear();
        this.emitEvent('__close__', null);
      };
    });
  }

  private emitEvent(eventName: string, payload: unknown): void {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch {
        // ignore handler failures
      }
    }
  }
}

export const gatewayClient = new GatewayBrowserClient();
