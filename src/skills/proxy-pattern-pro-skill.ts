/**
 * 代理模式专业版工具技能 - KAEL
 * 
 * 提供代理模式的高级实现：
 * 1. 代理定义 (Proxy Definition) - 灵活的代理创建与注册
 * 2. 访问控制 (Access Control) - 强大的权限验证与拦截
 * 3. 延迟加载 (Lazy Loading) - 按需加载与缓存优化
 * 
 * 增强特性:
 * - 虚拟代理 (Virtual Proxy) - 延迟加载重型对象
 * - 保护代理 (Protection Proxy) - 访问权限控制
 * - 缓存代理 (Cache Proxy) - 结果缓存与复用
 * - 日志代理 (Logging Proxy) - 操作日志记录
 * - 智能代理 (Smart Proxy) - 自动优化与监控
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 基础代理接口
 */
export interface IProxy<T = any> {
  /** 代理名称 */
  name: string;
  /** 代理描述 */
  description?: string;
  /** 获取目标对象 */
  getTarget(): T | Promise<T>;
  /** 销毁代理 */
  destroy?(): void;
}

/**
 * 代理元数据
 */
export interface ProxyMetadata {
  /** 代理 ID */
  id: string;
  /** 代理名称 */
  name: string;
  /** 代理类型 */
  type: 'virtual' | 'protection' | 'cache' | 'logging' | 'smart';
  /** 创建时间 */
  createdAt: Date;
  /** 访问次数统计 */
  accessCount: number;
  /** 标签 */
  tags?: string[];
}

/**
 * 访问控制策略
 */
export interface AccessControlPolicy {
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description?: string;
  /** 允许的角色列表 */
  allowedRoles?: string[];
  /** 允许的用户 ID 列表 */
  allowedUsers?: string[];
  /** 拒绝的用户 ID 列表 */
  deniedUsers?: string[];
  /** 访问时间窗口 (开始时间，24 小时制) */
  timeWindowStart?: string;
  /** 访问时间窗口 (结束时间，24 小时制) */
  timeWindowEnd?: string;
  /** 最大访问次数限制 */
  maxAccessCount?: number;
  /** 自定义验证函数 */
  customValidator?: (context: AccessContext) => boolean | Promise<boolean>;
}

/**
 * 访问上下文
 */
export interface AccessContext {
  /** 用户 ID */
  userId?: string;
  /** 用户角色 */
  userRole?: string;
  /** 访问时间 */
  accessTime: Date;
  /** 访问的操作类型 */
  operation?: string;
  /** 额外上下文数据 */
  metadata?: Record<string, any>;
}

/**
 * 访问控制结果
 */
export interface AccessControlResult {
  /** 是否允许访问 */
  allowed: boolean;
  /** 拒绝原因 */
  denialReason?: string;
  /** 应用的政策 */
  appliedPolicies?: string[];
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 缓存键生成函数 */
  keyGenerator?: (...args: any[]) => string;
  /** 缓存过期时间 (毫秒) */
  ttl?: number;
  /** 最大缓存条目数 */
  maxEntries?: number;
  /** 缓存策略 */
  strategy?: 'lru' | 'lfu' | 'fifo';
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
  /** 缓存数据 */
  data: T;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
  /** 访问次数 */
  accessCount: number;
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  /** 是否记录方法调用 */
  logMethodCalls?: boolean;
  /** 是否记录参数 */
  logParameters?: boolean;
  /** 是否记录返回值 */
  logReturnValues?: boolean;
  /** 是否记录错误 */
  logErrors?: boolean;
  /** 日志级别 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 自定义日志函数 */
  logger?: (message: string, level: string, metadata?: any) => void;
}

/**
 * 延迟加载配置
 */
export interface LazyLoadConfig {
  /** 是否启用延迟加载 */
  enabled?: boolean;
  /** 加载超时时间 (毫秒) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试间隔 (毫秒) */
  retryInterval?: number;
  /** 加载失败回调 */
  onLoadError?: (error: Error) => void;
}

