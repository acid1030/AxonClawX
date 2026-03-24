/**
 * Mediator Pattern Skill - KAEL
 * 
 * 功能:
 * 1. 中介者定义 - 集中控制对象间交互
 * 2. 同事类通信 - 通过中介者进行消息传递
 * 3. 解耦协作 - 降低对象间耦合度
 * 
 * 设计模式：中介者模式 (Mediator Pattern)
 * 适用场景：
 * - 多个对象相互通信，形成复杂网状结构
 * - 对象间依赖关系复杂，难以复用
 * - 需要集中控制交互逻辑
 */

// ==================== 类型定义 ====================

/**
 * 中介者接口
 */
export interface Mediator {
  notify(sender: Colleague, event: string, data?: any): void;
  register(colleague: Colleague): void;
  remove(colleague: Colleague): void;
}

/**
 * 同事类基类接口
 */
export interface Colleague {
  id: string;
  name: string;
  setMediator(mediator: Mediator): void;
  send(event: string, data?: any): void;
  receive(event: string, data?: any): void;
}

/**
 * 消息接口
 */
export interface Message {
  id: string;
  from: string;
  to?: string;
  event: string;
  data?: any;
  timestamp: number;
}

/**
 * 中介者配置
 */
export interface MediatorConfig {
  maxMessageHistory?: number;
  enableLogging?: boolean;
  broadcastByDefault?: boolean;
}

// ==================== 具体中介者 ====================

export class ConcreteMediator implements Mediator {
  private colleagues: Map<string, Colleague>;
  private messageHistory: Message[];
  private config: MediatorConfig;
  private messageCounter: number;

  constructor(config: MediatorConfig = {}) {
    this.colleagues = new Map();
    this.messageHistory = [];
    this.messageCounter = 0;
    this.config = {
      maxMessageHistory: 100,
      enableLogging: false,
      broadcastByDefault: true,
      ...config,
    };
  }

  /**
   * 注册同事对象
   */
  register(colleague: Colleague): void {
    if (!this.colleagues.has(colleague.id)) {
      this.colleagues.set(colleague.id, colleague);
      colleague.setMediator(this);
      this.log(`[Mediator] Registered colleague: ${colleague.name} (${colleague.id})`);
    }
  }

  /**
   * 移除同事对象
   */
  remove(colleague: Colleague): void {
    if (this.colleagues.delete(colleague.id)) {
      this.log(`[Mediator] Removed colleague: ${colleague.name} (${colleague.id})`);
    }
  }

  /**
   * 通知中介者 (同事类调用此方法发送消息)
   */
  notify(sender: Colleague, event: string, data?: any): void {
    const message: Message = {
      id: `msg_${++this.messageCounter}`,
      from: sender.id,
      event,
      data,
      timestamp: Date.now(),
    };

    this.log(`[Mediator] Message from ${sender.name}: ${event}`, data);

    // 存储消息历史
    this.messageHistory.push(message);
    if (this.messageHistory.length > (this.config.maxMessageHistory || 100)) {
      this.messageHistory.shift();
    }

    // 广播给所有其他同事
    if (this.config.broadcastByDefault) {
      this.broadcast(sender, event, data);
    }
  }

  /**
   * 广播消息给所有同事 (除了发送者)
   */
  broadcast(sender: Colleague, event: string, data?: any): void {
    this.colleagues.forEach((colleague) => {
      if (colleague !== sender) {
        colleague.receive(event, data);
      }
    });
  }

  /**
   * 发送消息给特定同事
   */
  sendTo(targetId: string, sender: Colleague, event: string, data?: any): boolean {
    const target = this.colleagues.get(targetId);
    if (!target) {
      this.log(`[Mediator] Target not found: ${targetId}`);
      return false;
    }
    target.receive(event, data);
    return true;
  }

  /**
   * 获取所有注册的同事
   */
  getColleagues(): Colleague[] {
    return Array.from(this.colleagues.values());
  }

