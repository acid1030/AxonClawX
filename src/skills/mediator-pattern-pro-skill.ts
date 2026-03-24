/**
 * 中介者模式专业工具 - Mediator Pattern Pro Skill
 * 
 * 功能:
 * 1. 中介者定义 - 统一接口与抽象基类
 * 2. 消息路由 - 智能消息分发与过滤
 * 3. 解耦通信 - 同事类间零依赖通信
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** 广播消息 */
  BROADCAST = 'broadcast',
  /** 点对点消息 */
  UNICAST = 'unicast',
  /** 请求 - 响应消息 */
  REQUEST_RESPONSE = 'request_response',
  /** 事件通知 */
  EVENT = 'event',
  /** 命令消息 */
  COMMAND = 'command'
}

/**
 * 消息优先级
 */
export enum MessagePriority {
  /** 低优先级 */
  LOW = 0,
  /** 普通优先级 */
  NORMAL = 1,
  /** 高优先级 */
  HIGH = 2,
  /** 紧急优先级 */
  URGENT = 3
}

/**
 * 消息接口
 */
export interface Message<T = any> {
  /** 消息 ID (UUID) */
  id: string;
  /** 消息类型 */
  type: MessageType;
  /** 发送者 ID */
  senderId: string;
  /** 接收者 ID (广播时为 null) */
  receiverId: string | null;
  /** 消息主题/频道 */
  topic: string;
  /** 消息负载 */
  payload: T;
  /** 优先级 */
  priority: MessagePriority;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 消息处理器接口
 */
export interface MessageHandler<T = any> {
  /** 处理消息 */
  handle(message: Message<T>): Promise<void> | void;
}

/**
 * 消息过滤器接口
 */
export interface MessageFilter {
  /** 过滤消息 */
  filter(message: Message): boolean;
}

/**
 * 同事类接口
 */
export interface Colleague {
  /** 同事 ID */
  id: string;
  /** 发送消息 */
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void;
  /** 接收消息 */
  receive<T>(message: Message<T>): Promise<void> | void;
  /** 设置中介者 */
  setMediator(mediator: Mediator): void;
}

/**
 * 中介者接口
 */
export interface Mediator {
  /** 注册同事 */
  register(colleague: Colleague): void;
  /** 注销同事 */
  unregister(colleagueId: string): void;
  /** 发送消息 */
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void;
  /** 广播消息 */
  broadcast<T>(topic: string, payload: T, senderId: string): void;
  /** 点对点发送 */
  sendTo<T>(receiverId: string, payload: T, senderId: string, topic?: string): void;
  /** 请求 - 响应 */
  request<T, R>(receiverId: string, payload: T, senderId: string, timeout?: number): Promise<R>;
  /** 添加消息处理器 */
  addHandler(topic: string, handler: MessageHandler): void;
  /** 移除消息处理器 */
  removeHandler(topic: string, handler: MessageHandler): void;
  /** 添加消息过滤器 */
  addFilter(filter: MessageFilter): void;
  /** 移除消息过滤器 */
  removeFilter(filter: MessageFilter): void;
  /** 获取注册的所有同事 */
  getColleagues(): Colleague[];
  /** 获取同事数量 */
  getColleagueCount(): number;
  /** 获取消息历史 */
  getMessageHistory(limit?: number): Message[];
  /** 清空消息历史 */
  clearHistory(): void;
}

/**
 * 中介者配置
 */
export interface MediatorConfig {
  /** 是否启用消息历史 */
  enableHistory: boolean;
  /** 消息历史最大长度 */
  maxHistorySize: number;
  /** 是否启用日志 */
  enableLogging: boolean;
  /** 默认请求超时 (毫秒) */
  defaultRequestTimeout: number;
  /** 是否异步处理消息 */
  asyncProcessing: boolean;
}

/**
 * 请求 - 响应包装器
 */
export interface RequestResponse<T> {
  /** 请求消息 */
  request: Message<T>;
  /** 响应数据 */
  response?: any;
  /** 是否完成 */
  completed: boolean;
  /** 错误信息 */
  error?: Error;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: MediatorConfig = {
  enableHistory: true,
  maxHistorySize: 1000,
  enableLogging: false,
  defaultRequestTimeout: 5000,
  asyncProcessing: true
};

// ============== 工具函数 ==============

/**
 * 生成 UUID
 * @returns UUID 字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 创建消息对象
 * @param message 消息参数 (不含 id 和 timestamp)
 * @returns 完整的消息对象
 */
export function createMessage<T>(
  message: Omit<Message<T>, 'id' | 'timestamp'>
): Message<T> {
  return {
    ...message,
    id: generateUUID(),
    timestamp: Date.now()
  };
}

/**
 * 日志输出 (可配置)
 * @param enabled 是否启用日志
 * @param level 日志级别
 * @param message 日志消息
 * @param data 附加数据
 */
export function log(
  enabled: boolean,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void {
  if (!enabled) return;
  
  const prefix = `[Mediator:${level.toUpperCase()}]`;
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case 'info':
      console.log(`${prefix} ${timestamp} - ${message}`, data ?? '');
      break;
    case 'warn':
      console.warn(`${prefix} ${timestamp} - ${message}`, data ?? '');
      break;
    case 'error':
      console.error(`${prefix} ${timestamp} - ${message}`, data ?? '');
      break;
  }
}

// ============== 中介者实现 ==============

/**
 * 具体中介者类
 * 
 * 核心功能:
 * - 同事注册/注销管理
 * - 消息路由与分发
 * - 消息过滤与处理
 * - 请求 - 响应模式支持
 * - 消息历史追踪
 */
export class ConcreteMediator implements Mediator {
  /** 注册的同事映射 */
  private colleagues: Map<string, Colleague> = new Map();
  
