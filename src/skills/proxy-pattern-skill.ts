/**
 * Proxy Pattern Skill - 代理模式实现
 * 
 * 代理模式 (Proxy Pattern) 是一种结构型设计模式，允许用提供替代品的对象代替另一个对象。
 * 代理对象控制对原始对象的访问，可以在不改变原始对象的情况下增加额外功能。
 * 
 * 本实现包含三种代理类型：
 * 1. Virtual Proxy (虚拟代理) - 延迟加载昂贵资源
 * 2. Protection Proxy (保护代理) - 访问权限控制
 * 3. Remote Proxy (远程代理) - 远程服务本地化
 */

// ==================== 基础接口定义 ====================

/**
 * 代理接口 - 所有代理类必须实现此接口
 */
interface IProxy<T> {
  /**
   * 执行代理操作
   * @param method - 方法名
   * @param args - 参数
   */
  execute(method: string, ...args: any[]): Promise<any>;
  
  /**
   * 获取真实主题
   */
  getRealSubject(): T | null;
}

/**
 * 可代理的主题接口
 */
interface ISubject {
  request(): Promise<string>;
  getData(id: string): Promise<any>;
  saveData(data: any): Promise<boolean>;
}

// ==================== 真实主题实现 ====================

/**
 * 真实主题 - 被代理的实际对象
 */
class RealSubject implements ISubject {
  private data: Map<string, any> = new Map();
  
  async request(): Promise<string> {
    console.log('[RealSubject] Processing request...');
    await this.simulateDelay(100);
    return 'RealSubject: Request handled successfully';
  }
  
  async getData(id: string): Promise<any> {
    console.log(`[RealSubject] Fetching data for id: ${id}`);
    await this.simulateDelay(150);
    return this.data.get(id) || { id, value: 'default' };
  }
  
  async saveData(data: any): Promise<boolean> {
    console.log('[RealSubject] Saving data...');
    await this.simulateDelay(200);
    if (data && data.id) {
      this.data.set(data.id, data);
      return true;
    }
    return false;
  }
  
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 1. 虚拟代理 (Virtual Proxy) ====================

/**
 * 虚拟代理 - 延迟加载昂贵资源
 * 
 * 使用场景：
 * - 大图片加载
 * - 大数据集获取
 * - 昂贵的初始化操作
 */
class VirtualProxy<T extends ISubject> implements IProxy<T> {
  private realSubject: T | null = null;
  private isLoading: boolean = false;
  private cache: Map<string, any> = new Map();
  
