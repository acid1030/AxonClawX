/**
 * 消息总线技能 - ACE
 * 
 * 提供消息传递核心功能：
 * 1. 总线管理 (Bus Management) - 创建、销毁、监控消息总线实例
 * 2. 消息路由 (Message Routing) - 基于主题/渠道的消息分发
 * 3. 消息队列 (Message Queue) - 异步消息处理与优先级队列
 * 
 * @author ACE
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** 普通消息 */
  NORMAL = 'normal',
  /** 优先级消息 */
  PRIORITY = 'priority',
  /** 广播消息 */
  BROADCAST = 'broadcast',
  /** 请求 - 响应消息 */
  REQUEST_RESPONSE = 'request_response',
  /** 事件消息 */
  EVENT = 'event'
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
 * 消息状态
 */
export enum MessageStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
  /** 已超时 */
  TIMEOUT = 'timeout'
}

/**
 * 消息接口
 */
export interface Message<T = any> {
  /** 消息唯一 ID */
  id: string;
  /** 消息类型 */
  type: MessageType;
  /** 消息主题/渠道 */
  topic: string;
  /** 消息内容 */
  payload: T;
  /** 消息优先级 */
  priority: MessagePriority;
  /** 消息状态 */
  status: MessageStatus;
  /** 创建时间戳 */
  createdAt: number;
  /** 处理时间戳 (可选) */
  processedAt?: number;
  /** 发送者 ID (可选) */
  senderId?: string;
  /** 接收者 ID 列表 (可选) */
  recipientIds?: string[];
  /** 元数据 (可选) */
  metadata?: Record<string, any>;
  /** 错误信息 (失败时) */
  error?: string;
}

/**
 * 消息处理器接口
 */
export interface MessageHandler<T = any> {
  /** 处理器 ID */
  id: string;
  /** 处理的消息主题 */
  topic: string;
  /** 处理函数 */
  handle: (message: Message<T>) => Promise<void> | void;
  /** 是否激活 */
  active: boolean;
}

/**
 * 消息总线配置
 */
export interface MessageBusConfig {
  /** 总线 ID */
  id: string;
  /** 最大队列长度 */
  maxQueueSize?: number;
  /** 消息超时时间 (毫秒) */
  messageTimeout?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 默认优先级 */
  defaultPriority?: MessagePriority;
}

/**
 * 总线统计信息
 */
export interface BusStatistics {
  /** 总线 ID */
  busId: string;
  /** 总消息数 */
  totalMessages: number;
  /** 待处理消息数 */
  pendingMessages: number;
  /** 处理中消息数 */
  processingMessages: number;
  /** 已完成消息数 */
  completedMessages: number;
  /** 失败消息数 */
  failedMessages: number;
  /** 注册处理器数 */
  handlerCount: number;
  /** 平均处理时间 (毫秒) */
  avgProcessingTime?: number;
}

/**
 * 路由规则
 */
export interface RoutingRule {
  /** 规则 ID */
  id: string;
  /** 匹配的主题模式 (支持通配符 *) */
  topicPattern: string;
  /** 目标处理器 ID 列表 */
  handlerIds: string[];
  /** 是否启用 */
  active: boolean;
  /** 优先级 (数字越大优先级越高) */
  priority: number;
}

// ============================================
// 工具函数
// ============================================

/**
 * 生成唯一消息 ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 匹配主题模式 (支持通配符 *)
 * @param pattern - 主题模式，如 "user.*.created"
 * @param topic - 实际主题，如 "user.123.created"
 */
function matchTopicPattern(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('.');
  const topicParts = topic.split('.');
  
  if (patternParts.length !== topicParts.length) {
    return false;
  }
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] !== '*' && patternParts[i] !== topicParts[i]) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// 1. 总线管理 (Bus Management)
// ============================================

/**
 * 消息总线类
 */
export class MessageBus {
  /** 总线配置 */
  private config: MessageBusConfig;
  /** 消息队列 */
  private messageQueue: Message[] = [];
  /** 注册的消息处理器 */
  private handlers: Map<string, MessageHandler> = new Map();
  /** 路由规则 */
  private routingRules: RoutingRule[] = [];
  /** 消息历史记录 */
  private messageHistory: Map<string, Message> = new Map();
  /** 处理时间记录 (用于统计) */
  private processingTimes: number[] = [];
  /** 是否正在运行 */
  private isRunning: boolean = false;
  /** 定时器引用 */
  private processTimer?: NodeJS.Timeout;