  /** 消息处理器映射 (topic -> handlers) */
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  
  /** 消息过滤器列表 */
  private filters: MessageFilter[] = [];
  
  /** 消息历史 */
  private history: Message[] = [];
  
  /** 配置 */
  private config: MediatorConfig;
  
  /** 待处理的请求 */
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(config: Partial<MediatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 注册同事
   * @param colleague 同事对象
   */
  register(colleague: Colleague): void {
    if (this.colleagues.has(colleague.id)) {
      log(this.config.enableLogging, 'warn', `Colleague ${colleague.id} already registered`);
      return;
    }
    
    colleague.setMediator(this);
    this.colleagues.set(colleague.id, colleague);
    log(this.config.enableLogging, 'info', `Colleague ${colleague.id} registered`, {
      totalColleagues: this.colleagues.size
    });
  }

  /**
   * 注销同事
   * @param colleagueId 同事 ID
   */
  unregister(colleagueId: string): void {
    const removed = this.colleagues.delete(colleagueId);
    if (removed) {
      log(this.config.enableLogging, 'info', `Colleague ${colleagueId} unregistered`, {
        totalColleagues: this.colleagues.size
      });
    } else {
      log(this.config.enableLogging, 'warn', `Colleague ${colleagueId} not found`);
    }
  }

  /**
   * 发送消息
   * @param message 消息参数 (不含 id 和 timestamp)
   */
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void {
    const fullMessage = createMessage(message);
    
    // 应用过滤器
    if (!this.applyFilters(fullMessage)) {
      log(this.config.enableLogging, 'info', 'Message filtered out', { messageId: fullMessage.id });
      return;
    }
    
    // 记录历史
    this.recordHistory(fullMessage);
    
    // 根据消息类型路由
    switch (message.type) {
      case MessageType.BROADCAST:
        this.handleBroadcast(fullMessage);
        break;
      case MessageType.UNICAST:
        this.handleUnicast(fullMessage);
        break;
      case MessageType.REQUEST_RESPONSE:
        this.handleRequestResponse(fullMessage);
        break;
      case MessageType.EVENT:
        this.handleEvent(fullMessage);
        break;
      case MessageType.COMMAND:
        this.handleCommand(fullMessage);
        break;
    }
  }

  /**
   * 广播消息
   * @param topic 主题
   * @param payload 负载
   * @param senderId 发送者 ID
   */
  broadcast<T>(topic: string, payload: T, senderId: string): void {
    this.send({
      type: MessageType.BROADCAST,
      senderId,
      receiverId: null,
      topic,
      payload,
      priority: MessagePriority.NORMAL
    });
  }

  /**
   * 点对点发送
   * @param receiverId 接收者 ID
   * @param payload 负载
   * @param senderId 发送者 ID
   * @param topic 主题 (可选)
   */
  sendTo<T>(receiverId: string, payload: T, senderId: string, topic: string = 'default'): void {
    if (!this.colleagues.has(receiverId)) {
      log(this.config.enableLogging, 'error', `Receiver ${receiverId} not found`);
      return;
    }
    
    this.send({
      type: MessageType.UNICAST,
      senderId,
      receiverId,
      topic,
      payload,
      priority: MessagePriority.NORMAL
    });
  }

  /**
   * 请求 - 响应
   * @param receiverId 接收者 ID
   * @param payload 请求负载
   * @param senderId 发送者 ID
   * @param timeout 超时时间 (毫秒)
   * @returns 响应 Promise
   */
  async request<T, R>(
    receiverId: string,
    payload: T,
    senderId: string,
    timeout: number = this.config.defaultRequestTimeout
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.colleagues.has(receiverId)) {
        reject(new Error(`Receiver ${receiverId} not found`));
        return;
      }
      
      const requestId = generateUUID();
      const message = createMessage<Omit<Message<T>, 'id' | 'timestamp'>>({
        type: MessageType.REQUEST_RESPONSE,
        senderId,
        receiverId,
        topic: `request:${requestId}`,
        payload,
        priority: MessagePriority.HIGH,
        metadata: { requestId, isRequest: true }
      });
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
      
      // 存储请求回调
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId
      });
      
