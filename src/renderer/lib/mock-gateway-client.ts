// AxonClaw - Mock Gateway Client for Demo Mode
// 当真实 Gateway 不可用时使用

export interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const MOCK_RESPONSES = [
  "我已收到你的消息。作为 AxonClaw 的 AI 助手，我可以帮助你管理项目、分配任务给 Agent 团队。",
  "很好，让我分析一下这个需求。根据项目当前进度，我建议优先完成核心功能的开发。",
  "已将任务分配给 ZARA。预计 2 小时内完成初步实现。",
  "项目仪表板显示当前进度为 15%。建议加快 Agent 管理模块的开发。",
  "Channel 配置已完成。Telegram Bot 已连接，可以开始接收消息。",
];

export class MockGatewayClient {
  private isConnected = false;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private responseIndex = 0;

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
        console.error('[MockGateway] Handler error:', e);
      }
    });
  }

  connect(): void {
    console.log('[MockGateway] Simulating connection...');
    setTimeout(() => {
      this.isConnected = true;
      this.emit('connected');
    }, 500);
  }

  send(message: any): void {
    if (!this.isConnected) return;

    if (message.type === 'chat.message') {
      // 模拟 AI 响应
      setTimeout(() => {
        const response = MOCK_RESPONSES[this.responseIndex % MOCK_RESPONSES.length];
        this.responseIndex++;

        // 先发送 streaming 开始
        this.emit('chat.reply', {
          sessionKey: message.sessionKey,
          streaming: true,
          text: ''
        });

        // 模拟打字效果
        let currentText = '';
        const chars = response.split('');
        let i = 0;

        const typeInterval = setInterval(() => {
          if (i < chars.length) {
            currentText += chars[i];
            this.emit('chat.reply', {
              sessionKey: message.sessionKey,
              streaming: true,
              text: currentText
            });
            i++;
          } else {
            clearInterval(typeInterval);
            // 发送完成
            this.emit('chat.reply', {
              sessionKey: message.sessionKey,
              streaming: false,
              text: response
            });
          }
        }, 30);
      }, 300);
    }
  }

  sendChatMessage(sessionKey: string, text: string): void {
    this.send({ type: 'chat.message', sessionKey, text });
  }

  createSession(label: string, model: string): void {
    setTimeout(() => {
      this.emit('session:created', {
        sessionKey: `mock-session-${Date.now()}`,
        label,
        model
      });
    }, 100);
  }

  deleteSession(sessionKey: string): void {
    setTimeout(() => {
      this.emit('session:deleted', { sessionKey });
    }, 100);
  }

  disconnect(): void {
    this.isConnected = false;
    this.emit('disconnected');
  }

  getStatus(): boolean {
    return this.isConnected;
  }
}

export const mockGatewayClient = new MockGatewayClient();
