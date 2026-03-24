/**
 * WebSocket 工具技能
 * 
 * 功能:
 * 1. 客户端连接 - 支持自动重连、连接状态管理
 * 2. 消息发送/接收 - 支持订阅/取消订阅频道、消息类型处理
 * 3. 心跳保活 - 自动心跳、断线检测、重连机制
 * 
 * @module skills/websocket-utils
 */

import WebSocket from 'ws';

// ==================== 类型定义 ====================

/**
 * WebSocket 消息类型
 */
export type WSMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'system.welcome'
  | 'system.subscribed'
  | 'system.unsubscribed'
  | 'system.notify'
  | 'system.error'
  | 'task.update'
  | 'task.status'
  | 'agent.status'
  | 'agent.heartbeat'
  | string;

/**
 * WebSocket 消息结构
 */
export interface WSMessage {
  type: WSMessageType;
  data?: any;
  channelId?: string | string[];
  timestamp?: number;
  [key: string]: any;
}

/**
 * 连接配置
 */
export interface WSConfig {
  /** WebSocket 服务器 URL */
  url: string;
  /** 是否自动重连，默认 true */
  autoReconnect?: boolean;
  /** 重连延迟 (毫秒)，默认 3000 */
  reconnectDelay?: number;
  /** 心跳间隔 (毫秒)，默认 30000 */
  heartbeatInterval?: number;
  /** 连接超时 (毫秒)，默认 10000 */
  connectionTimeout?: number;
  /** 最大重连次数，默认 Infinity */
  maxReconnectAttempts?: number;
  /** 重连退避倍数，默认 1.5 */
  reconnectBackoffMultiplier?: number;
  /** 最大重连延迟 (毫秒)，默认 30000 */
  maxReconnectDelay?: number;
}

/**
 * 连接状态
 */
export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'
  | 'error';

/**
 * 事件处理器类型
 */
export type WSEventHandler = (data: any) => void;

/**
 * 事件映射
 */
export interface WSEventMap {
  'message': WSMessage;
  'connected': void;
  'disconnected': { code: number; reason: string };
  'error': Error;
  'stateChange': { from: WSConnectionState; to: WSConnectionState };
  'heartbeat': void;
  'reconnect': { attempt: number; delay: number };
}

// ==================== WebSocket 客户端类 ====================

