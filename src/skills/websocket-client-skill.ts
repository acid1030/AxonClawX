/**
 * WebSocket 客户端技能 - WebSocket Client Skill
 * 
 * ARIA WebSocket 连接管理技能
 * 
 * 功能:
 * 1. 自动重连 (指数退避策略)
 * 2. 心跳检测 (Ping/Pong 机制)
 * 3. 消息队列 (离线消息缓存 + 重放)
 * 
 * @author Axon
 * @version 1.0.0
 * @created 2026-03-13
 */

import * as WebSocket from 'ws';

// ============== 类型定义 ==============

/**
 * WebSocket 连接状态
 */
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * 消息类型
 */
export interface WSMessage {
  type: string;
  data?: any;
  timestamp?: number;
  id?: string;
}

/**
 * 消息队列项
 */
interface QueuedMessage {
  id: string;
  message: WSMessage;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * 配置选项
 */
export interface WebSocketClientConfig {
  /** WebSocket 服务器 URL */
  url: string;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 初始重连延迟 (ms) */
  reconnectDelay?: number;
  /** 最大重连延迟 (ms) */
  maxReconnectDelay?: number;
  /** 重连延迟倍增系数 */
  reconnectMultiplier?: number;
  /** 最大重连次数 (0 = 无限) */
  maxReconnectAttempts?: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval?: number;
  /** 心跳超时时间 (ms) */
  heartbeatTimeout?: number;
  /** 消息队列最大容量 */
  maxQueueSize?: number;
  /** 离线消息是否入队 */
  queueOfflineMessages?: boolean;
  /** 连接建立后是否立即重放队列消息 */
  replayOnConnect?: boolean;
  /** 自定义协议处理器 */
  customHandlers?: Record<string, (data: any) => void>;
}

/**
 * 事件处理器类型
 */
export type WSEventHandler = (data: any) => void;

/**
 * 事件映射
 */
export interface WSEventMap {
  open: () => void;
  close: (code: number, reason: string) => void;
  error: (error: Error) => void;
  message: (message: WSMessage) => void;
  stateChange: (state: WebSocketState) => void;
  reconnect: (attempt: number, delay: number) => void;
  heartbeat: () => void;
  heartbeatTimeout: () => void;
}

/**
 * 客户端统计信息
 */
export interface ClientStats {
  /** 连接次数 */
  connectionCount: number;
  /** 重连次数 */
  reconnectCount: number;
  /** 发送消息数 */
  messagesSent: number;
  /** 接收消息数 */
  messagesReceived: number;
  /** 队列消息数 */
  queuedMessages: number;
  /** 心跳次数 */
  heartbeatCount: number;
  /** 心跳超时次数 */
  heartbeatTimeoutCount: number;
  /** 当前状态 */
  currentState: WebSocketState;
  /** 正常运行时间 (ms) */
  uptime: number;
}

// ============== WebSocket 客户端类 ==============

/**
 * ARIA WebSocket 客户端
 * 
 * 提供可靠的 WebSocket 连接管理，包括自动重连、心跳检测和消息队列
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketClientConfig>;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private eventHandlers: Map<keyof WSEventMap, Set<WSEventHandler>> = new Map();
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private stats: ClientStats = {
    connectionCount: 0,
    reconnectCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    queuedMessages: 0,
    heartbeatCount: 0,
    heartbeatTimeoutCount: 0,
    currentState: WebSocketState.DISCONNECTED,
    uptime: 0,
  };
  private connectionStartTime: number = 0;
  private isManualClose = false;

  constructor(config: WebSocketClientConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectMultiplier: config.reconnectMultiplier ?? 2,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 0,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 10000,
      maxQueueSize: config.maxQueueSize ?? 1000,
      queueOfflineMessages: config.queueOfflineMessages ?? true,
      replayOnConnect: config.replayOnConnect ?? true,
      customHandlers: config.customHandlers ?? {},
    };

    this.initEventHandlers();
  }

  /**
   * 初始化事件处理器
   */
  private initEventHandlers(): void {
    const events: (keyof WSEventMap)[] = ['open', 'close', 'error', 'message', 'stateChange', 'reconnect', 'heartbeat', 'heartbeatTimeout'];
    events.forEach(event => {
      this.eventHandlers.set(event, new Set());
    });
  }

