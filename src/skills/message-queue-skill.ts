/**
 * 消息队列技能 - Message Queue Skill
 * 
 * 功能:
 * 1. 消息发布 (publish)
 * 2. 消息订阅 (subscribe)
 * 3. 消息持久化 (persistence)
 * 
 * 特性:
 * - 支持多主题 (Topic) 发布/订阅
 * - 支持消息持久化到文件系统
 * - 支持消息过期时间
 * - 支持批量操作
 * - 支持消息过滤
 * 
 * @module skills/message-queue-skill
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/** 消息优先级 */
export type MessagePriority = 'high' | 'normal' | 'low';

/** 消息状态 */
export type MessageStatus = 'pending' | 'delivered' | 'expired' | 'failed';

/** 消息接口 */
export interface Message<T = any> {
  /** 消息唯一 ID */
  id: string;
  /** 消息主题 */
  topic: string;
  /** 消息内容 */
  payload: T;
  /** 优先级 */
  priority: MessagePriority;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 (可选，毫秒时间戳) */
  expiresAt?: number;
  /** 消息状态 */
  status: MessageStatus;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** 订阅者接口 */
export interface Subscriber<T = any> {
  /** 订阅者 ID */
  id: string;
  /** 订阅的主题 */
  topic: string;
  /** 回调函数 */
  callback: (message: Message<T>) => void | Promise<void>;
  /** 过滤器 (可选) */
  filter?: (message: Message<T>) => boolean;
  /** 是否活跃 */
  active: boolean;
}

/** 持久化配置 */
export interface PersistenceConfig {
  /** 是否启用持久化 */
  enabled: boolean;
  /** 持久化目录 */
  directory: string;
  /** 单个文件最大消息数 */
  maxMessagesPerFile: number;
  /** 消息保留天数 */
  retentionDays: number;
}

/** 消息队列配置 */
export interface MessageQueueConfig {
  /** 队列名称 */
  name: string;
  /** 最大消息数 */
  maxMessages: number;
  /** 默认消息过期时间 (毫秒) */
  defaultTTL: number;
  /** 持久化配置 */
  persistence: PersistenceConfig;
}

/** 队列统计信息 */
export interface QueueStats {
  /** 总消息数 */
  totalMessages: number;
  /** 按主题统计 */
  byTopic: Record<string, number>;
  /** 按优先级统计 */
  byPriority: Record<MessagePriority, number>;
  /** 按状态统计 */
  byStatus: Record<MessageStatus, number>;
  /** 订阅者数量 */
  subscriberCount: number;
  /** 持久化消息数 */
  persistedMessages: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: MessageQueueConfig = {
  name: 'default-queue',
  maxMessages: 10000,
  defaultTTL: 3600000, // 1 小时
  persistence: {
    enabled: false,
    directory: './data/messages',
    maxMessagesPerFile: 1000,
    retentionDays: 7,
  },
};

// ============== 工具函数 ==============

/**
 * 生成唯一消息 ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成唯一订阅者 ID
 */
function generateSubscriberId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 检查消息是否过期
 */
function isMessageExpired(message: Message): boolean {
  if (!message.expiresAt) return false;
  return Date.now() > message.expiresAt;
}

/**
 * 确保目录存在
 */
function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============== 消息队列类 ==============

/**
 * 消息队列类
 * 
 * 支持发布/订阅模式，可选持久化
 */
export class MessageQueue {
  private messages: Message[] = [];
  private subscribers: Map<string, Subscriber> = new Map();
  private config: MessageQueueConfig;
  private fileCounter: number = 0;

  constructor(config?: Partial<MessageQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 如果启用持久化，确保目录存在
    if (this.config.persistence.enabled) {
      ensureDirectory(this.config.persistence.directory);
      this.loadPersistedMessages();
    }
  }

  // ============== 消息发布 ==============

  /**
   * 发布消息
   * 
   * @param topic 消息主题
   * @param payload 消息内容
   * @param options 选项
   * @returns 发布的消息
   */
  publish<T = any>(
    topic: string,
    payload: T,
    options?: {
      priority?: MessagePriority;
      ttl?: number;
      metadata?: Record<string, any>;
    }
  ): Message<T> {
    // 检查队列是否已满
    if (this.messages.length >= this.config.maxMessages) {
      throw new Error(`队列已满，最大容量：${this.config.maxMessages}`);
    }

    const message: Message<T> = {
      id: generateMessageId(),
      topic,
      payload,
      priority: options?.priority || 'normal',
      createdAt: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : Date.now() + this.config.defaultTTL,
      status: 'pending',
      metadata: options?.metadata,
    };

    // 添加到队列
    this.messages.push(message);

    // 持久化
    if (this.config.persistence.enabled) {
      this.persistMessage(message);
    }

    // 通知订阅者
    this.notifySubscribers(message);

    return message;
  }