  /**
   * 获取同事数量
   */
  getColleagueCount(): number {
    return this.colleagues.size;
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(limit?: number): Message[] {
    if (limit) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * 清空消息历史
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 获取中介者状态
   */
  getStatus(): {
    colleagueCount: number;
    messageCount: number;
    colleagues: string[];
  } {
    return {
      colleagueCount: this.colleagues.size,
      messageCount: this.messageHistory.length,
      colleagues: Array.from(this.colleagues.values()).map((c) => c.name),
    };
  }

  /**
   * 日志记录
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(message, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

// ==================== 具体同事类 ====================

/**
 * 基础同事类实现
 */
export abstract class BaseColleague implements Colleague {
  readonly id: string;
  readonly name: string;
  protected mediator?: Mediator;
  protected receivedMessages: Message[];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.receivedMessages = [];
  }

  setMediator(mediator: Mediator): void {
    this.mediator = mediator;
  }

  /**
   * 发送消息 (通过中介者)
   */
  send(event: string, data?: any): void {
    if (this.mediator) {
      this.mediator.notify(this, event, data);
    } else {
      console.warn(`[Colleague] ${this.name} has no mediator`);
    }
  }

  /**
   * 接收消息
   */
  receive(event: string, data?: any): void {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: 'unknown',
      event,
      data,
      timestamp: Date.now(),
    };
    this.receivedMessages.push(message);
    this.onReceive(event, data);
  }

  /**
   * 获取接收的消息历史
   */
  getReceivedMessages(limit?: number): Message[] {
    if (limit) {
      return this.receivedMessages.slice(-limit);
    }
    return [...this.receivedMessages];
  }

  /**
   * 清空接收的消息
   */
  clearReceivedMessages(): void {
    this.receivedMessages = [];
  }

  /**
   * 子类实现此方法处理接收的消息
   */
  protected abstract onReceive(event: string, data?: any): void;

  /**
   * 获取同事状态
   */
  getStatus(): {
    id: string;
    name: string;
    messageCount: number;
    hasMediator: boolean;
  } {
    return {
      id: this.id,
      name: this.name,
      messageCount: this.receivedMessages.length,
      hasMediator: !!this.mediator,
    };
  }
}

// ==================== 预定义同事类示例 ====================

/**
 * 聊天室用户 - 示例实现
 */
export class ChatUser extends BaseColleague {
  private messageHandler?: (event: string, data?: any) => void;

  constructor(id: string, name: string) {
    super(id, name);
  }

  setMessageHandler(handler: (event: string, data?: any) => void): void {
    this.messageHandler = handler;
  }

  protected onReceive(event: string, data?: any): void {
    if (this.messageHandler) {
      this.messageHandler(event, data);
    }
  }

  /**
   * 发送聊天消息
   */
  sendMessage(content: string): void {
    this.send('chat_message', { content, from: this.name });
  }

  /**
   * 发送私聊消息
   */
  sendPrivateMessage(targetId: string, content: string): void {
    if (this.mediator instanceof ConcreteMediator) {
      this.mediator.sendTo(targetId, this, 'private_message', {
        content,
        from: this.name,
      });
    }
  }
}

/**
 * 模块组件 - 示例实现
 */
export class ModuleComponent extends BaseColleague {
  private state: Record<string, any>;

  constructor(id: string, name: string, initialState: Record<string, any> = {}) {
    super(id, name);
    this.state = initialState;
  }

  protected onReceive(event: string, data?: any): void {
    switch (event) {
      case 'state_update':
        if (data?.key && data.value !== undefined) {
          this.state[data.key] = data.value;
        }
        break;
      case 'refresh':
        this.state = { ...this.state, ...data };
        break;
      default:
        break;
    }
  }

  updateState(key: string, value: any): void {
    this.state[key] = value;
    this.send('state_update', { key, value, from: this.name });
  }

  getState(): Record<string, any> {
    return { ...this.state };
  }

  requestRefresh(): void {
    this.send('refresh_request', { from: this.name });
  }
}

// ==================== 工具函数 ====================

/**
 * 创建中介者实例
 */
export function createMediator(config?: MediatorConfig): ConcreteMediator {
  return new ConcreteMediator(config);
}

/**
 * 创建聊天用户
 */
export function createChatUser(id: string, name: string): ChatUser {
  return new ChatUser(id, name);
}

/**
 * 创建模块组件
 */
export function createModuleComponent(
  id: string,
  name: string,
  initialState?: Record<string, any>
): ModuleComponent {
  return new ModuleComponent(id, name, initialState);
}

/**
 * 快速设置聊天室
 */
export function setupChatRoom(
  userIds: string[],
  config?: MediatorConfig
): { mediator: ConcreteMediator; users: ChatUser[] } {
  const mediator = createMediator({ ...config, enableLogging: true });
  const users = userIds.map((id) => {
    const user = createChatUser(id, `User_${id}`);
    mediator.register(user);
    return user;
  });
  return { mediator, users };
}

// ==================== 导出 ====================

export default ConcreteMediator;