  /**
   * 注册事件监听器
   */
  public on<K extends keyof WSEventMap>(event: K, handler: WSEventMap[K]): this {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler as WSEventHandler);
    }
    return this;
  }

  /**
   * 移除事件监听器
   */
  public off<K extends keyof WSEventMap>(event: K, handler: WSEventMap[K]): this {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as WSEventHandler);
    }
    return this;
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof WSEventMap>(event: K, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => (handler as any)(...args));
    }
  }

  /**
   * 连接到 WebSocket 服务器
   */
  public connect(): this {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return this;
    }

    this.setState(WebSocketState.CONNECTING);
    this.connectionStartTime = Date.now();

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.on('open', this.handleOpen.bind(this));
      this.ws.on('message', this.handleMessage.bind(this));
      this.ws.on('close', this.handleClose.bind(this));
      this.ws.on('error', this.handleError.bind(this));
      this.ws.on('pong', this.handlePong.bind(this));
    } catch (error) {
      this.handleError(error as Error);
    }

    return this;
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    this.setState(WebSocketState.CONNECTED);
    this.stats.connectionCount++;
    this.reconnectAttempt = 0;
    this.isManualClose = false;

    this.emit('open');

    // 启动心跳
    this.startHeartbeat();

    // 重放队列消息
    if (this.config.replayOnConnect && this.messageQueue.length > 0) {
      this.replayQueuedMessages();
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: Buffer): void {
    this.stats.messagesReceived++;

    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      // 处理心跳响应
      if (message.type === 'pong') {
        return;
      }

      // 调用自定义处理器
      if (this.config.customHandlers[message.type]) {
        this.config.customHandlers[message.type](message.data);
      }

      this.emit('message', message);
    } catch (error) {
      console.error('[WebSocketClient] Failed to parse message:', error);
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(code: number, reason: Buffer): void {
    const reasonStr = reason.toString();
    this.setState(WebSocketState.DISCONNECTED);
    this.stopHeartbeat();

    this.emit('close', code, reasonStr);

    // 自动重连
    if (!this.isManualClose && this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    this.emit('error', error);
  }

  /**
   * 处理 Pong (心跳响应)
   */
  private handlePong(): void {
    this.stats.heartbeatCount++;
    
    // 清除心跳超时计时器
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    this.emit('heartbeat');
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    const sendPing = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' }, false);
        
        // 设置心跳超时
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.stats.heartbeatTimeoutCount++;
          this.emit('heartbeatTimeout');
          
          // 心跳超时后断开重连
          if (this.ws) {
            this.ws.terminate();
          }
        }, this.config.heartbeatTimeout);
      }
    };

    // 立即发送一次
    sendPing();
    
    // 定期发送
    this.heartbeatTimer = setInterval(sendPing, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 检查重连次数限制
    if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      console.error('[WebSocketClient] Max reconnect attempts reached');
      return;
    }

    // 计算延迟 (指数退避)
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.reconnectMultiplier, this.reconnectAttempt),
      this.config.maxReconnectDelay
    );

    this.reconnectAttempt++;
    this.stats.reconnectCount++;
    this.setState(WebSocketState.RECONNECTING);

    this.emit('reconnect', this.reconnectAttempt, delay);

    console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * 发送消息
   */
  public send(message: WSMessage, queueIfOffline: boolean = true): boolean {
    const messageWithMeta = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
      id: message.id ?? this.generateMessageId(),
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageWithMeta));
        this.stats.messagesSent++;
        return true;
      } catch (error) {
        console.error('[WebSocketClient] Send error:', error);
      }
    }

    // 离线时入队
    if (queueIfOffline && this.config.queueOfflineMessages) {
      this.enqueueMessage(messageWithMeta);
    }

    return false;
  }

  /**
   * 将消息加入队列
   */
  private enqueueMessage(message: WSMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // 队列已满，移除最旧的消息
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      id: message.id!,
      message,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    this.stats.queuedMessages = this.messageQueue.length;
  }

  /**
   * 重放队列中的消息
   */
  private replayQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[WebSocketClient] Replaying ${this.messageQueue.length} queued messages...`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(item => {
      if (item.retryCount < item.maxRetries) {
        if (!this.send(item.message, true)) {
          // 发送失败，重新入队
          item.retryCount++;
          this.messageQueue.push(item);
        }
      }
    });

    this.stats.queuedMessages = this.messageQueue.length;
  }

  /**
   * 手动断开连接
   */
  public disconnect(): this {
    this.isManualClose = true;

    // 清除重连计时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 停止心跳
    this.stopHeartbeat();

    // 关闭 WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);

    return this;
  }

  /**
   * 设置状态
   */
  private setState(state: WebSocketState): void {
    const oldState = this.state;
    this.state = state;
    this.stats.currentState = state;

    if (oldState !== state) {
      this.emit('stateChange', state);
    }

    // 更新正常运行时间
    if (state === WebSocketState.CONNECTED) {
      this.connectionStartTime = Date.now();
    }
  }

  /**
   * 获取当前状态
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  /**
   * 获取队列中的消息数量
   */
  public getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * 清空消息队列
   */
  public clearQueue(): this {
    this.messageQueue = [];
    this.stats.queuedMessages = 0;
    return this;
  }

  /**
   * 获取统计信息
   */
  public getStats(): ClientStats {
    const now = Date.now();
    return {
      ...this.stats,
      uptime: this.state === WebSocketState.CONNECTED ? now - this.connectionStartTime : 0,
    };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): this {
    this.stats = {
      connectionCount: 0,
      reconnectCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      queuedMessages: 0,
      heartbeatCount: 0,
      heartbeatTimeoutCount: 0,
      currentState: this.state,
      uptime: 0,
    };
    return this;
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============== 工厂函数 ==============

/**
 * 创建 WebSocket 客户端实例
 */
export function createWebSocketClient(config: WebSocketClientConfig): WebSocketClient {
  return new WebSocketClient(config);
}

// ============== 默认导出 ==============

export default WebSocketClient;
