/**
 * 懒加载技能 - KAEL
 * 
 * 提供懒加载模式的核心实现：
 * 1. 懒加载代理 (Lazy Proxy) - 延迟初始化重型对象
 * 2. 虚拟代理 (Virtual Proxy) - 控制对真实对象的访问
 * 3. 加载状态管理 (Loading State) - 追踪和管理加载状态
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 加载状态枚举
 */
export enum LoadingState {
  /** 未开始加载 */
  IDLE = 'idle',
  /** 加载中 */
  LOADING = 'loading',
  /** 加载成功 */
  SUCCESS = 'success',
  /** 加载失败 */
  ERROR = 'error'
}

/**
 * 加载状态接口
 */
export interface LoadingStatus {
  /** 当前状态 */
  state: LoadingState;
  /** 进度百分比 (0-100) */
  progress?: number;
  /** 错误信息 (如果有) */
  error?: string;
  /** 加载开始时间 */
  startedAt?: number;
  /** 加载完成时间 */
  completedAt?: number;
}

/**
 * 懒加载配置
 */
export interface LazyLoadConfig<T> {
  /** 加载函数 */
  loader: () => Promise<T>;
  /** 是否立即加载 (默认 false) */
  immediate?: boolean;
  /** 加载超时时间 (毫秒) */
  timeout?: number;
  /** 重试次数 (默认 0) */
  retries?: number;
  /** 重试间隔 (毫秒) */
  retryDelay?: number;
  /** 状态变化回调 */
  onStateChange?: (state: LoadingStatus) => void;
}

/**
 * 懒加载代理接口
 */
export interface ILazyProxy<T> {
  /** 获取加载状态 */
  getStatus(): LoadingStatus;
  
  /** 手动触发加载 */
  load(): Promise<T>;
  
  /** 获取值 (如果未加载则触发加载) */
  getValue(): Promise<T>;
  
  /** 检查是否已加载 */
  isLoaded(): boolean;
  
  /** 重置 (清除已加载的值) */
  reset(): void;
  
  /** 取消加载 */
  cancel(): void;
}

/**
 * 虚拟代理配置
 */
export interface VirtualProxyConfig<T> {
  /** 真实对象创建函数 */
  factory: () => T;
  /** 访问前检查函数 (可选) */
  accessCheck?: () => boolean;
  /** 访问回调 */
  onAccess?: (instance: T) => void;
  /** 缓存实例 (默认 true) */
  cache?: boolean;
}

/**
 * 虚拟代理接口
 */
export interface IVirtualProxy<T> {
  /** 获取真实实例 */
  getInstance(): T;
  
  /** 检查是否已初始化 */
  isInitialized(): boolean;
  
  /** 强制初始化 */
  initialize(): T;
  
  /** 销毁实例 */
  destroy(): void;
}

// ============================================
// 1. 加载状态管理器
// ============================================

/**
 * 加载状态管理器
 * 追踪和管理加载过程的各个状态
 */
export class LoadingStateManager {
  private state: LoadingState = LoadingState.IDLE;
  private progress?: number;
  private error?: string;
  private startedAt?: number;
  private completedAt?: number;
  private abortController?: AbortController;
  private callbacks: Set<(status: LoadingStatus) => void> = new Set();