// ============================================
// 代理注册中心
// ============================================

/**
 * 代理注册中心 - 管理所有代理实例
 */
export class ProxyRegistry {
  private static instance: ProxyRegistry;
  private proxies: Map<string, IProxy> = new Map();
  private metadata: Map<string, ProxyMetadata> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ProxyRegistry {
    if (!ProxyRegistry.instance) {
      ProxyRegistry.instance = new ProxyRegistry();
    }
    return ProxyRegistry.instance;
  }

  /**
   * 注册代理
   */
  register<T>(proxy: IProxy<T>, metadata?: Partial<ProxyMetadata>): void {
    const id = metadata?.id || proxy.name || `proxy_${Date.now()}`;
    
    this.proxies.set(id, proxy);
    this.metadata.set(id, {
      id,
      name: proxy.name,
      type: 'smart',
      createdAt: new Date(),
      accessCount: 0,
      tags: [],
      ...metadata,
    });
  }

  /**
   * 获取代理
   */
  get<T>(id: string): IProxy<T> | undefined {
    const proxy = this.proxies.get(id);
    if (proxy) {
      const meta = this.metadata.get(id);
      if (meta) {
        meta.accessCount++;
      }
    }
    return proxy as IProxy<T> | undefined;
  }

  /**
   * 注销代理
   */
  unregister(id: string): boolean {
    const proxy = this.proxies.get(id);
    if (proxy?.destroy) {
      proxy.destroy();
    }
    return this.proxies.delete(id) && this.metadata.delete(id);
  }

  /**
   * 列出所有代理
   */
  list(): ProxyMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * 查找代理
   */
  find(query: { name?: string; type?: string; tags?: string[] }): ProxyMetadata[] {
    return Array.from(this.metadata.values()).filter(meta => {
      if (query.name && !meta.name?.includes(query.name)) return false;
      if (query.type && meta.type !== query.type) return false;
      if (query.tags?.length && !query.tags.some(tag => meta.tags?.includes(tag))) return false;
      return true;
    });
  }

  /**
   * 清空所有代理
   */
  clear(): void {
    this.proxies.forEach(proxy => proxy.destroy?.());
    this.proxies.clear();
    this.metadata.clear();
  }
}

// ============================================
// 访问控制代理
// ============================================

/**
 * 访问控制代理 - 实现保护代理模式
 */
export class AccessControlProxy<T> implements IProxy<T> {
  readonly name: string;
  readonly description?: string;
  
  private target: T | (() => T | Promise<T>);
  private policies: AccessControlPolicy[] = [];
  private accessLog: Array<{ context: AccessContext; result: AccessControlResult; timestamp: Date }> = [];

  constructor(
    target: T | (() => T | Promise<T>),
    name: string,
    description?: string
  ) {
    this.target = target;
    this.name = name;
    this.description = description;
  }

  /**
   * 添加访问控制策略
   */
  addPolicy(policy: AccessControlPolicy): this {
    this.policies.push(policy);
    return this;
  }

  /**
   * 添加多个策略
   */
  addPolicies(policies: AccessControlPolicy[]): this {
    this.policies.push(...policies);
    return this;
  }