  /**
   * 批量发布消息
   * 
   * @param messages 消息数组
   * @returns 发布的消息数组
   */
  publishBatch<T = any>(
    messages: Array<{
      topic: string;
      payload: T;
      priority?: MessagePriority;
      ttl?: number;
      metadata?: Record<string, any>;
    }>
  ): Message<T>[] {
    return messages.map(msg =>
      this.publish(msg.topic, msg.payload, {
        priority: msg.priority,
        ttl: msg.ttl,
        metadata: msg.metadata,
      })
    );
  }

  // ============== 消息订阅 ==============

  /**
   * 订阅主题
   * 
   * @param topic 主题
   * @param callback 回调函数
   * @param filter 过滤器 (可选)
   * @returns 订阅者 ID
   */
  subscribe<T = any>(
    topic: string,
    callback: (message: Message<T>) => void | Promise<void>,
    filter?: (message: Message<T>) => boolean
  ): string {
    const subscriberId = generateSubscriberId();
    
    const subscriber: Subscriber<T> = {
      id: subscriberId,
      topic,
      callback,
      filter,
      active: true,
    };

    this.subscribers.set(subscriberId, subscriber as Subscriber);

    return subscriberId;
  }

  /**
   * 取消订阅
   * 
   * @param subscriberId 订阅者 ID
   * @returns 是否成功取消
   */
  unsubscribe(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) {
      return false;
    }
    
    subscriber.active = false;
    this.subscribers.delete(subscriberId);
    return true;
  }

  /**
   * 获取所有订阅者
   * 
   * @returns 订阅者数组
   */
  getSubscribers(): Subscriber[] {
    return Array.from(this.subscribers.values());
  }

  /**
   * 获取指定主题的订阅者
   * 
   * @param topic 主题
   * @returns 订阅者数组
   */
  getSubscribersByTopic(topic: string): Subscriber[] {
    return Array.from(this.subscribers.values()).filter(
      sub => sub.topic === topic
    );
  }

  // ============== 消息处理 ==============

  /**
   * 通知订阅者
   */
  private notifySubscribers<T = any>(message: Message<T>): void {
    const subscribers = this.getSubscribersByTopic(message.topic);
    
    for (const subscriber of subscribers) {
      if (!subscriber.active) continue;
      
      // 应用过滤器
      if (subscriber.filter && !subscriber.filter(message as Message)) {
        continue;
      }

      // 异步调用回调
      Promise.resolve().then(() => {
        try {
          (subscriber.callback as (msg: Message) => void)(message);
        } catch (error) {
          console.error(`订阅者 ${subscriber.id} 处理消息失败:`, error);
        }
      });
    }
  }

  /**
   * 获取消息
   * 
   * @param messageId 消息 ID
   * @returns 消息，如果不存在则返回 null
   */
  getMessage<T = any>(messageId: string): Message<T> | null {
    return this.messages.find(m => m.id === messageId) || null;
  }

  /**
   * 获取指定主题的消息
   * 
   * @param topic 主题
   * @param limit 数量限制
   * @returns 消息数组
   */
  getMessagesByTopic<T = any>(topic: string, limit: number = 100): Message<T>[] {
    return this.messages
      .filter(m => m.topic === topic && !isMessageExpired(m))
      .slice(0, limit);
  }

  /**
   * 获取所有未过期消息
   * 
   * @param limit 数量限制
   * @returns 消息数组
   */
  getAllMessages<T = any>(limit: number = 100): Message<T>[] {
    return this.messages
      .filter(m => !isMessageExpired(m))
      .slice(0, limit);
  }

  /**
   * 删除消息
   * 
   * @param messageId 消息 ID
   * @returns 是否成功删除
   */
  deleteMessage(messageId: string): boolean {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index === -1) {
      return false;
    }
    
    this.messages.splice(index, 1);
    return true;
  }

  /**
   * 更新消息状态
   * 
   * @param messageId 消息 ID
   * @param status 新状态
   * @returns 是否成功更新
   */
  updateMessageStatus(messageId: string, status: MessageStatus): boolean {
    const message = this.getMessage(messageId);
    if (!message) {
      return false;
    }
    
    message.status = status;
    return true;
  }

  /**
   * 清理过期消息
   * 
   * @returns 清理的消息数量
   */
  cleanupExpiredMessages(): number {
    const initialLength = this.messages.length;
    this.messages = this.messages.filter(m => !isMessageExpired(m));
    return initialLength - this.messages.length;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.messages = [];
  }

  // ============== 持久化 ==============

