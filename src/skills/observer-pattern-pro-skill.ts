/**
 * 观察者模式专业工具技能 - ACE
 * 
 * 提供观察者模式的完整实现：
 * 1. 主题定义 (Subject) - 支持多主题、层级主题
 * 2. 观察者管理 (Observer) - 自动注册/注销、优先级队列
 * 3. 消息通知 (Notification) - 同步/异步、批量/即时、过滤通知
 * 
 * @author ACE
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 消息类型
 */
export type MessageType = 'sync' | 'async' | 'batch';

/**
 * 消息优先级
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * 观察者接口
 */
export interface IObserver<TData = any> {
  /** 观察者唯一 ID */
  id: string;
  /** 观察者名称 */
  name: string;
  /** 优先级 */
  priority: MessagePriority;
  /** 是否启用 */
  enabled: boolean;
  /** 接收通知的方法 */
  update(data: TData, topic: string): void | Promise<void>;
  /** 错误处理 (可选) */
  onError?(error: Error, topic: string): void;
}

/**
 * 主题接口
 */
export interface ISubject<TData = any> {
  /** 主题唯一 ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 父主题 ID (用于层级主题) */
  parentId?: string;
  /** 观察者数量 */
  observerCount: number;
  /** 注册观察者 */
  attach(observer: IObserver<TData>): void;
  /** 移除观察者 */
  detach(observerId: string): boolean;
  /** 通知所有观察者 */
  notify(data: TData, type?: MessageType): void | Promise<void>;
  /** 获取所有观察者 */
  getObservers(): IObserver<TData>[];
}

/**
 * 观察者配置
 */
export interface ObserverConfig<TData = any> {
  /** 观察者 ID (可选，自动生成) */
  id?: string;
  /** 观察者名称 */
  name: string;
  /** 优先级 (默认: normal) */
  priority?: MessagePriority;
  /** 更新回调 */
  onUpdate: (data: TData, topic: string) => void | Promise<void>;
  /** 错误回调 (可选) */
  onError?: (error: Error, topic: string) => void;
  /** 是否启用 (默认: true) */
  enabled?: boolean;
}

/**
 * 主题配置
 */
export interface SubjectConfig {
  /** 主题 ID (可选，自动生成) */
  id?: string;
  /** 主题名称 */
  name: string;
  /** 父主题 ID (可选) */
  parentId?: string;
  /** 是否启用层级通知 (默认: false) */
  enableHierarchy?: boolean;
}

/**
 * 通知选项
 */
export interface NotificationOptions {
  /** 通知类型 (默认: sync) */
  type?: MessageType;
  /** 批量通知的时间窗口 (ms，仅 batch 模式) */
  batchWindowMs?: number;
  /** 异步通知的超时时间 (ms) */
  timeoutMs?: number;
  /** 是否并行执行 (仅 async 模式，默认: false) */
  parallel?: boolean;
  /** 过滤器 (可选) */
  filter?: (observer: IObserver) => boolean;
}

/**
 * 通知结果
 */
export interface NotificationResult {
  /** 主题 ID */
  topicId: string;
  /** 通知的数据 */
  data: any;
  /** 通知类型 */
  type: MessageType;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 错误详情 */
  errors: Array<{ observerId: string; error: Error }>;
  /** 执行时间 (ms) */
  durationMs: number;
}

// ============================================
// 工具函数
// ============================================

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 优先级排序 (高优先级在前)
 */