/**
 * WebSocket 客户端
 * 
 * 提供完整的 WebSocket 连接管理，包括:
 * - 自动重连 (带指数退避)
 * - 心跳保活
 * - 频道订阅管理
 * - 事件系统
 * 
 * @example
 * ```typescript
 * const client = new WebSocketClient({
 *   url: 'ws://localhost:18792',
 *   heartbeatInterval: 30000,
 *   autoReconnect: true,
 * });
 * 
 * // 监听事件
 * client.on('connected', () => console.log('Connected!'));
 * client.on('message', (msg) => console.log('Message:', msg));
 * 
 * // 连接
 * await client.connect();
 * 
 * // 订阅频道
 * client.subscribe(['task.update', 'agent.status']);
 * 
 * // 发送消息
 * client.send({ type: 'custom.event', data: { foo: 'bar' } });
 * 
 * // 断开
 * client.disconnect();
 * ```
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WSConfig>;
  private state: WSConnectionState = 'disconnected';
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private eventHandlers: Map<keyof WSEventMap, Set<WSEventHandler>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: WSMessage[] = [];

  constructor(config: WSConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 3000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 10000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? Infinity,
      reconnectBackoffMultiplier: config.reconnectBackoffMultiplier ?? 1.5,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
    };
  }

  // ==================== 连接管理 ====================

  /**
   * 连接到 WebSocket 服务器
   * @returns Promise，连接成功时 resolve
   */
  public async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return this.connectionPromise || Promise.resolve();
    }

    this.setState('connecting');
    this.isManualClose = false;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        // 连接超时
        const timeoutId = setTimeout(() => {
          if (this.state === 'connecting') {
            this.ws?.terminate();
            this.handleConnectionError(new Error('Connection timeout'));
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.on('open', () => {
          clearTimeout(timeoutId);
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startHeartbeat();
          this.resubscribe();
          this.flushMessageQueue();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: WSMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeoutId);
          this.handleDisconnect(code, reason.toString());
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeoutId);
          this.handleConnectionError(error);
          if (this.state === 'connecting') {
            reject(error);
          }
        });

        this.ws.on('pong', () => {
          this.emit('heartbeat');
        });

      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
    this.subscriptions.clear();
    this.connectionPromise = null;
  }

  /**
   * 获取当前连接状态
   */
  public getState(): WSConnectionState {
    return this.state;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.state === 'connected';
  }

  // ==================== 消息处理 ====================

  /**
   * 发送消息
   * @param message - 要发送的消息
   */
  public send(message: WSMessage): void {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 如果未连接，加入消息队列
      this.messageQueue.push(messageWithTimestamp);
      console.warn('[WebSocket] Not connected, message queued:', message.type);
      return;
    }

    try {
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      this.messageQueue.push(messageWithTimestamp);
    }
  }

  /**
   * 订阅频道
   * @param channelId - 频道 ID (字符串或数组)
   */
  public subscribe(channelId: string | string[]): void {
    const channels = Array.isArray(channelId) ? channelId : [channelId];

    channels.forEach(channel => {
      this.subscriptions.add(channel);
    });

    this.send({
      type: 'subscribe',
      channelId: channels,
    });
  }

  /**
   * 取消订阅频道
   * @param channelId - 频道 ID (字符串或数组)
   */
  public unsubscribe(channelId: string | string[]): void {
    const channels = Array.isArray(channelId) ? channelId : [channelId];

    channels.forEach(channel => {
      this.subscriptions.delete(channel);
    });

    this.send({
      type: 'unsubscribe',
      channelId: channels,
    });
  }

  /**
   * 获取当前订阅的频道列表
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * 发送 Ping (心跳)
   */
  public ping(): void {
    this.send({ type: 'ping' });
  }

  // ==================== 事件系统 ====================

  /**
   * 注册事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  public on<K extends keyof WSEventMap>(
    event: K,
    handler: WSEventHandler
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * 注册一次性事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  public once<K extends keyof WSEventMap>(
    event: K,
    handler: WSEventHandler
  ): void {
    const unsubscribe = this.on(event, (data) => {
      handler(data);
      unsubscribe();
    });
  }

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param handler - 要移除的处理函数 (可选，不传则移除所有)
   */
  public off<K extends keyof WSEventMap>(
    event: K,
    handler?: WSEventHandler
  ): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      this.eventHandlers.set(event, new Set());
    }
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof WSEventMap>(
    event: K,
    data?: WSEventMap[K]
  ): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }

  // ==================== 内部方法 ====================

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSMessage): void {
    // 处理系统消息
    switch (message.type) {
      case 'pong':
        // 心跳响应，已在 'pong' 事件中处理
        break;

      case 'system.welcome':
        console.log('[WebSocket] Welcome message received');
        break;

      case 'system.subscribed':
        console.log('[WebSocket] Subscribed to channels:', message.data?.channels);
        break;

      case 'system.unsubscribed':
        console.log('[WebSocket] Unsubscribed from channels:', message.data?.channels);
        break;

      case 'system.error':
        console.error('[WebSocket] Server error:', message.data?.message);
        break;
    }

    // 触发通用 message 事件
    this.emit('message', message);
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(code: number, reason: string): void {
    this.stopHeartbeat();
    this.emit('disconnected', { code, reason });

    if (this.isManualClose) {
      this.setState('closed');
      console.log('[WebSocket] Disconnected by user');
    } else if (this.config.autoReconnect) {
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    this.emit('error', error);
    console.error('[WebSocket] Error:', error.message);
  }

  /**
   * 设置状态
   */
  private setState(newState: WSConnectionState): void {
    const oldState = this.state;
    if (oldState !== newState) {
      this.state = newState;
      this.emit('stateChange', { from: oldState, to: newState });
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached, giving up');
      this.setState('closed');
      return;
    }

    this.reconnectAttempts++;

    // 指数退避
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(
        this.config.reconnectBackoffMultiplier,
        this.reconnectAttempts - 1
      ),
      this.config.maxReconnectDelay
    );

    console.log(
      `[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`
    );

    this.emit('reconnect', { attempt: this.reconnectAttempts, delay });
    this.setState('reconnecting');

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 重新订阅之前的频道
   */
  private resubscribe(): void {
    if (this.subscriptions.size > 0) {
      this.subscribe(Array.from(this.subscriptions));
    }
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}

// ==================== 便捷工厂函数 ====================

/**
 * 创建并连接 WebSocket 客户端
 * 
 * @param url - WebSocket 服务器 URL
 * @param options - 可选配置
 * @returns 已连接的 WebSocketClient 实例
 * 
 * @example
 * ```typescript
 * const client = await createWebSocket('ws://localhost:18792', {
 *   heartbeatInterval: 30000,
 * });
 * 
 * client.on('message', (msg) => console.log(msg));
 * ```
 */
export async function createWebSocket(
  url: string,
  options?: Partial<WSConfig>
): Promise<WebSocketClient> {
  const client = new WebSocketClient({ url, ...options });
  await client.connect();
  return client;
}

/**
 * 创建 WebSocket 客户端 (不自动连接)
 * 
 * @param url - WebSocket 服务器 URL
 * @param options - 可选配置
 * @returns WebSocketClient 实例
 * 
 * @example
 * ```typescript
 * const client = buildWebSocket('ws://localhost:18792');
 * // ... 配置事件处理器
 * await client.connect();
 * ```
 */
export function buildWebSocket(
  url: string,
  options?: Partial<WSConfig>
): WebSocketClient {
  return new WebSocketClient({ url, ...options });
}

// ==================== 导出 ====================

export const WebSocketUtils = {
  WebSocketClient,
  createWebSocket,
  buildWebSocket,
};

export default WebSocketUtils;