  /**
   * 持久化消息到文件
   */
  private persistMessage<T = any>(message: Message<T>): void {
    try {
      const filePath = this.getPersistenceFilePath();
      ensureDirectory(path.dirname(filePath));
      
      // 读取现有数据
      let data: Message[] = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
      }

      // 添加新消息
      data.push(message);

      // 检查是否需要创建新文件
      if (data.length > this.config.persistence.maxMessagesPerFile) {
        this.fileCounter++;
        const newFilePath = this.getPersistenceFilePath();
        fs.writeFileSync(newFilePath, JSON.stringify([message], null, 2));
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('持久化消息失败:', error);
    }
  }

  /**
   * 获取持久化文件路径
   */
  private getPersistenceFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(
      this.config.persistence.directory,
      `${this.config.name}-${date}-${this.fileCounter}.json`
    );
  }

  /**
   * 加载持久化的消息
   */
  private loadPersistedMessages(): void {
    try {
      const dir = this.config.persistence.directory;
      if (!fs.existsSync(dir)) {
        return;
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: Message[] = JSON.parse(content);
        
        // 只加载未过期的消息
        const validMessages = data.filter(m => !isMessageExpired(m));
        this.messages.push(...validMessages);
      }

      // 限制加载的消息数量
      if (this.messages.length > this.config.maxMessages) {
        this.messages = this.messages.slice(-this.config.maxMessages);
      }
    } catch (error) {
      console.error('加载持久化消息失败:', error);
    }
  }

  /**
   * 获取持久化消息数量
   */
  getPersistedMessageCount(): number {
    try {
      const dir = this.config.persistence.directory;
      if (!fs.existsSync(dir)) {
        return 0;
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      let count = 0;

      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: Message[] = JSON.parse(content);
        count += data.length;
      }

      return count;
    } catch (error) {
      return 0;
    }
  }

  // ============== 统计信息 ==============

  /**
   * 获取队列统计信息
   */
  getStats(): QueueStats {
    const byTopic: Record<string, number> = {};
    const byPriority: Record<MessagePriority, number> = { high: 0, normal: 0, low: 0 };
    const byStatus: Record<MessageStatus, number> = { pending: 0, delivered: 0, expired: 0, failed: 0 };

    for (const message of this.messages) {
      // 按主题统计
      byTopic[message.topic] = (byTopic[message.topic] || 0) + 1;
      
      // 按优先级统计
      byPriority[message.priority]++;
      
      // 按状态统计
      byStatus[message.status]++;
    }

    return {
      totalMessages: this.messages.length,
      byTopic,
      byPriority,
      byStatus,
      subscriberCount: this.subscribers.size,
      persistedMessages: this.getPersistedMessageCount(),
    };
  }

  // ============== 配置 ==============

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MessageQueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果启用持久化，确保目录存在
    if (this.config.persistence.enabled) {
      ensureDirectory(this.config.persistence.directory);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): MessageQueueConfig {
    return { ...this.config };
  }
}

// ============== 工厂函数 ==============

/**
 * 创建消息队列实例
 * 
 * @param config 配置选项
 * @returns 消息队列实例
 */
export function createMessageQueue(config?: Partial<MessageQueueConfig>): MessageQueue {
  return new MessageQueue(config);
}

// ============== 导出默认 ==============

export default MessageQueue;

/**
 * 使用示例:
 * 
 * ```typescript
 * import { createMessageQueue } from './message-queue-skill';
 * 
 * // 1. 创建队列
 * const queue = createMessageQueue({
 *   name: 'my-queue',
 *   maxMessages: 5000,
 *   defaultTTL: 7200000, // 2 小时
 *   persistence: {
 *     enabled: true,
 *     directory: './data/messages',
 *     maxMessagesPerFile: 500,
 *     retentionDays: 14,
 *   },
 * });
 * 
 * // 2. 订阅主题
 * const subscriberId = queue.subscribe('user.events', (message) => {
 *   console.log('收到消息:', message.payload);
 * });
 * 
 * // 3. 发布消息
 * queue.publish('user.events', {
 *   userId: '123',
 *   action: 'login',
 *   timestamp: Date.now(),
 * }, {
 *   priority: 'high',
 *   ttl: 3600000,
 *   metadata: { source: 'web' },
 * });
 * 
 * // 4. 批量发布
 * queue.publishBatch([
 *   { topic: 'user.events', payload: { action: 'signup' } },
 *   { topic: 'user.events', payload: { action: 'logout' } },
 * ]);
 * 
 * // 5. 获取消息
 * const messages = queue.getMessagesByTopic('user.events', 50);
 * 
 * // 6. 获取统计
 * const stats = queue.getStats();
 * console.log('队列统计:', stats);
 * 
 * // 7. 清理过期消息
 * const cleaned = queue.cleanupExpiredMessages();
 * console.log(`清理了 ${cleaned} 条过期消息`);
 * 
 * // 8. 取消订阅
 * queue.unsubscribe(subscriberId);
 * ```
 */