  async execute(method: string, ...args: any[]): Promise<any> {
    // 延迟初始化：只有在真正需要时才创建真实主题
    if (!this.realSubject) {
      console.log('[VirtualProxy] Lazy loading RealSubject...');
      this.isLoading = true;
      this.realSubject = await this.createRealSubject();
      this.isLoading = false;
      console.log('[VirtualProxy] RealSubject loaded');
    }
    
    // 缓存读操作
    if (method === 'getData' && args.length > 0) {
      const cacheKey = `get:${args[0]}`;
      if (this.cache.has(cacheKey)) {
        console.log('[VirtualProxy] Cache hit!');
        return this.cache.get(cacheKey);
      }
    }
    
    // 执行真实方法
    const result = await (this.realSubject as any)[method](...args);
    
    // 缓存结果
    if (method === 'getData' && args.length > 0) {
      const cacheKey = `get:${args[0]}`;
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  getRealSubject(): T | null {
    return this.realSubject;
  }
  
  /**
   * 预加载真实主题
   */
  async preload(): Promise<void> {
    if (!this.realSubject && !this.isLoading) {
      console.log('[VirtualProxy] Preloading RealSubject...');
      this.realSubject = await this.createRealSubject();
    }
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[VirtualProxy] Cache cleared');
  }
  
  /**
   * 创建真实主题（可被子类重写）
   */
  protected async createRealSubject(): Promise<T> {
    return new RealSubject() as unknown as T;
  }
}

// ==================== 2. 保护代理 (Protection Proxy) ====================

/**
 * 用户角色枚举
 */
enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * 权限配置
 */
interface PermissionConfig {
  read: UserRole[];
  write: UserRole[];
  execute: UserRole[];
}

/**
 * 保护代理 - 访问权限控制
 * 
 * 使用场景：
 * - 用户权限验证
 * - 敏感数据保护
 * - API 访问限制
 */
class ProtectionProxy<T extends ISubject> implements IProxy<T> {
  private realSubject: T;
  private currentUser: UserRole;
  private permissions: Map<string, PermissionConfig> = new Map();
  private accessLog: Array<{
    timestamp: Date;
    user: UserRole;
    method: string;
    allowed: boolean;
  }> = [];
  
  constructor(realSubject: T, currentUser: UserRole = UserRole.GUEST) {
    this.realSubject = realSubject;
    this.currentUser = currentUser;
    this.setupDefaultPermissions();
  }
  
  private setupDefaultPermissions(): void {
    // 默认权限配置
    this.permissions.set('request', {
      read: [UserRole.GUEST, UserRole.USER, UserRole.ADMIN],
      write: [],
      execute: [UserRole.GUEST, UserRole.USER, UserRole.ADMIN],
    });
    
    this.permissions.set('getData', {
      read: [UserRole.USER, UserRole.ADMIN],
      write: [],
      execute: [UserRole.USER, UserRole.ADMIN],
    });
    
    this.permissions.set('saveData', {
      read: [],
      write: [UserRole.ADMIN],
      execute: [UserRole.ADMIN],
    });
  }
  
  async execute(method: string, ...args: any[]): Promise<any> {
    console.log(`[ProtectionProxy] User "${this.currentUser}" attempting "${method}"`);
    
    // 权限检查
    if (!this.hasPermission(method)) {
      const logEntry = {
        timestamp: new Date(),
        user: this.currentUser,
        method,
        allowed: false,
      };
      this.accessLog.push(logEntry);
      
      console.warn(`[ProtectionProxy] Access DENIED for "${this.currentUser}" to "${method}"`);
      throw new Error(`Access denied: User "${this.currentUser}" does not have permission to execute "${method}"`);
    }
    
    // 记录访问日志
    const logEntry = {
      timestamp: new Date(),
      user: this.currentUser,
      method,
      allowed: true,
    };
    this.accessLog.push(logEntry);
    
    console.log(`[ProtectionProxy] Access GRANTED for "${this.currentUser}" to "${method}"`);
    return await (this.realSubject as any)[method](...args);
  }
  
  getRealSubject(): T | null {
    return this.realSubject;
  }
  
  /**
   * 检查用户是否有权限
   */
  private hasPermission(method: string): boolean {
    const config = this.permissions.get(method);
    if (!config) {
      // 未配置的方法默认允许
      return true;
    }
    
    return config.execute.includes(this.currentUser);
  }
  
  /**
   * 设置方法权限
   */
  setPermission(method: string, config: PermissionConfig): void {
    this.permissions.set(method, config);
    console.log(`[ProtectionProxy] Permission set for "${method}"`);
  }
  
  /**
   * 切换当前用户
   */
  switchUser(role: UserRole): void {
    this.currentUser = role;
    console.log(`[ProtectionProxy] User switched to "${role}"`);
  }
  
  /**
   * 获取访问日志
   */
  getAccessLog(): typeof this.accessLog {
    return this.accessLog;
  }
  
  /**
   * 清除访问日志
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }
}

// ==================== 3. 远程代理 (Remote Proxy) ====================

/**
 * 远程服务配置
 */
interface RemoteServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

/**
 * 远程代理 - 远程服务本地化
 * 
 * 使用场景：
 * - RPC 调用
 * - Web Service 访问
 * - 微服务通信
 */
class RemoteProxy<T extends ISubject> implements IProxy<T> {
  private config: RemoteServiceConfig;
  private isConnected: boolean = false;
  private connectionCache: T | null = null;
  private requestQueue: Array<{
    method: string;
    args: any[];
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  
  constructor(config: RemoteServiceConfig) {
    this.config = config;
  }
  
  async execute(method: string, ...args: any[]): Promise<any> {
    console.log(`[RemoteProxy] Executing "${method}" on remote service`);
    
    // 检查连接状态
    if (!this.isConnected) {
      await this.connect();
    }
    
    // 构建远程请求
    const requestBody = {
      method,
      args,
      timestamp: Date.now(),
    };
    
    try {
      // 模拟远程调用（实际使用时替换为真实 HTTP 请求）
      const result = await this.sendRemoteRequest(requestBody);
      console.log('[RemoteProxy] Remote call successful');
      return result;
    } catch (error) {
      console.error('[RemoteProxy] Remote call failed:', error);
      
      // 重试机制
      for (let i = 0; i < this.config.retries; i++) {
        console.log(`[RemoteProxy] Retry ${i + 1}/${this.config.retries}`);
        await this.simulateDelay(1000 * (i + 1));
        try {
          return await this.sendRemoteRequest(requestBody);
        } catch (retryError) {
          if (i === this.config.retries - 1) {
            throw retryError;
          }
        }
      }
      
      throw error;
    }
  }
  
  getRealSubject(): T | null {
    return this.connectionCache;
  }
  
  /**
   * 连接到远程服务
   */
  private async connect(): Promise<void> {
    console.log(`[RemoteProxy] Connecting to ${this.config.baseUrl}...`);
    await this.simulateDelay(500);
    this.isConnected = true;
    console.log('[RemoteProxy] Connected successfully');
  }
  
  /**
   * 断开连接
   */
  disconnect(): void {
    this.isConnected = false;
    this.connectionCache = null;
    console.log('[RemoteProxy] Disconnected');
  }
  
  /**
   * 发送远程请求
   */
  private async sendRemoteRequest(body: any): Promise<any> {
    // 实际实现中应该使用 fetch/axios 发送 HTTP 请求
    // 这里模拟远程调用
    await this.simulateDelay(200);
    
    // 模拟响应
    return {
      success: true,
      data: {
        method: body.method,
        result: `Remote result for ${body.method}`,
      },
    };
  }
  
  /**
   * 检查连接状态
   */
  isConnectionAlive(): boolean {
    return this.isConnected;
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.execute('request');
      return true;
    } catch {
      return false;
    }
  }
  
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 代理工厂 ====================

/**
 * 代理类型枚举
 */
enum ProxyType {
  VIRTUAL = 'virtual',
  PROTECTION = 'protection',
  REMOTE = 'remote',
}

/**
 * 代理工厂 - 创建不同类型的代理
 */
class ProxyFactory {
  /**
   * 创建虚拟代理
   */
  static createVirtual<T extends ISubject>(): IProxy<T> {
    return new VirtualProxy<T>();
  }
  
  /**
   * 创建保护代理
   */
  static createProtection<T extends ISubject>(
    realSubject: T,
    userRole: UserRole = UserRole.GUEST
  ): IProxy<T> {
    return new ProtectionProxy<T>(realSubject, userRole);
  }
  
  /**
   * 创建远程代理
   */
  static createRemote<T extends ISubject>(
    config: RemoteServiceConfig
  ): IProxy<T> {
    return new RemoteProxy<T>(config);
  }
  
  /**
   * 创建嵌套代理（代理的代理）
   */
  static createNested<T extends ISubject>(
    type: ProxyType,
    config?: any
  ): IProxy<T> {
    const proxy = this.create<T>(type, config);
    
    // 可以在这里添加额外的代理层
    // 例如：远程代理 + 保护代理的组合
    
    return proxy;
  }
  
  /**
   * 通用创建方法
   */
  static create<T extends ISubject>(
    type: ProxyType,
    config?: any
  ): IProxy<T> {
    switch (type) {
      case ProxyType.VIRTUAL:
        return new VirtualProxy<T>();
      case ProxyType.PROTECTION:
        return new ProtectionProxy<T>(
          new RealSubject() as unknown as T,
          config?.userRole || UserRole.GUEST
        );
      case ProxyType.REMOTE:
        return new RemoteProxy<T>(config || {
          baseUrl: 'http://localhost:3000',
          timeout: 5000,
          retries: 3,
        });
      default:
        throw new Error(`Unknown proxy type: ${type}`);
    }
  }
}

// ==================== 使用示例 ====================

/**
 * 示例 1: 虚拟代理 - 延迟加载大图片
 */
async function exampleVirtualProxy(): Promise<void> {
  console.log('\n=== 虚拟代理示例 ===\n');
  
  const proxy = ProxyFactory.createVirtual<ISubject>();
  
  // 此时代理还未加载真实主题
  console.log('Before first call - RealSubject not loaded yet');
  
  // 第一次调用会触发加载
  const result1 = await proxy.execute('request');
  console.log('Result 1:', result1);
  
  // 第二次调用直接使用已加载的真实主题
  const result2 = await proxy.execute('getData', 'item-1');
  console.log('Result 2:', result2);
  
  // 第三次调用相同数据会使用缓存
  const result3 = await proxy.execute('getData', 'item-1');
  console.log('Result 3:', result3);
}

/**
 * 示例 2: 保护代理 - 权限控制
 */
async function exampleProtectionProxy(): Promise<void> {
  console.log('\n=== 保护代理示例 ===\n');
  
  const realSubject = new RealSubject();
  const proxy = ProxyFactory.createProtection<ISubject>(realSubject, UserRole.USER);
  
  try {
    // USER 角色可以读取数据
    const data = await proxy.execute('getData', 'item-1');
    console.log('Data fetched:', data);
    
    // USER 角色不能保存数据（需要 ADMIN）
    await proxy.execute('saveData', { id: 'item-2', value: 'test' });
  } catch (error) {
    console.log('Expected error:', (error as Error).message);
  }
  
  // 切换到 ADMIN 角色
  (proxy as ProtectionProxy<ISubject>).switchUser(UserRole.ADMIN);
  
  // ADMIN 角色可以保存数据
  const saved = await proxy.execute('saveData', { id: 'item-2', value: 'test' });
  console.log('Data saved:', saved);
  
  // 查看访问日志
  const log = (proxy as ProtectionProxy<ISubject>).getAccessLog();
  console.log('Access log entries:', log.length);
}

/**
 * 示例 3: 远程代理 - 远程服务调用
 */
async function exampleRemoteProxy(): Promise<void> {
  console.log('\n=== 远程代理示例 ===\n');
  
  const proxy = ProxyFactory.createRemote<ISubject>({
    baseUrl: 'http://api.example.com',
    timeout: 5000,
    retries: 3,
    headers: {
      'Authorization': 'Bearer token123',
    },
  });
  
  // 执行远程调用
  const result = await proxy.execute('request');
  console.log('Remote result:', result);
  
  // 健康检查
  const isHealthy = await proxy.healthCheck();
  console.log('Service healthy:', isHealthy);
  
  // 断开连接
  (proxy as RemoteProxy<ISubject>).disconnect();
}

/**
 * 示例 4: 组合代理 - 多层代理
 */
async function exampleNestedProxy(): Promise<void> {
  console.log('\n=== 组合代理示例 ===\n');
  
  // 创建真实主题
  const realSubject = new RealSubject();
  
  // 第一层：保护代理
  const protectionProxy = new ProtectionProxy<ISubject>(realSubject, UserRole.ADMIN);
  
  // 第二层：虚拟代理（包装保护代理）
  // 注意：实际使用中需要调整类型定义以支持嵌套
  
  console.log('Nested proxy created (Protection + Virtual)');
  console.log('This demonstrates how proxies can be stacked');
}

// ==================== 导出 ====================

export {
  // 接口
  IProxy,
  ISubject,
  
  // 真实主题
  RealSubject,
  
  // 代理类
  VirtualProxy,
  ProtectionProxy,
  RemoteProxy,
  
  // 工厂
  ProxyFactory,
  
  // 枚举和类型
  ProxyType,
  UserRole,
  PermissionConfig,
  RemoteServiceConfig,
  
  // 示例函数
  exampleVirtualProxy,
  exampleProtectionProxy,
  exampleRemoteProxy,
  exampleNestedProxy,
};

// ==================== 技能注册 ====================

/**
 * 代理模式技能配置
 */
export const proxyPatternSkill = {
  name: 'proxy-pattern',
  version: '1.0.0',
  description: '代理模式实现，包含虚拟代理、保护代理、远程代理',
  
  /**
   * 技能使用方法
   */
  usage: `
// 1. 虚拟代理 - 延迟加载
const virtualProxy = ProxyFactory.createVirtual<ISubject>();
await virtualProxy.execute('getData', 'id');

// 2. 保护代理 - 权限控制
const protectionProxy = ProxyFactory.createProtection<ISubject>(
  new RealSubject(),
  UserRole.ADMIN
);
await protectionProxy.execute('saveData', data);

// 3. 远程代理 - 远程调用
const remoteProxy = ProxyFactory.createRemote<ISubject>({
  baseUrl: 'http://api.example.com',
  timeout: 5000,
  retries: 3,
});
await remoteProxy.execute('request');
  `,
  
  /**
   * 适用场景
   */
  scenarios: [
    '大资源延迟加载（图片、视频、大数据集）',
    '访问权限控制和审计日志',
    '远程服务调用和本地化',
    '缓存优化和性能提升',
    'API 网关和中间件',
  ],
};
