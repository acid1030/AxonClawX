/**
 * 发布订阅技能 - Pub/Sub Skill
 * 
 * 功能:
 * 1. 主题管理 (创建/删除/列出主题)
 * 2. 发布订阅 (publish/subscribe)
 * 3. 消息过滤 (基于条件/正则/函数过滤)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export type MessageFilter<T = any> = (message: Message<T>, topic: string) => boolean;

export interface Message<T = any> {
  /** 消息 ID */
  id: string;
  /** 主题 */
  topic: string;
  /** 消息内容 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 发送者 ID (可选) */
  senderId?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

export interface Subscription {
  /** 订阅 ID */
  id: string;
  /** 主题 (支持通配符 *) */
  topic: string;
  /** 回调函数 */
  handler: (message: Message) => void | Promise<void>;
  /** 消息过滤器 */
  filter?: MessageFilter;
  /** 是否只接收一次 */
  once: boolean;
  /** 创建时间 */
  createdAt: number;
}

export interface TopicInfo {
  /** 主题名称 */
  name: string;
  /** 订阅者数量 */
  subscriberCount: number;
  /** 消息总数 */
  messageCount: number;
  /** 最后消息时间 */
  lastMessageAt?: number;
  /** 是否系统主题 */
  isSystem: boolean;
}

export interface PubSubStats {
  /** 总主题数 */
  totalTopics: number;
  /** 总订阅数 */
  totalSubscriptions: number;
  /** 总消息数 */
  totalMessages: number;
  /** 活跃订阅者数 */
  activeSubscribers: number;
}

export interface FilterOptions {
  /** 正则表达式过滤 */
  regex?: RegExp;
  /** 字段匹配过滤 */
  fields?: Record<string, any>;
  /** 自定义函数过滤 */
  fn?: MessageFilter;
  /** 时间范围过滤 (毫秒) */
  timeRange?: {
    start?: number;
    end?: number;
  };
}

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 匹配主题 (支持通配符 *)
 * 例：user.* 匹配 user.create, user.update, user.delete
 */
function matchTopic(pattern: string, topic: string): boolean {
  if (pattern === topic) return true;
  if (!pattern.includes('*')) return false;
  
  const regex = new RegExp(`^${pattern.replace(/\*/g, '[^.]*')}$`);
  return regex.test(topic);
}

// ============== 发布订阅管理器 ==============

/**
 * 发布订阅管理器类
 */
export class PubSubManager {
  private topics: Map<string, TopicInfo> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: Map<string, Message[]> = new Map();
  private stats: PubSubStats = {
    totalTopics: 0,
    totalSubscriptions: 0,
    totalMessages: 0,
    activeSubscribers: 0,
  };
  private maxHistoryPerTopic: number = 100;
  private systemTopics: Set<string> = new Set(['system.*', 'internal.*']);

  constructor(options?: { maxHistoryPerTopic?: number }) {
    if (options?.maxHistoryPerTopic) {
      this.maxHistoryPerTopic = options.maxHistoryPerTopic;
    }
  }

  // ============== 主题管理 ==============

  /**
   * 创建主题
   */
  createTopic(topicName: string, isSystem: boolean = false): TopicInfo {
    if (this.topics.has(topicName)) {
      return this.topics.get(topicName)!;
    }

    const topicInfo: TopicInfo = {
      name: topicName,
      subscriberCount: 0,
      messageCount: 0,
      isSystem: isSystem || this.isSystemTopic(topicName),
    };

    this.topics.set(topicName, topicInfo);
    this.stats.totalTopics++;
    
    console.log(`[PubSub] Topic created: ${topicName}`);
    return topicInfo;
  }

  /**
   * 删除主题
   */
  deleteTopic(topicName: string): boolean {
    if (!this.topics.has(topicName)) {
      return false;
    }

    // 移除相关订阅
    for (const [subId, sub] of this.subscriptions.entries()) {
      if (matchTopic(sub.topic, topicName)) {
        this.subscriptions.delete(subId);
        this.stats.totalSubscriptions--;
      }
    }

    // 移除消息历史
    this.messageHistory.delete(topicName);
    this.topics.delete(topicName);
    this.stats.totalTopics--;

    console.log(`[PubSub] Topic deleted: ${topicName}`);
    return true;
  }

  /**
   * 列出所有主题
   */
  listTopics(pattern?: string): TopicInfo[] {
    let topics = Array.from(this.topics.values());
    
    if (pattern) {
      topics = topics.filter(t => matchTopic(pattern, t.name));
    }

    return topics.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 获取主题信息
   */
  getTopic(topicName: string): TopicInfo | undefined {
    return this.topics.get(topicName);
  }

  // ============== 订阅管理 ==============

  /**
   * 订阅主题
   */
  subscribe(
    topic: string,
    handler: (message: Message) => void | Promise<void>,
    options?: {
      filter?: MessageFilter;
      once?: boolean;
    }
  ): string {
    // 自动创建主题
    if (!this.topics.has(topic)) {
      this.createTopic(topic);
    }

    const subscription: Subscription = {
      id: generateId(),
      topic,
      handler,
      filter: options?.filter,
      once: options?.once || false,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscription.id, subscription);
    this.stats.totalSubscriptions++;
    this.updateTopicSubscriberCount(topic, 1);
    this.updateActiveSubscribers();

    console.log(`[PubSub] Subscription created: ${subscription.id} on topic ${topic}`);
    return subscription.id;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);
    this.stats.totalSubscriptions--;
    this.updateTopicSubscriberCount(subscription.topic, -1);
    this.updateActiveSubscribers();

    console.log(`[PubSub] Subscription cancelled: ${subscriptionId}`);
    return true;
  }

