/**
 * Observer Pattern Skill - KAEL
 * 
 * 功能:
 * 1. 主题管理 (创建/删除/列出主题)
 * 2. 观察者注册 (订阅/取消订阅)
 * 3. 消息广播 (向主题发送消息)
 */

// ==================== 类型定义 ====================

interface Observer {
  id: string;
  name: string;
  callback: (message: any) => void;
}

interface Topic {
  name: string;
  observers: Map<string, Observer>;
  messageHistory: any[];
}

interface ObserverPatternConfig {
  maxHistoryLength?: number;
}

// ==================== 核心类 ====================

export class ObserverPatternSkill {
  private topics: Map<string, Topic>;
  private config: ObserverPatternConfig;

  constructor(config: ObserverPatternConfig = {}) {
    this.topics = new Map();
    this.config = {
      maxHistoryLength: 100,
      ...config,
    };
  }

  // ==================== 主题管理 ====================

  /**
   * 创建新主题
   */
  createTopic(topicName: string): boolean {
    if (this.topics.has(topicName)) {
      return false;
    }
    this.topics.set(topicName, {
      name: topicName,
      observers: new Map(),
      messageHistory: [],
    });
    return true;
  }

  /**
   * 删除主题
   */
  deleteTopic(topicName: string): boolean {
    return this.topics.delete(topicName);
  }