  /**
   * 检查访问权限
   */
  async checkAccess(context: AccessContext): Promise<AccessControlResult> {
    const appliedPolicies: string[] = [];

    for (const policy of this.policies) {
      // 检查角色限制
      if (policy.allowedRoles?.length && !policy.allowedRoles.includes(context.userRole || '')) {
        return {
          allowed: false,
          denialReason: `Role "${context.userRole}" not allowed by policy "${policy.name}"`,
          appliedPolicies: [...appliedPolicies, policy.name],
        };
      }

      // 检查用户白名单
      if (policy.allowedUsers?.length && !policy.allowedUsers.includes(context.userId || '')) {
        return {
          allowed: false,
          denialReason: `User "${context.userId}" not in allowed list for policy "${policy.name}"`,
          appliedPolicies: [...appliedPolicies, policy.name],
        };
      }

      // 检查用户黑名单
      if (policy.deniedUsers?.includes(context.userId || '')) {
        return {
          allowed: false,
          denialReason: `User "${context.userId}" is denied by policy "${policy.name}"`,
          appliedPolicies: [...appliedPolicies, policy.name],
        };
      }

      // 检查时间窗口
      if (policy.timeWindowStart || policy.timeWindowEnd) {
        const now = context.accessTime;
        const start = policy.timeWindowStart ? this.parseTime(policy.timeWindowStart) : 0;
        const end = policy.timeWindowEnd ? this.parseTime(policy.timeWindowEnd) : 24 * 60 * 60 * 1000;
        const currentTime = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000;

        if (currentTime < start || currentTime > end) {
          return {
            allowed: false,
            denialReason: `Access outside time window for policy "${policy.name}"`,
            appliedPolicies: [...appliedPolicies, policy.name],
          };
        }
      }

      // 检查访问次数限制
      if (policy.maxAccessCount !== undefined) {
        const userAccessCount = this.accessLog.filter(
          log => log.context.userId === context.userId && 
                 log.result.allowed &&
                 log.timestamp.toDateString() === new Date().toDateString()
        ).length;

        if (userAccessCount >= policy.maxAccessCount) {
          return {
            allowed: false,
            denialReason: `Max access count (${policy.maxAccessCount}) exceeded for policy "${policy.name}"`,
            appliedPolicies: [...appliedPolicies, policy.name],
          };
        }
      }

      // 执行自定义验证
      if (policy.customValidator) {
        const isValid = await policy.customValidator(context);
        if (!isValid) {
          return {
            allowed: false,
            denialReason: `Custom validation failed for policy "${policy.name}"`,
            appliedPolicies: [...appliedPolicies, policy.name],
          };
        }
      }

      appliedPolicies.push(policy.name);
    }

    return {
      allowed: true,
      appliedPolicies,
    };
  }

  /**
   * 获取目标对象 (带访问控制)
   */
  async getTarget(context?: AccessContext): Promise<T> {
    const accessContext: AccessContext = context || {
      accessTime: new Date(),
    };

    const result = await this.checkAccess(accessContext);
    
    // 记录访问日志
    this.accessLog.push({
      context: accessContext,
      result,
      timestamp: new Date(),
    });

    if (!result.allowed) {
      throw new Error(`Access denied: ${result.denialReason}`);
    }

    // 获取目标对象
    if (typeof this.target === 'function') {
      return await (this.target as any)();
    }
    return this.target;
  }

  /**
   * 获取访问日志
   */
  getAccessLog(limit?: number): Array<{ context: AccessContext; result: AccessControlResult; timestamp: Date }> {
    if (limit) {
      return this.accessLog.slice(-limit);
    }
    return [...this.accessLog];
  }

  /**
   * 清空访问日志
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.clearAccessLog();
    this.policies = [];
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 * 60 * 1000 + (minutes || 0) * 60 * 1000 + (seconds || 0) * 1000;
  }
}

// ============================================
// 延迟加载代理
// ============================================

/**
 * 延迟加载代理 - 实现虚拟代理模式
 */
export class LazyLoadProxy<T> implements IProxy<T> {
  readonly name: string;
  readonly description?: string;

  private factory: () => T | Promise<T>;
  private loadedValue: T | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<T> | null = null;
  private config: Required<LazyLoadConfig>;

  constructor(
    factory: () => T | Promise<T>,
    name: string,
    description?: string,
    config?: LazyLoadConfig
  ) {
    this.factory = factory;
    this.name = name;
    this.description = description;
    this.config = {
      enabled: true,
      timeout: 30000,
      retries: 3,
      retryInterval: 1000,
      onLoadError: undefined,
      ...config,
    };
  }

