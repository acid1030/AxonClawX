/**
 * OpenClaw Gateway Service
 * 
 * 提供与 OpenClaw Gateway 的真实 HTTP + WebSocket 通信
 */

export interface GatewayConfig {
  httpUrl: string;
  wsUrl: string;
  token?: string;
}

export interface Session {
  id: string;
  key: string;
  label?: string;
  agentId?: string;
  status: 'active' | 'idle' | 'busy';
  createdAt: number;
  lastActivity?: number;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface Task {
  id: string;
  agentId: string;
  action: string;
  params: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class GatewayService {
  private static instance: GatewayService;
  private config: GatewayConfig;
  private ws: WebSocket | null = null;
  private wsConnected: boolean = false;
  private messageHandlers: Set<(msg: any) => void> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor(config: GatewayConfig) {
    this.config = config;
  }

  static getInstance(config?: Partial<GatewayConfig>): GatewayService {
    if (!GatewayService.instance) {
      // 从 localStorage 读取 token
      const savedToken = localStorage.getItem('gateway_token');
      GatewayService.instance = new GatewayService({
        httpUrl: config?.httpUrl || 'http://127.0.0.1:18791',
        wsUrl: config?.wsUrl || 'ws://127.0.0.1:18792',
        token: config?.token || savedToken || undefined,
      });
    }
    return GatewayService.instance;
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.wsConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // 构建带 Token 的 WebSocket URL
        const wsUrl = this.config.token
          ? `${this.config.wsUrl}?token=${encodeURIComponent(this.config.token)}`
          : this.config.wsUrl;
        
        console.log('[Gateway] Connecting to:', wsUrl.replace(this.config.token || '', '[TOKEN]'));
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Gateway] WebSocket connected');
          this.wsConnected = true;
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('[Gateway] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[Gateway] WebSocket closed, reconnecting...');
          this.wsConnected = false;
          this.scheduleReconnect();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('[Gateway] Failed to parse message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConnected = false;
  }

  /**
   * 安排重连
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(console.error);
    }, 3000);
  }

  /**
   * 监听消息
   */
  onMessage(handler: (msg: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * 发送消息
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Gateway] WebSocket not connected, message queued');
    }
  }

  /**
   * HTTP GET 请求
   */
  private async get(path: string): Promise<any> {
    const response = await fetch(`${this.config.httpUrl}${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * HTTP POST 请求
   */
  private async post(path: string, data: any): Promise<any> {
    const response = await fetch(`${this.config.httpUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    return response.json();
  }

  // ============ 公开 API ============

  /**
   * 获取所有会话
   */
  async listSessions(): Promise<Session[]> {
    try {
      const result = await this.get('/sessions/list');
      return result.sessions || result || [];
    } catch (error) {
      console.error('[Gateway] Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * 获取会话历史
   */
  async getSessionHistory(sessionKey: string, limit: number = 50): Promise<Message[]> {
    try {
      const result = await this.get(`/sessions/history?sessionKey=${sessionKey}&limit=${limit}`);
      return result.messages || [];
    } catch (error) {
      console.error('[Gateway] Failed to get session history:', error);
      return [];
    }
  }

  /**
   * 发送消息到会话
   */
  async sendMessage(sessionKey: string, message: string): Promise<void> {
    try {
      await this.post('/sessions/send', {
        sessionKey,
        message,
      });
    } catch (error) {
      console.error('[Gateway] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * 创建会话
   */
  async createSession(label?: string): Promise<Session> {
    try {
      const result = await this.post('/sessions/spawn', {
        task: '初始化会话',
        label,
        mode: 'session',
      });
      return result;
    } catch (error) {
      console.error('[Gateway] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * 执行任务
   */
  async executeTask(agentId: string, action: string, params: any): Promise<Task> {
    try {
      const result = await this.post('/tasks/execute', {
        agentId,
        action,
        params,
      });
      return result;
    } catch (error) {
      console.error('[Gateway] Failed to execute task:', error);
      throw error;
    }
  }

  /**
   * 获取系统状态
   */
  async getStatus(): Promise<any> {
    try {
      return await this.get('/status');
    } catch (error) {
      console.error('[Gateway] Failed to get status:', error);
      return null;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.wsConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// 导出单例
export const gateway = GatewayService.getInstance();