      // 记录历史
      this.recordHistory(message);
      
      // 发送请求
      this.handleUnicast(message);
    });
  }

  /**
   * 添加消息处理器
   * @param topic 主题
   * @param handler 处理器
   */
  addHandler(topic: string, handler: MessageHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
    log(this.config.enableLogging, 'info', `Handler added for topic ${topic}`);
  }

  /**
   * 移除消息处理器
   * @param topic 主题
   * @param handler 处理器
   */
  removeHandler(topic: string, handler: MessageHandler): void {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.delete(handler);
      if (topicHandlers.size === 0) {
        this.handlers.delete(topic);
      }
      log(this.config.enableLogging, 'info', `Handler removed for topic ${topic}`);
    }
  }

  /**
   * 添加消息过滤器
   * @param filter 过滤器
   */
  addFilter(filter: MessageFilter): void {
    this.filters.push(filter);
    log(this.config.enableLogging, 'info', 'Filter added', { totalFilters: this.filters.length });
  }

  /**
   * 移除消息过滤器
   * @param filter 过滤器
   */
  removeFilter(filter: MessageFilter): void {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
      log(this.config.enableLogging, 'info', 'Filter removed', { totalFilters: this.filters.length });
    }
  }

  /**
   * 获取所有注册的同事
   * @returns 同事数组
   */
  getColleagues(): Colleague[] {
    return Array.from(this.colleagues.values());
  }

  /**
   * 获取同事数量
   * @returns 同事数量
   */
  getColleagueCount(): number {
    return this.colleagues.size;
  }

  /**
   * 获取消息历史
   * @param limit 限制数量
   * @returns 消息历史数组
   */
  getMessageHistory(limit: number = 100): Message[] {
    return this.history.slice(-limit);
  }

  /**
   * 清空消息历史
   */
  clearHistory(): void {
    this.history = [];
    log(this.config.enableLogging, 'info', 'Message history cleared');
  }

  // ============== 内部方法 ==============

  /**
   * 应用消息过滤器
   * @param message 消息
   * @returns 是否通过过滤
   */
  private applyFilters(message: Message): boolean {
    for (const filter of this.filters) {
      if (!filter.filter(message)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 记录消息历史
   * @param message 消息
   */
  private recordHistory(message: Message): void {
    if (!this.config.enableHistory) return;
    
    this.history.push(message);
    
    // 限制历史大小
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 处理广播消息
   * @param message 消息
   */
  private handleBroadcast<T>(message: Message<T>): void {
    log(this.config.enableLogging, 'info', 'Broadcasting message', {
      topic: message.topic,
      receiverCount: this.colleagues.size
    });
    
    // 调用主题处理器
    this.invokeHandlers(message);
    
    // 广播给所有同事
    for (const colleague of this.colleagues.values()) {
      if (colleague.id !== message.senderId) {
        this.deliverMessage(colleague, message);
      }
    }
  }

  /**
   * 处理点对点消息
   * @param message 消息
   */
  private handleUnicast<T>(message: Message<T>): void {
    const receiver = this.colleagues.get(message.receiverId!);
    if (!receiver) {
      log(this.config.enableLogging, 'error', `Receiver ${message.receiverId} not found`);
      return;
    }
    
    log(this.config.enableLogging, 'info', 'Unicast message', {
      from: message.senderId,
      to: message.receiverId,
      topic: message.topic
    });
    
    // 调用主题处理器
    this.invokeHandlers(message);
    
    // 发送给接收者
    this.deliverMessage(receiver, message);
  }

  /**
   * 处理请求 - 响应消息
   * @param message 消息
   */
  private handleRequestResponse<T>(message: Message<T>): void {
    const requestId = message.metadata?.requestId;
    const isRequest = message.metadata?.isRequest;
    const isResponse = message.metadata?.isResponse;
    
    if (isResponse && requestId) {
      // 这是响应
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);
        
        if (message.metadata?.error) {
          pending.reject(new Error(message.metadata.error));
        } else {
          pending.resolve(message.payload);
        }
      }
    } else if (isRequest) {
      // 这是请求
      this.handleUnicast(message);
    }
  }

  /**
   * 处理事件消息
   * @param message 消息
   */
  private handleEvent<T>(message: Message<T>): void {
    log(this.config.enableLogging, 'info', 'Event message', {
      topic: message.topic,
      priority: message.priority
    });
    
    // 调用主题处理器
    this.invokeHandlers(message);
  }

  /**
   * 处理命令消息
   * @param message 消息
   */
  private handleCommand<T>(message: Message<T>): void {
    log(this.config.enableLogging, 'info', 'Command message', {
      topic: message.topic,
      priority: message.priority
    });
    
    // 调用主题处理器
    this.invokeHandlers(message);
  }

  /**
   * 调用主题处理器
   * @param message 消息
   */
  private invokeHandlers<T>(message: Message<T>): void {
    const topicHandlers = this.handlers.get(message.topic);
    if (!topicHandlers) return;
    
    for (const handler of topicHandlers) {
      try {
        if (this.config.asyncProcessing) {
          Promise.resolve(handler.handle(message)).catch(error => {
            log(this.config.enableLogging, 'error', `Handler error for topic ${message.topic}`, error);
          });
        } else {
          handler.handle(message);
        }
      } catch (error) {
        log(this.config.enableLogging, 'error', `Handler error for topic ${message.topic}`, error);
      }
    }
  }

  /**
   * 投递消息给同事
   * @param colleague 同事
   * @param message 消息
   */
  private deliverMessage<T>(colleague: Colleague, message: Message<T>): void {
    try {
      if (this.config.asyncProcessing) {
        Promise.resolve(colleague.receive(message)).catch(error => {
          log(this.config.enableLogging, 'error', `Error delivering to ${colleague.id}`, error);
        });
      } else {
        colleague.receive(message);
      }
    } catch (error) {
      log(this.config.enableLogging, 'error', `Error delivering to ${colleague.id}`, error);
    }
  }
}

// ============== 同事类基类 ==============

/**
 * 同事类基类
 * 
 * 提供通用的同事实现，子类只需实现具体的业务逻辑
 */
export abstract class BaseColleague implements Colleague {
  /** 同事 ID */
  readonly id: string;
  
  /** 中介者引用 */
  protected mediator?: Mediator;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * 设置中介者
   * @param mediator 中介者
   */
  setMediator(mediator: Mediator): void {
    this.mediator = mediator;
  }

  /**
   * 发送消息
   * @param message 消息参数 (不含 id 和 timestamp)
   */
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void {
    if (!this.mediator) {
      throw new Error(`Mediator not set for colleague ${this.id}`);
    }
    this.mediator.send({
      ...message,
      senderId: this.id
    });
  }

  /**
   * 广播消息
   * @param topic 主题
   * @param payload 负载
   */
  broadcast<T>(topic: string, payload: T): void {
    this.send({
      type: MessageType.BROADCAST,
      receiverId: null,
      topic,
      payload,
      priority: MessagePriority.NORMAL
    });
  }

  /**
   * 点对点发送
   * @param receiverId 接收者 ID
   * @param payload 负载
   * @param topic 主题
   */
  sendTo<T>(receiverId: string, payload: T, topic: string = 'default'): void {
    this.send({
      type: MessageType.UNICAST,
      receiverId,
      topic,
      payload,
      priority: MessagePriority.NORMAL
    });
  }

  /**
   * 请求 - 响应
   * @param receiverId 接收者 ID
   * @param payload 请求负载
   * @param timeout 超时时间
   * @returns 响应 Promise
   */
  request<T, R>(receiverId: string, payload: T, timeout?: number): Promise<R> {
    if (!this.mediator) {
      throw new Error(`Mediator not set for colleague ${this.id}`);
    }
    return this.mediator.request(receiverId, payload, this.id, timeout);
  }

  /**
   * 发送响应 (用于请求 - 响应模式)
   * @param originalMessage 原始请求消息
   * @param response 响应数据
   */
  sendResponse<T, R>(originalMessage: Message<T>, response: R): void {
    this.send({
      type: MessageType.REQUEST_RESPONSE,
      receiverId: originalMessage.senderId,
      topic: originalMessage.topic,
      payload: response,
      priority: originalMessage.priority,
      metadata: {
        requestId: originalMessage.metadata?.requestId,
        isResponse: true
      }
    });
  }

  /**
   * 发送错误响应
   * @param originalMessage 原始请求消息
   * @param error 错误信息
   */
  sendErrorResponse<T>(originalMessage: Message<T>, error: string): void {
    this.send({
      type: MessageType.REQUEST_RESPONSE,
      receiverId: originalMessage.senderId,
      topic: originalMessage.topic,
      payload: null,
      priority: originalMessage.priority,
      metadata: {
        requestId: originalMessage.metadata?.requestId,
        isResponse: true,
        error
      }
    });
  }

  /**
   * 接收消息 (抽象方法，子类实现)
   * @param message 消息
   */
  abstract receive<T>(message: Message<T>): Promise<void> | void;
}

// ============== 内置过滤器 ==============

/**
 * 主题过滤器
 */
export class TopicFilter implements MessageFilter {
  private allowedTopics: Set<string>;

  constructor(topics: string[]) {
    this.allowedTopics = new Set(topics);
  }

  filter(message: Message): boolean {
    return this.allowedTopics.has(message.topic);
  }
}

/**
 * 优先级过滤器
 */
export class PriorityFilter implements MessageFilter {
  private minPriority: MessagePriority;

  constructor(minPriority: MessagePriority) {
    this.minPriority = minPriority;
  }

  filter(message: Message): boolean {
    return message.priority >= this.minPriority;
  }
}

/**
 * 发送者白名单过滤器
 */
export class SenderWhitelistFilter implements MessageFilter {
  private allowedSenders: Set<string>;

  constructor(senderIds: string[]) {
    this.allowedSenders = new Set(senderIds);
  }

  filter(message: Message): boolean {
    return this.allowedSenders.has(message.senderId);
  }
}

/**
 * 发送者黑名单过滤器
 */
export class SenderBlacklistFilter implements MessageFilter {
  private blockedSenders: Set<string>;

  constructor(senderIds: string[]) {
    this.blockedSenders = new Set(senderIds);
  }

  filter(message: Message): boolean {
    return !this.blockedSenders.has(message.senderId);
  }
}

/**
 * 时间范围过滤器
 */
export class TimeRangeFilter implements MessageFilter {
  private startTime: number;
  private endTime: number;

  constructor(startTime: Date, endTime: Date) {
    this.startTime = startTime.getTime();
    this.endTime = endTime.getTime();
  }

  filter(message: Message): boolean {
    return message.timestamp >= this.startTime && message.timestamp <= this.endTime;
  }
}

// ============== 内置处理器 ==============

/**
 * 日志处理器
 */
export class LoggingHandler implements MessageHandler {
  private prefix: string;

  constructor(prefix: string = 'Message') {
    this.prefix = prefix;
  }

  handle(message: Message): void {
    console.log(`${this.prefix} [${message.type}] ${message.topic}:`, message.payload);
  }
}

/**
 * 队列处理器
 */
export class QueueHandler implements MessageHandler {
  private queue: Message[] = [];
  private processing: boolean = false;
  private onProcess?: (message: Message) => Promise<void>;

  constructor(onProcess?: (message: Message) => Promise<void>) {
    this.onProcess = onProcess;
  }

  async handle(message: Message): Promise<void> {
    this.queue.push(message);
    
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      
      if (this.onProcess) {
        await this.onProcess(message);
      }
    }
    
    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// ============== 导出 ==============

export default {
  // 枚举
  MessageType,
  MessagePriority,
  
  // 接口
  ConcreteMediator,
  BaseColleague,
  
  // 工具函数
  generateUUID,
  createMessage,
  log,
  
  // 内置过滤器
  TopicFilter,
  PriorityFilter,
  SenderWhitelistFilter,
  SenderBlacklistFilter,
  TimeRangeFilter,
  
  // 内置处理器
  LoggingHandler,
  QueueHandler
};