  /**
   * 订阅一次 (once)
   */
  subscribeOnce(
    topic: string,
    handler: (message: Message) => void | Promise<void>,
    filter?: MessageFilter
  ): string {
    return this.subscribe(topic, handler, { filter, once: true });
  }

  // ============== 消息发布 ==============

  /**
   * 发布消息
   */
  async publish<T = any>(
    topic: string,
    data: T,
    options?: {
      senderId?: string;
      metadata?: Record<string, any>;
      skipHistory?: boolean;
    }
  ): Promise<Message<T>> {
    // 自动创建主题
    if (!this.topics.has(topic)) {
      this.createTopic(topic);
    }

    const message: Message<T> = {
      id: generateId(),
      topic,
      data,
      timestamp: Date.now(),
      senderId: options?.senderId,
      metadata: options?.metadata,
    };

    // 保存消息历史
    if (!options?.skipHistory) {
      this.saveMessageToHistory(message);
      const topicInfo = this.topics.get(topic);
      if (topicInfo) {
        topicInfo.messageCount++;
        topicInfo.lastMessageAt = message.timestamp;
      }
      this.stats.totalMessages++;
    }

    // 通知订阅者
    await this.notifySubscribers(message);

    console.log(`[PubSub] Message published to ${topic}: ${message.id}`);
    return message;
  }

  // ============== 消息过滤 ==============

  /**
   * 创建过滤器
   */
  createFilter<T = any>(options: FilterOptions): MessageFilter<T> {
    return (message: Message, topic: string): boolean => {
      // 时间范围过滤
      if (options.timeRange) {
        if (options.timeRange.start && message.timestamp < options.timeRange.start) {
          return false;
        }
        if (options.timeRange.end && message.timestamp > options.timeRange.end) {
          return false;
        }
      }

      // 正则过滤
      if (options.regex && typeof message.data === 'string') {
        if (!options.regex.test(message.data)) {
          return false;
        }
      }

      // 字段匹配过滤
      if (options.fields) {
        if (typeof message.data !== 'object' || message.data === null) {
          return false;
        }
        for (const [key, value] of Object.entries(options.fields)) {
          if ((message.data as any)[key] !== value) {
            return false;
          }
        }
      }

      // 自定义函数过滤
      if (options.fn) {
        return options.fn(message, message.topic);
      }

      return true;
    };
  }

  // ============== 查询功能 ==============

  /**
   * 获取消息历史
   */
  getHistory(topic: string, limit: number = 10): Message[] {
    const history = this.messageHistory.get(topic) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * 搜索消息
   */
  searchMessages(
    topicPattern: string,
    filter?: MessageFilter,
    limit: number = 50
  ): Message[] {
    const results: Message[] = [];

    for (const [topic, history] of this.messageHistory.entries()) {
      if (matchTopic(topicPattern, topic)) {
        for (const message of history) {
          if (!filter || filter(message, topic)) {
            results.push(message);
            if (results.length >= limit) {
              return results;
            }
          }
        }
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取统计信息
   */
  getStats(): PubSubStats {
    this.updateActiveSubscribers();
    return { ...this.stats };
  }

  // ============== 私有方法 ==============

  private isSystemTopic(topic: string): boolean {
    for (const pattern of this.systemTopics) {
      if (matchTopic(pattern, topic)) {
        return true;
      }
    }
    return false;
  }

  private updateTopicSubscriberCount(topic: string, delta: number) {
    const topicInfo = this.topics.get(topic);
    if (topicInfo) {
      topicInfo.subscriberCount += delta;
    }
  }

  private updateActiveSubscribers() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    let active = 0;
    for (const sub of this.subscriptions.values()) {
      // 简单判断：最近创建的订阅视为活跃
      if (sub.createdAt > oneMinuteAgo) {
        active++;
      }
    }
    this.stats.activeSubscribers = active;
  }

  private saveMessageToHistory(message: Message) {
    const history = this.messageHistory.get(message.topic) || [];
    history.push(message);
    
    // 限制历史长度
    if (history.length > this.maxHistoryPerTopic) {
      history.shift();
    }
    
    this.messageHistory.set(message.topic, history);
  }

  private async notifySubscribers(message: Message) {
    const toRemove: string[] = [];

    for (const [subId, subscription] of this.subscriptions.entries()) {
      // 检查主题匹配
      if (!matchTopic(subscription.topic, message.topic)) {
        continue;
      }

      // 检查过滤器
      if (subscription.filter && !subscription.filter(message, message.topic)) {
        continue;
      }

      try {
        await subscription.handler(message);
        
        // 如果是一次性订阅，标记删除
        if (subscription.once) {
          toRemove.push(subId);
        }
      } catch (error) {
        console.error(`[PubSub] Error in subscription ${subId}:`, error);
      }
    }

    // 删除一次性订阅
    for (const subId of toRemove) {
      this.unsubscribe(subId);
    }
  }
}

// ============== 快捷函数 ==============

/**
 * 创建发布订阅管理器实例
 */
export function createPubSub(options?: { maxHistoryPerTopic?: number }): PubSubManager {
  return new PubSubManager(options);
}

/**
 * 创建消息过滤器
 */
export function createMessageFilter<T = any>(options: FilterOptions): MessageFilter<T> {
  const manager = new PubSubManager();
  return manager.createFilter<T>(options);
}

// ============== 导出 ==============

export default PubSubManager;