  /**
   * 获取当前状态
   */
  getStatus(): LoadingStatus {
    return {
      state: this.state,
      progress: this.progress,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * 设置状态为加载中
   */
  setLoading(progress?: number): void {
    this.state = LoadingState.LOADING;
    this.progress = progress;
    this.error = undefined;
    this.startedAt = Date.now();
    this.completedAt = undefined;
    this.abortController = new AbortController();
    this.notify();
  }

  /**
   * 设置状态为成功
   */
  setSuccess(): void {
    this.state = LoadingState.SUCCESS;
    this.progress = 100;
    this.completedAt = Date.now();
    this.notify();
  }

  /**
   * 设置状态为失败
   */
  setError(error: string): void {
    this.state = LoadingState.ERROR;
    this.error = error;
    this.completedAt = Date.now();
    this.notify();
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state = LoadingState.IDLE;
    this.progress = undefined;
    this.error = undefined;
    this.startedAt = undefined;
    this.completedAt = undefined;
    this.abortController = undefined;
    this.notify();
  }

  /**
   * 获取中止信号
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  /**
   * 触发中止
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * 检查是否可中止
   */
  isAbortable(): boolean {
    return this.state === LoadingState.LOADING && !this.abortController?.signal.aborted;
  }

  /**
   * 注册状态变化回调
   */
  onStateChange(callback: (status: LoadingStatus) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 通知所有回调
   */
  private notify(): void {
    const status = this.getStatus();
    this.callbacks.forEach(cb => cb(status));
  }

  /**
   * 检查是否正在加载
   */
  isLoading(): boolean {
    return this.state === LoadingState.LOADING;
  }

  /**
   * 检查是否已加载完成
   */
  isLoaded(): boolean {
    return this.state === LoadingState.SUCCESS;
  }

  /**
   * 检查是否加载失败
   */
  isError(): boolean {
    return this.state === LoadingState.ERROR;
  }

  /**
   * 获取加载耗时 (毫秒)
   */
  getLoadDuration(): number | undefined {
    if (this.startedAt && this.completedAt) {
      return this.completedAt - this.startedAt;
    }
    return undefined;
  }
}

// ============================================
// 2. 懒加载代理 (Lazy Proxy)
// ============================================

/**
 * 懒加载代理实现
 * 延迟初始化重型对象，直到真正需要时才加载
 * 
 * @example
 * // 创建一个懒加载的图片加载器
 * const imageLoader = new LazyProxy({
 *   loader: async () => {
 *     const response = await fetch('/api/heavy-image-data');
 *     return await response.json();
 *   },
 *   timeout: 5000,
 *   retries: 3,
 *   retryDelay: 1000,
 *   onStateChange: (status) => {
 *     console.log('加载状态:', status.state);
 *   }
 * });
 * 
 * // 只有在真正需要时才加载
 * const data = await imageLoader.getValue();
 */
export class LazyProxy<T> implements ILazyProxy<T> {
  private config: LazyLoadConfig<T>;
  private stateManager: LoadingStateManager;
  private cachedValue?: T;
  private loadPromise?: Promise<T>;
  private retryCount: number = 0;

  constructor(config: LazyLoadConfig<T>) {
    this.config = {
      immediate: false,
      retries: 0,
      retryDelay: 1000,
      ...config
    };
    this.stateManager = new LoadingStateManager();

    // 注册状态回调
    if (this.config.onStateChange) {
      this.stateManager.onStateChange(this.config.onStateChange);
    }

    // 如果配置为立即加载
    if (this.config.immediate) {
      this.load();
    }
  }

  /**
   * 获取加载状态
   */
  getStatus(): LoadingStatus {
    return this.stateManager.getStatus();
  }

  /**
   * 手动触发加载
   */
  async load(): Promise<T> {
    // 如果已经在加载中，返回现有 promise
    if (this.loadPromise && this.stateManager.isLoading()) {
      return this.loadPromise;
    }

    // 如果已经加载成功，返回缓存值
    if (this.cachedValue !== undefined && this.stateManager.isLoaded()) {
      return this.cachedValue;
    }

    this.stateManager.setLoading(0);
    this.retryCount = 0;

    this.loadPromise = this.executeWithRetry();
    return this.loadPromise;
  }

  /**
   * 执行加载 (带重试)
   */
  private async executeWithRetry(): Promise<T> {
    const startTime = Date.now();
    const timeout = this.config.timeout;

    try {
      const result = await this.executeLoader();
      
      // 检查是否被中止
      if (this.stateManager.getAbortSignal()?.aborted) {
        throw new Error('Loading aborted');
      }

      this.cachedValue = result;
      this.stateManager.setSuccess();
      this.loadPromise = undefined;
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 检查超时
      if (timeout && elapsed > timeout) {
        this.stateManager.setError(`Timeout after ${elapsed}ms: ${errorMsg}`);
        this.loadPromise = undefined;
        throw error;
      }

      // 检查是否可重试
      if (this.retryCount < (this.config.retries || 0)) {
        this.retryCount++;
        await this.delay(this.config.retryDelay || 1000);
        return this.executeWithRetry();
      }

      // 重试失败
      this.stateManager.setError(errorMsg);
      this.loadPromise = undefined;
      throw error;
    }
  }

  /**
   * 执行加载器
   */
  private async executeLoader(): Promise<T> {
    // 检查中止信号
    const signal = this.stateManager.getAbortSignal();
    if (signal?.aborted) {
      throw new Error('Loading aborted');
    }

    const result = await this.config.loader();
    return result;
  }

  /**
   * 获取值 (如果未加载则触发加载)
   */
  async getValue(): Promise<T> {
    if (this.cachedValue !== undefined && this.stateManager.isLoaded()) {
      return this.cachedValue;
    }
    return this.load();
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.stateManager.isLoaded() && this.cachedValue !== undefined;
  }

  /**
   * 重置 (清除已加载的值)
   */
  reset(): void {
    this.cachedValue = undefined;
    this.loadPromise = undefined;
    this.stateManager.reset();
  }

  /**
   * 取消加载
   */
  cancel(): void {
    if (this.stateManager.isAbortable()) {
      this.stateManager.abort();
      this.loadPromise = undefined;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// 3. 虚拟代理 (Virtual Proxy)
// ============================================

/**
 * 虚拟代理实现
 * 控制对真实对象的访问，在访问时才初始化
 * 
 * @example
 * // 创建一个虚拟代理来延迟初始化重型数据库连接
 * const dbProxy = new VirtualProxy({
 *   factory: () => {
 *     console.log('初始化数据库连接...');
 *     return new HeavyDatabaseConnection();
 *   },
 *   accessCheck: () => {
 *     // 检查是否有权限访问
 *     return user.isAuthenticated();
 *   },
 *   onAccess: (instance) => {
 *     console.log('访问数据库实例');
 *   }
 * });
 * 
 * // 只有在第一次访问时才会初始化
 * const db = dbProxy.getInstance();
 * db.query('SELECT * FROM users');
 */
export class VirtualProxy<T extends object> implements IVirtualProxy<T> {
  private config: VirtualProxyConfig<T>;
  private instance?: T;
  private isInitializing: boolean = false;

  constructor(config: VirtualProxyConfig<T>) {
    this.config = {
      cache: true,
      ...config
    };
  }

  /**
   * 获取真实实例
   * 如果未初始化则触发初始化
   */
  getInstance(): T {
    if (!this.instance && !this.isInitializing) {
      this.initialize();
    }
    
    if (!this.instance) {
      throw new Error('Instance initialization failed');
    }

    // 访问前检查
    if (this.config.accessCheck && !this.config.accessCheck()) {
      throw new Error('Access denied by virtual proxy');
    }

    // 访问回调
    if (this.config.onAccess) {
      this.config.onAccess(this.instance);
    }

    return this.instance;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.instance !== undefined;
  }

  /**
   * 强制初始化
   */
  initialize(): T {
    if (this.instance && this.config.cache) {
      return this.instance;
    }

    this.isInitializing = true;
    try {
      this.instance = this.config.factory();
      return this.instance;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.instance && typeof (this.instance as any).destroy === 'function') {
      (this.instance as any).destroy();
    }
    this.instance = undefined;
  }

  /**
   * 创建带方法代理的虚拟代理
   * 自动代理所有方法调用
   */
  static createMethodProxy<T extends object>(
    factory: () => T,
    options?: Partial<VirtualProxyConfig<T>>
  ): T {
    const proxy = new VirtualProxy<T>({
      factory,
      cache: true,
      ...options
    });

    return new Proxy({} as T, {
      get(target, prop) {
        if (prop === 'getInstance' || prop === 'isInitialized' || 
            prop === 'initialize' || prop === 'destroy') {
          return (proxy as any)[prop];
        }

        const instance = proxy.getInstance();
        const value = (instance as any)[prop];
        
        // 如果是函数，绑定到实例
        if (typeof value === 'function') {
          return value.bind(instance);
        }
        
        return value;
      }
    });
  }
}

// ============================================
// 4. 懒加载工厂
// ============================================

/**
 * 懒加载工厂
 * 批量管理多个懒加载对象
 */
export class LazyLoadFactory {
  private proxies: Map<string, ILazyProxy<any>> = new Map();

  /**
   * 创建懒加载代理
   */
  create<T>(key: string, config: LazyLoadConfig<T>): ILazyProxy<T> {
    if (this.proxies.has(key)) {
      return this.proxies.get(key) as ILazyProxy<T>;
    }

    const proxy = new LazyProxy<T>(config);
    this.proxies.set(key, proxy);
    return proxy;
  }

  /**
   * 获取懒加载代理
   */
  get<T>(key: string): ILazyProxy<T> | undefined {
    return this.proxies.get(key) as ILazyProxy<T> | undefined;
  }

  /**
   * 检查是否已加载
   */
  isLoaded(key: string): boolean {
    const proxy = this.proxies.get(key);
    return proxy?.isLoaded() ?? false;
  }

  /**
   * 获取所有加载状态
   */
  getAllStatuses(): Record<string, LoadingStatus> {
    const result: Record<string, LoadingStatus> = {};
    this.proxies.forEach((proxy, key) => {
      result[key] = proxy.getStatus();
    });
    return result;
  }

  /**
   * 预加载所有代理
   */
  async preloadAll(): Promise<void> {
    await Promise.all(
      Array.from(this.proxies.values()).map(proxy => proxy.load())
    );
  }

  /**
   * 重置指定代理
   */
  reset(key: string): void {
    const proxy = this.proxies.get(key);
    proxy?.reset();
  }

  /**
   * 重置所有代理
   */
  resetAll(): void {
    this.proxies.forEach(proxy => proxy.reset());
  }

  /**
   * 移除指定代理
   */
  remove(key: string): void {
    this.proxies.delete(key);
  }

  /**
   * 清理所有代理
   */
  cleanup(): void {
    this.proxies.forEach(proxy => {
      if ('cancel' in proxy) {
        (proxy as any).cancel();
      }
    });
    this.proxies.clear();
  }
}

// ============================================
// 使用示例
// ============================================

/**
 * 示例 1: 懒加载大型配置文件
 */
export async function exampleLazyConfig() {
  const configLoader = new LazyProxy({
    loader: async () => {
      // 模拟从远程加载配置
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        apiUrl: 'https://api.example.com',
        features: ['feature1', 'feature2'],
        settings: { theme: 'dark', language: 'zh' }
      };
    },
    timeout: 5000,
    retries: 3,
    onStateChange: (status) => {
      console.log('配置加载状态:', status.state, status.progress);
    }
  });

  // 只有在真正需要时才加载
  const config = await configLoader.getValue();
  console.log('配置:', config);
}

/**
 * 示例 2: 虚拟代理延迟初始化重型对象
 */
export function exampleVirtualProxy() {
  class HeavyObject {
    constructor() {
      console.log('⚡ 重型对象初始化 (消耗大量资源)');
    }
    
    expensiveOperation() {
      console.log('执行昂贵操作');
      return 'result';
    }
  }

  const proxy = new VirtualProxy({
    factory: () => new HeavyObject(),
    onAccess: (instance) => {
      console.log('访问重型对象');
    }
  });

  console.log('代理已创建，但对象未初始化');
  console.log('已初始化:', proxy.isInitialized()); // false

  // 第一次访问时才会初始化
  const instance = proxy.getInstance();
  console.log('已初始化:', proxy.isInitialized()); // true
  instance.expensiveOperation();
}

/**
 * 示例 3: 懒加载工厂批量管理
 */
export async function exampleLazyFactory() {
  const factory = new LazyLoadFactory();

  // 创建多个懒加载资源
  factory.create('config', {
    loader: async () => ({ apiUrl: 'https://api.example.com' }),
    immediate: false
  });

  factory.create('userData', {
    loader: async () => ({ userId: 1, name: 'Alice' }),
    timeout: 3000
  });

  factory.create('permissions', {
    loader: async () => ['read', 'write'],
    retries: 2
  });

  // 检查加载状态
  console.log('配置已加载:', factory.isLoaded('config'));

  // 预加载所有资源
  await factory.preloadAll();
  console.log('所有资源状态:', factory.getAllStatuses());

  // 获取资源
  const configProxy = factory.get('config');
  const config = await configProxy!.getValue();
  console.log('配置:', config);

  // 清理
  factory.cleanup();
}

/**
 * 示例 4: 带进度回调的懒加载
 */
export async function exampleProgressiveLoading() {
  const loader = new LazyProxy({
    loader: async () => {
      // 模拟分阶段加载
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        // 这里可以更新进度
      }
      return { data: 'complete' };
    },
    timeout: 10000,
    onStateChange: (status) => {
      if (status.state === LoadingState.LOADING) {
        console.log(`加载中: ${status.progress || 0}%`);
      } else if (status.state === LoadingState.SUCCESS) {
        console.log(`加载完成，耗时：${status.completedAt! - status.startedAt!}ms`);
      }
    }
  });

  const result = await loader.getValue();
  console.log('结果:', result);
}

// ============================================
// 导出
// ============================================

export default {
  LoadingState,
  LoadingStateManager,
  LazyProxy,
  VirtualProxy,
  LazyLoadFactory,
  exampleLazyConfig,
  exampleVirtualProxy,
  exampleLazyFactory,
  exampleProgressiveLoading
};