  /**
   * 获取目标对象 (延迟加载)
   */
  async getTarget(): Promise<T> {
    if (!this.config.enabled) {
      return await this.factory();
    }

    // 如果已加载，直接返回
    if (this.loadedValue !== null) {
      return this.loadedValue;
    }

    // 如果正在加载，等待现有加载完成
    if (this.isLoading && this.loadPromise) {
      return await this.loadPromise;
    }

    // 开始加载
    this.isLoading = true;
    this.loadPromise = this.loadWithRetry();

    try {
      this.loadedValue = await this.loadPromise;
      return this.loadedValue;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * 带重试的加载
   */
  private async loadWithRetry(): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const result = await this.executeWithTimeout();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries - 1) {
          // 等待后重试
          await this.sleep(this.config.retryInterval);
        }
      }
    }

    // 所有重试失败
    this.config.onLoadError?.(lastError!);
    throw lastError;
  }

  /**
   * 带超时控制的执行
   */
  private async executeWithTimeout(): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Load timeout after ${this.config.timeout}ms`)), this.config.timeout);
    });

    const resultPromise = Promise.resolve(this.factory());
    
    return Promise.race([resultPromise, timeoutPromise]);
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loadedValue !== null;
  }

  /**
   * 强制重新加载
   */
  async reload(): Promise<T> {
    this.loadedValue = null;
    return await this.getTarget();
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.loadedValue = null;
    this.loadPromise = null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// 缓存代理
// ============================================

/**
 * 缓存代理 - 实现缓存代理模式
 */
export class CacheProxy<T extends Record<string, any>> implements IProxy<T> {
  readonly name: string;
  readonly description?: string;

  private target: T;
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;

  constructor(
    target: T,
    name: string,
    description?: string,
    config?: CacheConfig
  ) {
    this.target = target;
    this.name = name;
    this.description = description;
    this.config = {
      keyGenerator: (...args) => args.map(a => JSON.stringify(a)).join(':'),
      ttl: 300000, // 5 分钟
      maxEntries: 100,
      strategy: 'lru',
      ...config,
    };
  }

  /**
   * 执行带缓存的方法调用
   */
  async execute<K extends keyof T>(
    method: K,
    ...args: any[]
  ): Promise<ReturnType<T[K]>> {
    const cacheKey = this.config.keyGenerator(method as string, ...args);
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      cached.lastAccessedAt = Date.now();
      cached.accessCount++;
      return cached.data as ReturnType<T[K]>;
    }

    // 执行方法
    const methodFn = this.target[method] as Function;
    if (!methodFn) {
      throw new Error(`Method "${String(method)}" not found`);
    }

    const result = await methodFn.apply(this.target, args);

    // 缓存结果
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * 获取目标对象
   */
  getTarget(): T {
    return this.target;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxEntries) {
      this.evictCache();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
    });
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.config.ttl;
  }

  /**
   * 驱逐缓存条目
   */
  private evictCache(): void {
    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private evictLFU(): void {
    let leastUsedKey: string | null = null;
    let leastCount = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  private evictFIFO(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定键的缓存
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; hits: number; misses: number } {
    let hits = 0;
    let misses = 0;

    this.cache.forEach(entry => {
      hits += entry.accessCount - 1; // 第一次访问不算命中
    });
    misses = this.cache.size;

    return {
      size: this.cache.size,
      hits,
      misses,
    };
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.clearCache();
  }
}

// ============================================
// 日志代理
// ============================================

/**
 * 日志代理 - 实现日志记录代理模式
 */
export class LoggingProxy<T extends Record<string, any>> implements IProxy<T> {
  readonly name: string;
  readonly description?: string;

  private target: T;
  private config: Required<LoggingConfig>;
  private logs: Array<{
    timestamp: Date;
    method: string;
    args?: any[];
    result?: any;
    error?: Error;
    duration: number;
  }> = [];

  constructor(
    target: T,
    name: string,
    description?: string,
    config?: LoggingConfig
  ) {
    this.target = target;
    this.name = name;
    this.description = description;
    this.config = {
      logMethodCalls: true,
      logParameters: true,
      logReturnValues: false,
      logErrors: true,
      level: 'info',
      logger: undefined,
      ...config,
    };
  }

  /**
   * 执行带日志的方法调用
   */
  async execute<K extends keyof T>(
    method: K,
    ...args: any[]
  ): Promise<ReturnType<T[K]>> {
    const startTime = Date.now();
    const methodName = String(method);

    if (this.config.logMethodCalls) {
      this.log('info', `Calling method: ${methodName}`, {
        method: methodName,
        args: this.config.logParameters ? args : undefined,
      });
    }

    try {
      const methodFn = this.target[method] as Function;
      if (!methodFn) {
        throw new Error(`Method "${methodName}" not found`);
      }

      const result = await methodFn.apply(this.target, args);
      const duration = Date.now() - startTime;

      if (this.config.logReturnValues) {
        this.log('info', `Method completed: ${methodName}`, {
          method: methodName,
          result,
          duration,
        });
      } else {
        this.log('info', `Method completed: ${methodName}`, {
          method: methodName,
          duration,
        });
      }

      // 记录日志
      this.logs.push({
        timestamp: new Date(),
        method: methodName,
        args: this.config.logParameters ? args : undefined,
        result: this.config.logReturnValues ? result : undefined,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.config.logErrors) {
        this.log('error', `Method failed: ${methodName}`, {
          method: methodName,
          error: error as Error,
          duration,
        });
      }

      // 记录错误日志
      this.logs.push({
        timestamp: new Date(),
        method: methodName,
        args: this.config.logParameters ? args : undefined,
        error: error as Error,
        duration,
      });

      throw error;
    }
  }

  /**
   * 获取目标对象
   */
  getTarget(): T {
    return this.target;
  }

  /**
   * 记录日志
   */
  private log(level: string, message: string, metadata?: any): void {
    if (this.config.logger) {
      this.config.logger(message, level, metadata);
    } else {
      const logLevel = this.config.level;
      const levels = ['debug', 'info', 'warn', 'error'];
      
      if (levels.indexOf(level) >= levels.indexOf(logLevel)) {
        console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
      }
    }
  }

  /**
   * 获取日志
   */
  getLogs(limit?: number): Array<{
    timestamp: Date;
    method: string;
    args?: any[];
    result?: any;
    error?: Error;
    duration: number;
  }> {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.clearLogs();
  }
}

// ============================================
// 智能代理 (组合代理)
// ============================================

/**
 * 智能代理 - 组合多种代理功能
 */
export class SmartProxy<T extends Record<string, any>> implements IProxy<T> {
  readonly name: string;
  readonly description?: string;

  private target: T;
  private accessControl?: AccessControlProxy<T>;
  private cache?: CacheProxy<T>;
  private logging?: LoggingProxy<T>;
  private lazyLoad?: LazyLoadProxy<T>;

  constructor(
    target: T | (() => T | Promise<T>),
    name: string,
    description?: string
  ) {
    if (typeof target === 'function') {
      this.lazyLoad = new LazyLoadProxy(target as any, `${name}-lazy`, 'Lazy loading layer');
      this.target = {} as T; // 占位符
    } else {
      this.target = target;
    }
    this.name = name;
    this.description = description;
  }

  /**
   * 启用访问控制
   */
  withAccessControl(policies: AccessControlPolicy[]): this {
    this.accessControl = new AccessControlProxy(this.target, `${this.name}-access`, 'Access control layer');
    this.accessControl.addPolicies(policies);
    return this;
  }

  /**
   * 启用缓存
   */
  withCache(config?: CacheConfig): this {
    this.cache = new CacheProxy(this.target, `${this.name}-cache`, 'Cache layer', config);
    return this;
  }

  /**
   * 启用日志
   */
  withLogging(config?: LoggingConfig): this {
    this.logging = new LoggingProxy(this.target, `${this.name}-logging`, 'Logging layer', config);
    return this;
  }

  /**
   * 执行方法调用 (通过所有启用的代理层)
   */
  async execute<K extends keyof T>(
    method: K,
    ...args: any[]
  ): Promise<ReturnType<T[K]>> {
    // 1. 如果需要延迟加载，先获取目标对象
    let actualTarget = this.target;
    if (this.lazyLoad) {
      actualTarget = await this.lazyLoad.getTarget();
    }

    // 2. 访问控制检查
    if (this.accessControl) {
      await this.accessControl.getTarget({ accessTime: new Date() });
    }

    // 3. 缓存执行
    if (this.cache) {
      return await this.cache.execute(method, ...args);
    }

    // 4. 日志执行
    if (this.logging) {
      return await this.logging.execute(method, ...args);
    }

    // 5. 直接执行
    const methodFn = actualTarget[method] as Function;
    if (!methodFn) {
      throw new Error(`Method "${String(method)}" not found`);
    }

    return await methodFn.apply(actualTarget, args);
  }

  /**
   * 获取目标对象
   */
  async getTarget(): Promise<T> {
    if (this.lazyLoad) {
      return await this.lazyLoad.getTarget();
    }
    return this.target;
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.accessControl?.destroy();
    this.cache?.destroy();
    this.logging?.destroy();
    this.lazyLoad?.destroy();
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建访问控制代理
 */
export function createAccessProxy<T>(
  target: T | (() => T | Promise<T>),
  name: string,
  policies: AccessControlPolicy[]
): AccessControlProxy<T> {
  const proxy = new AccessControlProxy(target, name);
  proxy.addPolicies(policies);
  return proxy;
}

/**
 * 创建延迟加载代理
 */
export function createLazyProxy<T>(
  factory: () => T | Promise<T>,
  name: string,
  config?: LazyLoadConfig
): LazyLoadProxy<T> {
  return new LazyLoadProxy(factory, name, undefined, config);
}

/**
 * 创建缓存代理
 */
export function createCacheProxy<T extends Record<string, any>>(
  target: T,
  name: string,
  config?: CacheConfig
): CacheProxy<T> {
  return new CacheProxy(target, name, undefined, config);
}

/**
 * 创建日志代理
 */
export function createLoggingProxy<T extends Record<string, any>>(
  target: T,
  name: string,
  config?: LoggingConfig
): LoggingProxy<T> {
  return new LoggingProxy(target, name, undefined, config);
}

/**
 * 创建智能代理
 */
export function createSmartProxy<T extends Record<string, any>>(
  target: T | (() => T | Promise<T>),
  name: string
): SmartProxy<T> {
  return new SmartProxy(target, name);
}

// ============================================
// 使用示例
// ============================================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * // 1. 访问控制代理示例
 * const secureService = createAccessProxy(
 *   new DatabaseService(),
 *   'database-access',
 *   [
 *     {
 *       name: 'admin-only',
 *       allowedRoles: ['admin'],
 *     },
 *     {
 *       name: 'business-hours',
 *       timeWindowStart: '09:00:00',
 *       timeWindowEnd: '18:00:00',
 *     }
 *   ]
 * );
 * 
 * // 2. 延迟加载代理示例
 * const lazyConfig = createLazyProxy(
 *   () => loadHeavyConfig(),
 *   'config-loader',
 *   { timeout: 10000, retries: 3 }
 * );
 * 
 * // 3. 缓存代理示例
 * const cachedAPI = createCacheProxy(
 *   new APIService(),
 *   'api-cache',
 *   { ttl: 60000, strategy: 'lru' }
 * );
 * 
 * // 4. 日志代理示例
 * const loggedService = createLoggingProxy(
 *   new PaymentService(),
 *   'payment-logging',
 *   { logMethodCalls: true, logErrors: true }
 * );
 * 
 * // 5. 智能代理示例 (组合所有功能)
 * const smartService = createSmartProxy(
 *   () => loadUserService(),
 *   'user-service'
 * )
 *   .withAccessControl([{ name: 'auth', allowedRoles: ['user', 'admin'] }])
 *   .withCache({ ttl: 300000 })
 *   .withLogging({ logMethodCalls: true });
 * 
 * // 使用方法
 * const result = await smartService.execute('getUserData', userId);
 * ```
 */