  /**
   * 列出所有主题
   */
  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }

  /**
   * 获取主题信息
   */
  getTopicInfo(topicName: string): { name: string; observerCount: number; messageCount: number } | null {
    const topic = this.topics.get(topicName);
    if (!topic) return null;
    return {
      name: topic.name,
      observerCount: topic.observers.size,
      messageCount: topic.messageHistory.length,
    };
  }

  // ==================== 观察者管理 ====================

  /**
   * 订阅主题
   */
  subscribe(
    topicName: string,
    observerId: string,
    observerName: string,
    callback: (message: any) => void
  ): boolean {
    const topic = this.topics.get(topicName);
    if (!topic) {
      return false;
    }

    const observer: Observer = {
      id: observerId,
      name: observerName,
      callback,
    };

    topic.observers.set(observerId, observer);
    return true;
  }

  /**
   * 取消订阅
   */
  unsubscribe(topicName: string, observerId: string): boolean {
    const topic = this.topics.get(topicName);
    if (!topic) {
      return false;
    }
    return topic.observers.delete(observerId);
  }

  /**
   * 获取主题的所有观察者
   */
  getObservers(topicName: string): Observer[] | null {
    const topic = this.topics.get(topicName);
    if (!topic) return null;
    return Array.from(topic.observers.values());
  }

  /**
   * 检查观察者是否已订阅
   */
  isSubscribed(topicName: string, observerId: string): boolean {
    const topic = this.topics.get(topicName);
    if (!topic) return false;
    return topic.observers.has(observerId);
  }

  // ==================== 消息广播 ====================

  /**
   * 向主题广播消息
   */
  broadcast(topicName: string, message: any): boolean {
    const topic = this.topics.get(topicName);
    if (!topic) {
      return false;
    }

    // 记录消息历史
    topic.messageHistory.push({
      message,
      timestamp: Date.now(),
    });

    // 限制历史记录长度
    if (topic.messageHistory.length > this.config.maxHistoryLength!) {
      topic.messageHistory.shift();
    }

    // 通知所有观察者
    topic.observers.forEach((observer) => {
      try {
        observer.callback(message);
      } catch (error) {
        console.error(`Observer ${observer.id} callback error:`, error);
      }
    });

    return true;
  }

  /**
   * 获取主题的消息历史
   */
  getMessageHistory(topicName: string, limit?: number): any[] {
    const topic = this.topics.get(topicName);
    if (!topic) return [];

    const history = topic.messageHistory;
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /**
   * 清空主题消息历史
   */
  clearHistory(topicName: string): boolean {
    const topic = this.topics.get(topicName);
    if (!topic) return false;
    topic.messageHistory = [];
    return true;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量订阅多个主题
   */
  subscribeMultiple(
    subscriptions: Array<{
      topicName: string;
      observerId: string;
      observerName: string;
      callback: (message: any) => void;
    }>
  ): { success: boolean; topicName: string }[] {
    return subscriptions.map((sub) => ({
      success: this.subscribe(sub.topicName, sub.observerId, sub.observerName, sub.callback),
      topicName: sub.topicName,
    }));
  }

  /**
   * 向多个主题广播消息
   */
  broadcastMultiple(
    broadcasts: Array<{ topicName: string; message: any }>
  ): { success: boolean; topicName: string }[] {
    return broadcasts.map((bcast) => ({
      success: this.broadcast(bcast.topicName, bcast.message),
      topicName: bcast.topicName,
    }));
  }

  // ==================== 统计信息 ====================

  /**
   * 获取全局统计
   */
  getStats(): {
    totalTopics: number;
    totalObservers: number;
    totalMessages: number;
  } {
    let totalObservers = 0;
    let totalMessages = 0;

    this.topics.forEach((topic) => {
      totalObservers += topic.observers.size;
      totalMessages += topic.messageHistory.length;
    });

    return {
      totalTopics: this.topics.size,
      totalObservers,
      totalMessages,
    };
  }

  /**
   * 导出状态 (用于序列化/持久化)
   */
  exportState(): any {
    return {
      topics: Array.from(this.topics.entries()).map(([name, topic]) => ({
        name,
        observerCount: topic.observers.size,
        messageCount: topic.messageHistory.length,
      })),
      config: this.config,
    };
  }
}

// ==================== 使用示例 ====================

/**
 * 使用示例 1: 基础用法
 */
export function example1_BasicUsage() {
  const observer = new ObserverPatternSkill();

  // 创建主题
  observer.createTopic('notifications');
  observer.createTopic('alerts');

  // 注册观察者
  observer.subscribe(
    'notifications',
    'user-1',
    'User One',
    (message) => console.log(`User One received:`, message)
  );

  observer.subscribe(
    'notifications',
    'user-2',
    'User Two',
    (message) => console.log(`User Two received:`, message)
  );

  // 广播消息
  observer.broadcast('notifications', {
    type: 'info',
    content: 'New feature available!',
    timestamp: Date.now(),
  });

  // 查看统计
  console.log('Stats:', observer.getStats());
}

/**
 * 使用示例 2: 事件驱动架构
 */
export function example2_EventDriven() {
  const observer = new ObserverPatternSkill();

  // 创建事件主题
  observer.createTopic('user.login');
  observer.createTopic('user.logout');
  observer.createTopic('system.error');

  // 日志服务订阅所有事件
  observer.subscribe('user.login', 'logger', 'Logger Service', (event) => {
    console.log(`[LOG] User ${event.userId} logged in at ${new Date(event.timestamp)}`);
  });

  observer.subscribe('user.logout', 'logger', 'Logger Service', (event) => {
    console.log(`[LOG] User ${event.userId} logged out`);
  });

  observer.subscribe('system.error', 'logger', 'Logger Service', (event) => {
    console.error(`[ERROR] ${event.errorCode}: ${event.message}`);
  });

  // 触发事件
  observer.broadcast('user.login', {
    userId: 'u123',
    timestamp: Date.now(),
    ip: '192.168.1.1',
  });

  observer.broadcast('system.error', {
    errorCode: 'E500',
    message: 'Database connection failed',
    severity: 'critical',
  });
}

/**
 * 使用示例 3: 消息过滤
 */
export function example3_MessageFiltering() {
  const observer = new ObserverPatternSkill();
  observer.createTopic('messages');

  // 只接收特定类型的消息
  observer.subscribe('messages', 'filter-user', 'Filter User', (message) => {
    if (message.priority === 'high') {
      console.log(`[HIGH PRIORITY] ${message.content}`);
    }
  });

  // 广播不同优先级的消息
  observer.broadcast('messages', { content: 'Regular update', priority: 'normal' });
  observer.broadcast('messages', { content: 'URGENT: Server down!', priority: 'high' });
}

/**
 * 使用示例 4: 多主题订阅
 */
export function example4_MultiTopicSubscription() {
  const observer = new ObserverPatternSkill();
  observer.createTopic('dev.updates');
  observer.createTopic('dev.issues');
  observer.createTopic('dev.releases');

  // 开发者订阅所有开发相关主题
  const result = observer.subscribeMultiple([
    {
      topicName: 'dev.updates',
      observerId: 'dev-1',
      observerName: 'Developer One',
      callback: (msg) => console.log(`[UPDATE] ${msg}`),
    },
    {
      topicName: 'dev.issues',
      observerId: 'dev-1',
      observerName: 'Developer One',
      callback: (msg) => console.log(`[ISSUE] ${msg}`),
    },
    {
      topicName: 'dev.releases',
      observerId: 'dev-1',
      observerName: 'Developer One',
      callback: (msg) => console.log(`[RELEASE] ${msg}`),
    },
  ]);

  console.log('Subscription results:', result);

  // 向所有主题广播
  observer.broadcastMultiple([
    { topicName: 'dev.updates', message: 'New branch created' },
    { topicName: 'dev.issues', message: 'Bug #123 fixed' },
    { topicName: 'dev.releases', message: 'v2.0.0 released' },
  ]);
}

/**
 * 使用示例 5: 与 OpenClaw message 工具集成
 */
export async function example5_OpenClawIntegration() {
  const observer = new ObserverPatternSkill();
  observer.createTopic('openclaw.notifications');

  // 订阅 OpenClaw 消息通道
  observer.subscribe('openclaw.notifications', 'message-bridge', 'Message Bridge', async (message) => {
    // 这里可以调用 message 工具发送通知
    console.log(`[OpenClaw Message] Channel: ${message.channel}, Content: ${message.content}`);
    // 实际使用时:
    // await message({ action: 'send', channel: message.channel, message: message.content });
  });

  // 广播通知
  observer.broadcast('openclaw.notifications', {
    channel: '-1002381931352',
    content: 'Task completed successfully!',
    type: 'success',
  });
}

// ==================== 导出 ====================

export default ObserverPatternSkill;
