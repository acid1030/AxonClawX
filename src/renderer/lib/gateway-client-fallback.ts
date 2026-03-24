// AxonClaw - Gateway Client with Fallback
// 优先连接真实 Gateway，失败时自动切换到 Mock 模式

import { GatewayClient, gatewayClient } from './gateway-client';
import { MockGatewayClient, mockGatewayClient } from './mock-gateway-client';

export type GatewayMode = 'real' | 'mock' | 'auto';

class GatewayClientWithFallback {
  private realClient: GatewayClient;
  private mockClient: MockGatewayClient;
  private currentClient: GatewayClient | MockGatewayClient;
  private mode: GatewayMode;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.realClient = gatewayClient;
    this.mockClient = mockGatewayClient;
    this.mode = 'auto';
    this.currentClient = this.realClient;

    // 代理真实客户端事件
    this.realClient.on('connected', () => {
      this.emit('connected');
      this.emit('mode:changed', { mode: 'real' });
    });

    this.realClient.on('disconnected', () => {
      if (this.mode === 'auto') {
        this.switchToMock();
      }
      this.emit('disconnected');
    });

    this.realClient.on('chat.reply', (data) => this.emit('chat.reply', data));
    this.realClient.on('error', () => {
      if (this.mode === 'auto') {
        this.switchToMock();
      }
    });

    // 代理 Mock 客户端事件
    this.mockClient.on('connected', () => {
      this.emit('connected');
      this.emit('mode:changed', { mode: 'mock' });
    });

    this.mockClient.on('chat.reply', (data) => this.emit('chat.reply', data));
  }

  private switchToMock(): void {
    console.log('[Gateway] Switching to mock mode...');
    this.currentClient = this.mockClient;
    this.mockClient.connect();
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  private emit(event: string, data?: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error('[Gateway] Handler error:', e);
      }
    });
  }

  connect(): void {
    if (this.mode === 'mock') {
      this.mockClient.connect();
    } else {
      // 先尝试真实连接
      this.realClient.connect();

      // 3秒后如果还没连上，切换到 mock
      setTimeout(() => {
        if (!this.realClient.getStatus() && this.mode === 'auto') {
          console.log('[Gateway] Real gateway not available, using mock');
          this.switchToMock();
        }
      }, 3000);
    }
  }

  send(message: any): void {
    this.currentClient.send(message);
  }

  sendChatMessage(sessionKey: string, text: string): void {
    this.currentClient.sendChatMessage(sessionKey, text);
  }

  createSession(label: string, model: string): void {
    this.currentClient.createSession?.(label, model);
  }

  deleteSession(sessionKey: string): void {
    this.currentClient.deleteSession?.(sessionKey);
  }

  disconnect(): void {
    this.currentClient.disconnect();
  }

  getStatus(): boolean {
    return this.currentClient.getStatus();
  }

  getMode(): 'real' | 'mock' {
    return this.currentClient === this.mockClient ? 'mock' : 'real';
  }
}

export const gatewayClientWithFallback = new GatewayClientWithFallback();