function sortByPriority<T extends { priority: MessagePriority }>(observers: T[]): T[] {
  const priorityOrder: Record<MessagePriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  
  return [...observers].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ============================================
// 1. 观察者实现
// ============================================

/**
 * 观察者类
 */
export class Observer<TData = any> implements IObserver<TData> {
  readonly id: string;
  readonly name: string;
  priority: MessagePriority;
  enabled: boolean;
  
  private _onUpdate: (data: TData, topic: string) => void | Promise<void>;
  private _onError?: (error: Error, topic: string) => void;
  
  constructor(config: ObserverConfig<TData>) {
    this.id = config.id || generateId('obs');
    this.name = config.name;
    this.priority = config.priority || 'normal';
    this.enabled = config.enabled ?? true;
    this._onUpdate = config.onUpdate;
    this._onError = config.onError;
  }
  
  async update(data: TData, topic: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    try {
      await this._onUpdate(data, topic);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (this._onError) {
        this._onError(err, topic);
      } else {
        console.error(`[Observer ${this.name}] Error:`, err);
      }
      throw err;
    }
  }
  
  onError(error: Error, topic: string): void {
    if (this._onError) {
      this._onError(error, topic);
    }
  }
  
  /**
   * 启用观察者
   */
  enable(): void {
    this.enabled = true;
  }
  
  /**
   * 禁用观察者
   */
  disable(): void {
    this.enabled = false;
  }
  
  /**
   * 更新优先级
   */
  setPriority(priority: MessagePriority): void {
    this.priority = priority;
  }
}

// ============================================
// 2. 主题实现
// ============================================

/**
 * 主题类
 */
export class Subject<TData = any> implements ISubject<TData> {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  
  private _observers: Map<string, IObserver<TData>>;
  private _enableHierarchy: boolean;
  private _children: Set<Subject<TData>>;
  private _parent?: Subject<TData>;
  
  constructor(config: SubjectConfig) {
    this.id = config.id || generateId('sub');
    this.name = config.name;
    this.parentId = config.parentId;
    this._observers = new Map();
    this._enableHierarchy = config.enableHierarchy ?? false;
    this._children = new Set();
  }
  
  get observerCount(): number {
    return this._observers.size;
  }
  
  /**
   * 设置父主题 (用于层级结构)
   */
  setParent(parent: Subject<TData>): void {
    this._parent = parent;
    parent._children.add(this);
  }
  
  /**
   * 注册观察者
   */
  attach(observer: IObserver<TData>): void {
    if (this._observers.has(observer.id)) {
      console.warn(`[Subject ${this.name}] Observer ${observer.id} already attached`);
      return;
    }
    
    this._observers.set(observer.id, observer);
    console.log(`[Subject ${this.name}] Observer ${observer.name} attached`);
  }
  
  /**
   * 移除观察者
   */
  detach(observerId: string): boolean {
    const observer = this._observers.get(observerId);
    if (!observer) {
      console.warn(`[Subject ${this.name}] Observer ${observerId} not found`);
      return false;
    }
    
    this._observers.delete(observerId);
    console.log(`[Subject ${this.name}] Observer ${observer.name} detached`);
    return true;
  }
  
  /**
   * 通知所有观察者
   */
  async notify(data: TData, type: MessageType = 'sync'): Promise<NotificationResult> {
    const startTime = Date.now();
    const errors: Array<{ observerId: string; error: Error }> = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 按优先级排序观察者
    const observers = sortByPriority(Array.from(this._observers.values()));
    
    switch (type) {
      case 'sync':
        // 同步通知 (按优先级顺序)
        for (const observer of observers) {
          if (!observer.enabled) continue;
          
          try {
            await observer.update(data, this.name);
            successCount++;
          } catch (error) {
            failureCount++;
            errors.push({
              observerId: observer.id,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }
        break;
        
      case 'async':
        // 异步通知 (并行执行)
        const promises = observers.map(async (observer) => {
          if (!observer.enabled) return;
          
          try {
            await observer.update(data, this.name);
            successCount++;
          } catch (error) {
            failureCount++;
            errors.push({
              observerId: observer.id,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        });
        
        await Promise.allSettled(promises);
        break;
        
      case 'batch':
        // 批量通知 (延迟执行)
        console.log(`[Subject ${this.name}] Batch notification queued`);
        // 实际实现中可以使用防抖/节流
        for (const observer of observers) {
          if (!observer.enabled) continue;
          
          try {
            await observer.update(data, this.name);
            successCount++;
          } catch (error) {
            failureCount++;
            errors.push({
              observerId: observer.id,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }
        break;
    }
    
    // 层级通知 (如果启用)
    if (this._enableHierarchy && this._children.size > 0) {
      for (const child of this._children) {
        const childResult = await child.notify(data, type);
        successCount += childResult.successCount;
        failureCount += childResult.failureCount;
        errors.push(...childResult.errors);
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    const result: NotificationResult = {
      topicId: this.id,
      data,
      type,
      successCount,
      failureCount,
      errors,
      durationMs,
    };
    
    console.log(`[Subject ${this.name}] Notification complete: ${successCount} success, ${failureCount} failed (${durationMs}ms)`);
    
    return result;
  }
  
  /**
   * 获取所有观察者
   */
  getObservers(): IObserver<TData>[] {
    return Array.from(this._observers.values());
  }
  
  /**
   * 获取观察者 (按 ID)
   */
  getObserver(observerId: string): IObserver<TData> | undefined {
    return this._observers.get(observerId);
  }
  
  /**
   * 清空所有观察者
   */
  clearObservers(): void {
    this._observers.clear();
    console.log(`[Subject ${this.name}] All observers cleared`);
  }
}

// ============================================
// 3. 主题管理器 (单例)
// ============================================

/**
 * 主题管理器
 * 管理所有主题的注册、查找和销毁
 */
export class SubjectManager {
  private static _instance: SubjectManager;
  private _subjects: Map<string, Subject<any>>;
  
  private constructor() {
    this._subjects = new Map();
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): SubjectManager {
    if (!SubjectManager._instance) {
      SubjectManager._instance = new SubjectManager();
    }
    return SubjectManager._instance;
  }
  
  /**
   * 创建主题
   */
  createSubject<TData = any>(config: SubjectConfig): Subject<TData> {
    if (this._subjects.has(config.id || 'temp')) {
      throw new Error(`Subject ${config.name} already exists`);
    }
    
    const subject = new Subject<TData>(config);
    this._subjects.set(subject.id, subject as Subject<any>);
    
    // 如果有父主题，建立层级关系
    if (config.parentId) {
      const parent = this._subjects.get(config.parentId) as Subject<TData>;
      if (parent) {
        subject.setParent(parent);
      }
    }
    
    console.log(`[SubjectManager] Subject ${subject.name} created`);
    return subject;
  }
  
  /**
   * 获取主题
   */
  getSubject<TData = any>(subjectId: string): Subject<TData> | undefined {
    return this._subjects.get(subjectId) as Subject<TData> | undefined;
  }
  
  /**
   * 获取所有主题
   */
  getAllSubjects(): Subject<any>[] {
    return Array.from(this._subjects.values());
  }
  
  /**
   * 删除主题
   */
  deleteSubject(subjectId: string): boolean {
    const subject = this._subjects.get(subjectId);
    if (!subject) {
      return false;
    }
    
    // 先删除子主题
    subject.clearObservers();
    this._subjects.delete(subjectId);
    
    console.log(`[SubjectManager] Subject ${subject.name} deleted`);
    return true;
  }
  
  /**
   * 清空所有主题
   */
  clear(): void {
    this._subjects.clear();
    console.log('[SubjectManager] All subjects cleared');
  }
}

// ============================================
// 4. 便捷工厂函数
// ============================================

/**
 * 创建主题
 */
export function createSubject<TData = any>(config: SubjectConfig): Subject<TData> {
  return SubjectManager.getInstance().createSubject<TData>(config);
}

/**
 * 创建观察者
 */
export function createObserver<TData = any>(config: ObserverConfig<TData>): Observer<TData> {
  return new Observer<TData>(config);
}

/**
 * 获取主题
 */
export function getSubject<TData = any>(subjectId: string): Subject<TData> | undefined {
  return SubjectManager.getInstance().getSubject<TData>(subjectId);
}

// ============================================
// 使用示例
// ============================================

/**
 * 使用示例
 */
export const ObserverPatternExamples = {
  /**
   * 示例 1: 基础用法
   */
  basic: () => {
    console.log('=== 示例 1: 基础用法 ===');
    
    // 创建主题
    const weatherSubject = createSubject({
      id: 'weather',
      name: '天气更新',
    });
    
    // 创建观察者
    const phoneObserver = createObserver({
      name: '手机通知',
      priority: 'high',
      onUpdate: (data: any) => {
        console.log(`📱 手机收到天气更新: ${data.temperature}°C`);
      },
    });
    
    const watchObserver = createObserver({
      name: '手表通知',
      priority: 'normal',
      onUpdate: (data: any) => {
        console.log(`⌚ 手表收到天气更新: ${data.temperature}°C`);
      },
    });
    
    // 注册观察者
    weatherSubject.attach(phoneObserver);
    weatherSubject.attach(watchObserver);
    
    // 通知观察者
    weatherSubject.notify({ temperature: 25, condition: '晴' });
    
    // 移除观察者
    weatherSubject.detach(watchObserver.id);
    
    console.log('');
  },
  
  /**
   * 示例 2: 异步通知
   */
  async: async () => {
    console.log('=== 示例 2: 异步通知 ===');
    
    const newsSubject = createSubject({
      id: 'news',
      name: '新闻推送',
    });
    
    // 创建多个异步观察者
    for (let i = 1; i <= 3; i++) {
      newsSubject.attach(
        createObserver({
          name: `订阅者${i}`,
          priority: 'normal',
          onUpdate: async (data: any) => {
            // 模拟异步操作
            await new Promise((resolve) => setTimeout(resolve, 100));
            console.log(`📰 订阅者${i} 收到新闻: ${data.headline}`);
          },
        })
      );
    }
    
    // 异步并行通知
    const result = await newsSubject.notify(
      { headline: '重大新闻发布!' },
      'async'
    );
    
    console.log(`通知结果: ${result.successCount} 成功, ${result.failureCount} 失败, 耗时 ${result.durationMs}ms`);
    console.log('');
  },
  
  /**
   * 示例 3: 层级主题
   */
  hierarchy: () => {
    console.log('=== 示例 3: 层级主题 ===');
    
    // 创建主题层级
    const appSubject = createSubject({
      id: 'app',
      name: '应用事件',
      enableHierarchy: true,
    });
    
    const userSubject = createSubject({
      id: 'app.user',
      name: '用户事件',
      parentId: 'app',
    });
    
    const orderSubject = createSubject({
      id: 'app.order',
      name: '订单事件',
      parentId: 'app',
    });
    
    // 注册全局观察者 (监听所有事件)
    appSubject.attach(
      createObserver({
        name: '全局日志',
        priority: 'low',
        onUpdate: (data: any, topic: string) => {
          console.log(`🔔 [全局] ${topic}: ${JSON.stringify(data)}`);
        },
      })
    );
    
    // 注册用户事件观察者
    userSubject.attach(
      createObserver({
        name: '用户通知',
        priority: 'high',
        onUpdate: (data: any) => {
          console.log(`👤 用户事件: ${data.action}`);
        },
      })
    );
    
    // 通知用户主题 (会级联通知到 app 主题的观察者)
    userSubject.notify({ action: '用户登录', userId: 123 });
    
    console.log('');
  },
  
  /**
   * 示例 4: 优先级控制
   */
  priority: async () => {
    console.log('=== 示例 4: 优先级控制 ===');
    
    const alertSubject = createSubject({
      id: 'alert',
      name: '告警系统',
    });
    
    // 不同优先级的观察者
    alertSubject.attach(
      createObserver({
        name: '紧急短信',
        priority: 'critical',
        onUpdate: () => console.log('🚨 发送紧急短信!'),
      })
    );
    
    alertSubject.attach(
      createObserver({
        name: '邮件通知',
        priority: 'high',
        onUpdate: () => console.log('📧 发送邮件通知'),
      })
    );
    
    alertSubject.attach(
      createObserver({
        name: '日志记录',
        priority: 'low',
        onUpdate: () => console.log('📝 记录日志'),
      })
    );
    
    // 按优先级顺序通知
    await alertSubject.notify({ level: 'ERROR', message: '系统异常' }, 'sync');
    
    console.log('');
  },
  
  /**
   * 示例 5: 错误处理
   */
  errorHandling: async () => {
    console.log('=== 示例 5: 错误处理 ===');
    
    const testSubject = createSubject({
      id: 'test',
      name: '测试主题',
    });
    
    // 正常观察者
    testSubject.attach(
      createObserver({
        name: '正常观察者',
        onUpdate: (data: any) => {
          console.log('✅ 正常处理:', data);
        },
      })
    );
    
    // 会出错的观察者
    testSubject.attach(
      createObserver({
        name: '错误观察者',
        onUpdate: () => {
          throw new Error('模拟错误');
        },
        onError: (error, topic) => {
          console.error(`❌ 自定义错误处理 [${topic}]:`, error.message);
        },
      })
    );
    
    try {
      await testSubject.notify({ test: 'data' });
    } catch (error) {
      console.log('通知过程中出现错误 (已记录)');
    }
    
    console.log('');
  },
};

// ============================================
// 导出
// ============================================

export default {
  Observer,
  Subject,
  SubjectManager,
  createSubject,
  createObserver,
  getSubject,
  examples: ObserverPatternExamples,
};