  constructor(config: MessageBusConfig) {
    this.config = {
      maxQueueSize: 1000,
      messageTimeout: 30000,
      enableLogging: false,
      defaultPriority: MessagePriority.NORMAL,
      ...config
    };
    
    this.log(`[MessageBus] 初始化总线: ${config.id}`);
  }

  /**
   * 启动总线
   */
  public start(): void {
    if (this.isRunning) {
      this.log('[MessageBus] 总线已在运行');
      return;
    }
    
    this.isRunning = true;
    this.log('[MessageBus] 总线启动');
    
    // 启动消息处理循环
    this.processTimer = setInterval(() => {
      this.processNextMessage();
    }, 10);
  }

  /**
   * 停止总线
   */
  public stop(): void {
    this.isRunning = false;
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = undefined;
    }
    this.log('[MessageBus] 总线停止');
  }

  /**
   * 销毁总线
   */
  public destroy(): void {
    this.stop();
    this.messageQueue = [];
    this.handlers.clear();
    this.routingRules = [];
    this.messageHistory.clear();
    this.processingTimes = [];
    this.log('[MessageBus] 总线已销毁');
  }

  /**
   * 注册消息处理器
   */
  public registerHandler(handler: MessageHandler): void {
    this.handlers.set(handler.id, handler);
    this.log(`[MessageBus] 注册处理器: ${handler.id} (主题: ${handler.topic})`);
  }

  /**
   * 注销消息处理器
   */
  public unregisterHandler(handlerId: string): void {
    this.handlers.delete(handlerId);
    this.log(`[MessageBus] 注销处理器: ${handlerId}`);
  }

  /**
   * 添加路由规则
   */
  public addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    // 按优先级排序
    this.routingRules.sort((a, b) => b.priority - a.priority);
    this.log(`[MessageBus] 添加路由规则: ${rule.id} (模式: ${rule.topicPattern})`);
  }

  /**
   * 移除路由规则
   */
  public removeRoutingRule(ruleId: string): void {
    const index = this.routingRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.routingRules.splice(index, 1);
      this.log(`[MessageBus] 移除路由规则: ${ruleId}`);
    }
  }

  /**
   * 发布消息
   */
  public publish<T>(message: Omit<Message<T>, 'id' | 'status' | 'createdAt'>): Message<T> {
    // 检查队列长度
    if (this.messageQueue.length >= (this.config.maxQueueSize || 1000)) {
      throw new Error(`消息队列已满 (最大长度：${this.config.maxQueueSize})`);
    }

    const fullMessage: Message<T> = {
      id: generateMessageId(),
      status: MessageStatus.PENDING,
      createdAt: Date.now(),
      ...message,
      priority: message.priority ?? this.config.defaultPriority ?? MessagePriority.NORMAL
    };

    // 添加到队列 (按优先级排序)
    this.addToQueue(fullMessage);
    
    // 记录历史
    this.messageHistory.set(fullMessage.id, fullMessage);

    this.log(`[MessageBus] 发布消息: ${fullMessage.id} (主题: ${fullMessage.topic}, 优先级: ${fullMessage.priority})`);

    return fullMessage;
  }

  /**
   * 广播消息到所有处理器
   */
  public broadcast<T>(topic: string, payload: T, senderId?: string): Message<T> {
    return this.publish({
      type: MessageType.BROADCAST,
      topic,
      payload,
      senderId,
      priority: this.config.defaultPriority ?? MessagePriority.NORMAL
    });
  }

  /**
   * 发送请求 - 响应消息
   */
  public async requestResponse<T, R>(
    topic: string,
    payload: T,
    timeout?: number
  ): Promise<R | null> {
    const timeoutMs = timeout ?? this.config.messageTimeout ?? 30000;
    
    return new Promise((resolve, reject) => {
      const message = this.publish<T>({
        type: MessageType.REQUEST_RESPONSE,
        topic,
        payload,
        priority: this.config.defaultPriority ?? MessagePriority.NORMAL
      });

      const timeoutId = setTimeout(() => {
        this.updateMessageStatus(message.id, MessageStatus.TIMEOUT);
        resolve(null);
      }, timeoutMs);

      // 监听响应
      const checkInterval = setInterval(() => {
        const updatedMessage = this.messageHistory.get(message.id);
        if (updatedMessage && updatedMessage.status === MessageStatus.COMPLETED) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          resolve(updatedMessage.payload as R);
        } else if (updatedMessage && updatedMessage.status === MessageStatus.FAILED) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          reject(new Error(updatedMessage.error || '消息处理失败'));
        }
      }, 50);
    });
  }

  /**
   * 获取总线统计信息
   */
  public getStatistics(): BusStatistics {
    const messages = Array.from(this.messageHistory.values());
    const completedMessages = messages.filter(m => m.status === MessageStatus.COMPLETED);
    
    const avgProcessingTime = completedMessages.length > 0 && this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : undefined;

    return {
      busId: this.config.id,
      totalMessages: messages.length,
      pendingMessages: messages.filter(m => m.status === MessageStatus.PENDING).length,
      processingMessages: messages.filter(m => m.status === MessageStatus.PROCESSING).length,
      completedMessages: completedMessages.length,
      failedMessages: messages.filter(m => m.status === MessageStatus.FAILED).length,
      handlerCount: this.handlers.size,
      avgProcessingTime
    };
  }

  /**
   * 获取消息历史
   */
  public getMessageHistory(limit: number = 100): Message[] {
    return Array.from(this.messageHistory.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * 获取队列中的消息
   */
  public getQueuedMessages(): Message[] {
    return [...this.messageQueue];
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 将消息添加到队列 (按优先级排序)
   */
  private addToQueue(message: Message): void {
    // 找到插入位置 (优先级高的在前)
    let insertIndex = this.messageQueue.length;
    for (let i = 0; i < this.messageQueue.length; i++) {
      if (message.priority > this.messageQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.messageQueue.splice(insertIndex, 0, message);
  }

  /**
   * 处理下一条消息
   */
  private async processNextMessage(): Promise<void> {
    if (this.messageQueue.length === 0 || !this.isRunning) {
      return;
    }

    const message = this.messageQueue.shift();
    if (!message) return;

    const startTime = Date.now();
    this.updateMessageStatus(message.id, MessageStatus.PROCESSING);

    try {
      // 查找匹配的处理器
      const handlers = this.findMatchingHandlers(message.topic);
      
      if (handlers.length === 0) {
        this.log(`[MessageBus] 未找到消息处理器: ${message.topic}`);
        this.updateMessageStatus(message.id, MessageStatus.COMPLETED);
        return;
      }

      // 并行执行所有匹配的处理器
      await Promise.all(handlers.map(handler => handler.handle(message)));

      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      // 保留最近 100 个处理时间记录
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }

      this.updateMessageStatus(message.id, MessageStatus.COMPLETED);
      this.log(`[MessageBus] 消息处理完成: ${message.id} (耗时: ${processingTime}ms)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateMessageStatus(message.id, MessageStatus.FAILED, errorMessage);
      this.log(`[MessageBus] 消息处理失败: ${message.id} (错误: ${errorMessage})`);
    }
  }

  /**
   * 查找匹配的消息处理器
   */
  private findMatchingHandlers(topic: string): MessageHandler[] {
    const matchedHandlers = new Map<string, MessageHandler>();

    // 通过路由规则匹配
    for (const rule of this.routingRules) {
      if (rule.active && matchTopicPattern(rule.topicPattern, topic)) {
        for (const handlerId of rule.handlerIds) {
          const handler = this.handlers.get(handlerId);
          if (handler && handler.active) {
            matchedHandlers.set(handlerId, handler);
          }
        }
      }
    }

    // 直接匹配主题
    for (const handler of Array.from(this.handlers.values())) {
      if (handler.active && matchTopicPattern(handler.topic, topic)) {
        matchedHandlers.set(handler.id, handler);
      }
    }

    return Array.from(matchedHandlers.values());
  }

  /**
   * 更新消息状态
   */
  private updateMessageStatus(messageId: string, status: MessageStatus, error?: string): void {
    const message = this.messageHistory.get(messageId);
    if (message) {
      message.status = status;
      if (status === MessageStatus.COMPLETED) {
        message.processedAt = Date.now();
      }
      if (error) {
        message.error = error;
      }
    }
  }

  /**
   * 日志记录
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(message);
    }
  }
}

// ============================================
// 2. 消息路由 (Message Routing)
// ============================================

/**
 * 消息路由器类
 * 提供基于主题的消息路由功能
 */
export class MessageRouter {
  /** 路由规则 */
  private rules: Map<string, RoutingRule> = new Map();
  /** 主题订阅映射 */
  private topicSubscriptions: Map<string, Set<string>> = new Map();

  /**
   * 添加路由规则
   */
  public addRule(rule: RoutingRule): void {
    this.rules.set(rule.id, rule);
    
    // 更新订阅映射
    for (const handlerId of rule.handlerIds) {
      if (!this.topicSubscriptions.has(rule.topicPattern)) {
        this.topicSubscriptions.set(rule.topicPattern, new Set());
      }
      this.topicSubscriptions.get(rule.topicPattern)!.add(handlerId);
    }
  }

  /**
   * 移除路由规则
   */
  public removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      
      // 清理订阅映射
      for (const handlerId of rule.handlerIds) {
        const subscribers = this.topicSubscriptions.get(rule.topicPattern);
        if (subscribers) {
          subscribers.delete(handlerId);
          if (subscribers.size === 0) {
            this.topicSubscriptions.delete(rule.topicPattern);
          }
        }
      }
    }
  }

  /**
   * 订阅主题
   */
  public subscribe(topicPattern: string, handlerId: string): void {
    if (!this.topicSubscriptions.has(topicPattern)) {
      this.topicSubscriptions.set(topicPattern, new Set());
    }
    this.topicSubscriptions.get(topicPattern)!.add(handlerId);
  }

  /**
   * 取消订阅
   */
  public unsubscribe(topicPattern: string, handlerId: string): void {
    const subscribers = this.topicSubscriptions.get(topicPattern);
    if (subscribers) {
      subscribers.delete(handlerId);
      if (subscribers.size === 0) {
        this.topicSubscriptions.delete(topicPattern);
      }
    }
  }

  /**
   * 路由消息到目标处理器
   * @returns 匹配的处理器 ID 列表
   */
  public route(topic: string): string[] {
    const matchedHandlerIds = new Set<string>();

    // 精确匹配
    if (this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.get(topic)!.forEach(id => matchedHandlerIds.add(id));
    }

    // 通配符匹配
    for (const [pattern, handlerIds] of Array.from(this.topicSubscriptions.entries())) {
      if (pattern.includes('*') && matchTopicPattern(pattern, topic)) {
        handlerIds.forEach(id => matchedHandlerIds.add(id));
      }
    }

    return Array.from(matchedHandlerIds);
  }

  /**
   * 获取所有路由规则
   */
  public getRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取订阅信息
   */
  public getSubscriptions(): Map<string, Set<string>> {
    return new Map(this.topicSubscriptions);
  }
}

// ============================================
// 3. 消息队列 (Message Queue)
// ============================================

/**
 * 优先级消息队列
 */
export class PriorityMessageQueue {
  /** 队列数组 */
  private queue: Message[] = [];
  /** 最大容量 */
  private maxCapacity: number;
  /** 等待消息的 Promise 解析函数 */
  private waitingConsumers: Array<(message: Message | null) => void> = [];

  constructor(maxCapacity: number = 1000) {
    this.maxCapacity = maxCapacity;
  }

  /**
   * 入队消息
   */
  public enqueue(message: Message): boolean {
    if (this.queue.length >= this.maxCapacity) {
      return false;
    }

    // 按优先级插入
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (message.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
      // 同优先级时，按时间排序 (FIFO)
      if (message.priority === this.queue[i].priority && message.createdAt < this.queue[i].createdAt) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);

    // 如果有等待的消费者，立即通知
    if (this.waitingConsumers.length > 0) {
      const resolve = this.waitingConsumers.shift();
      if (resolve) {
        resolve(message);
      }
    }

    return true;
  }

  /**
   * 出队消息 (阻塞式)
   */
  public async dequeue(timeout?: number): Promise<Message | null> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    // 队列为空，等待新消息
    return new Promise((resolve) => {
      const timeoutId = timeout ? setTimeout(() => {
        const index = this.waitingConsumers.indexOf(resolve);
        if (index !== -1) {
          this.waitingConsumers.splice(index, 1);
        }
        resolve(null);
      }, timeout) : null;

      this.waitingConsumers.push((message) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(message);
      });
    });
  }

  /**
   * 出队消息 (非阻塞式)
   */
  public dequeueNow(): Message | null {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue.shift()!;
  }

  /**
   * 查看队首消息 (不出队)
   */
  public peek(): Message | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * 获取队列长度
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.queue = [];
    // 通知所有等待的消费者
    while (this.waitingConsumers.length > 0) {
      const resolve = this.waitingConsumers.shift();
      if (resolve) {
        resolve(null);
      }
    }
  }

  /**
   * 获取队列中的所有消息
   */
  public getAll(): Message[] {
    return [...this.queue];
  }

  /**
   * 移除指定消息
   */
  public remove(messageId: string): boolean {
    const index = this.queue.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
}

// ============================================
// 使用示例
// ============================================

/**
 * 使用示例
 */
export async function runExamples(): Promise<void> {
  console.log('=== 消息总线技能使用示例 ===\n');

  // ============================================
  // 示例 1: 基础总线管理
  // ============================================
  console.log('【示例 1: 基础总线管理】');
  
  const bus = new MessageBus({
    id: 'example-bus',
    maxQueueSize: 100,
    enableLogging: true
  });

  // 注册处理器
  bus.registerHandler({
    id: 'handler-1',
    topic: 'user.*',
    active: true,
    handle: async (message) => {
      console.log(`[Handler-1] 收到消息: ${message.topic}`, message.payload);
    }
  });

  // 启动总线
  bus.start();

  // 发布消息
  bus.publish({
    type: MessageType.EVENT,
    topic: 'user.created',
    payload: { userId: 123, name: 'Alice' },
    priority: MessagePriority.HIGH
  });

  // 获取统计信息
  const stats = bus.getStatistics();
  console.log('总线统计:', stats);

  // 停止总线
  bus.stop();
  console.log('');

  // ============================================
  // 示例 2: 消息路由
  // ============================================
  console.log('【示例 2: 消息路由】');
  
  const router = new MessageRouter();

  // 添加路由规则
  router.addRule({
    id: 'rule-1',
    topicPattern: 'order.*',
    handlerIds: ['order-processor', 'order-logger'],
    active: true,
    priority: 10
  });

  // 订阅主题
  router.subscribe('notification.email', 'email-sender');
  router.subscribe('notification.sms', 'sms-sender');

  // 路由消息
  const targets1 = router.route('order.created');
  console.log('order.created 路由目标:', targets1);

  const targets2 = router.route('notification.email');
  console.log('notification.email 路由目标:', targets2);
  console.log('');

  // ============================================
  // 示例 3: 优先级队列
  // ============================================
  console.log('【示例 3: 优先级队列】');
  
  const queue = new PriorityMessageQueue(100);

  // 添加不同优先级的消息
  queue.enqueue({
    id: 'msg-1',
    type: MessageType.NORMAL,
    topic: 'task.low',
    payload: { task: 'low priority' },
    priority: MessagePriority.LOW,
    status: MessageStatus.PENDING,
    createdAt: Date.now()
  });

  queue.enqueue({
    id: 'msg-2',
    type: MessageType.PRIORITY,
    topic: 'task.urgent',
    payload: { task: 'urgent task' },
    priority: MessagePriority.URGENT,
    status: MessageStatus.PENDING,
    createdAt: Date.now() + 1
  });

  queue.enqueue({
    id: 'msg-3',
    type: MessageType.NORMAL,
    topic: 'task.normal',
    payload: { task: 'normal task' },
    priority: MessagePriority.NORMAL,
    status: MessageStatus.PENDING,
    createdAt: Date.now() + 2
  });

  console.log('队列长度:', queue.size());

  // 按优先级出队
  console.log('出队顺序:');
  let msg;
  while ((msg = queue.dequeueNow()) !== null) {
    console.log(`  - ${msg.id} (优先级：${msg.priority}, 主题：${msg.topic})`);
  }
  console.log('');

  // ============================================
  // 示例 4: 请求 - 响应模式
  // ============================================
  console.log('【示例 4: 请求 - 响应模式】');
  
  const requestBus = new MessageBus({
    id: 'request-bus',
    enableLogging: false
  });

  // 注册请求处理器
  requestBus.registerHandler({
    id: 'calculator',
    topic: 'calc.add',
    active: true,
    handle: async (message) => {
      const { a, b } = message.payload;
      console.log(`[Calculator] 计算 ${a} + ${b}`);
      // 在实际场景中，这里会更新消息状态和结果
    }
  });

  requestBus.start();

  // 发送请求
  try {
    const result = await requestBus.requestResponse<{ a: number; b: number }, number>(
      'calc.add',
      { a: 5, b: 3 },
      5000
    );
    console.log('请求结果:', result);
  } catch (error) {
    console.log('请求失败:', error);
  }

  requestBus.stop();
  console.log('');

  console.log('=== 示例完成 ===');
}

// ============================================
// 导出
// ============================================

export default {
  MessageBus,
  MessageRouter,
  PriorityMessageQueue,
  MessageType,
  MessagePriority,
  MessageStatus,
  runExamples
};
