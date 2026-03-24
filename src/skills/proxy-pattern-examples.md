# 代理模式 (Proxy Pattern) 使用示例

## 快速开始

```typescript
import {
  ProxyFactory,
  ProxyType,
  UserRole,
  RealSubject,
  exampleVirtualProxy,
  exampleProtectionProxy,
  exampleRemoteProxy,
} from './proxy-pattern-skill';
```

---

## 示例 1: 虚拟代理 (Virtual Proxy)

### 场景：延迟加载大图片

```typescript
// 创建虚拟代理
const imageProxy = ProxyFactory.createVirtual<ImageSubject>();

// 此时图片还未加载
console.log('Image not loaded yet');

// 第一次访问时才会真正加载图片
const imageData = await imageProxy.execute('load', 'large-image.jpg');
console.log('Image loaded:', imageData);

// 后续访问使用缓存
const cachedData = await imageProxy.execute('load', 'large-image.jpg');
console.log('From cache:', cachedData);
```

### 场景：延迟加载大数据集

```typescript
class DatabaseSubject implements ISubject {
  async request(): Promise<string> {
    // 模拟昂贵的数据库查询
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'Database connected';
  }
  
  async getData(id: string): Promise<any> {
    // 模拟数据查询
    return { id, data: 'expensive query result' };
  }
  
  async saveData(data: any): Promise<boolean> {
    return true;
  }
}

// 使用虚拟代理包装数据库连接
const dbProxy = ProxyFactory.createVirtual<DatabaseSubject>();

// 连接只在第一次查询时建立
const result = await dbProxy.execute('getData', 'user-123');
```

### 运行示例

```typescript
// 直接运行内置示例
await exampleVirtualProxy();
```

---

## 示例 2: 保护代理 (Protection Proxy)

### 场景：用户权限控制

```typescript
// 创建真实主题
const documentService = new DocumentService();

// 创建保护代理，当前用户为普通用户
const protectedService = ProxyFactory.createProtection<DocumentService>(
  documentService,
  UserRole.USER
);

// 普通用户可以读取
const doc = await protectedService.execute('getDocument', 'doc-1');

// 普通用户不能删除（会抛出权限错误）
try {
  await protectedService.execute('deleteDocument', 'doc-1');
} catch (error) {
  console.error('Access denied:', error.message);
}

// 管理员可以删除
protectedService.switchUser(UserRole.ADMIN);
await protectedService.execute('deleteDocument', 'doc-1');
```

### 场景：自定义权限配置

```typescript
const proxy = ProxyFactory.createProtection<ISubject>(
  new RealSubject(),
  UserRole.USER
);

// 自定义方法权限
(proxy as ProtectionProxy<ISubject>).setPermission('sensitiveOperation', {
  read: [UserRole.ADMIN],
  write: [UserRole.ADMIN],
  execute: [UserRole.ADMIN], // 只有管理员可以执行
});

// 查看访问日志
const log = (proxy as ProtectionProxy<ISubject>).getAccessLog();
log.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.user} - ${entry.method} - ${entry.allowed ? 'ALLOWED' : 'DENIED'}`);
});
```

### 运行示例

```typescript
// 直接运行内置示例
await exampleProtectionProxy();
```

---

## 示例 3: 远程代理 (Remote Proxy)

### 场景：调用远程 API

```typescript
// 配置远程服务
const apiProxy = ProxyFactory.createRemote<ISubject>({
  baseUrl: 'https://api.example.com/v1',
  timeout: 10000,
  retries: 3,
  headers: {
    'Authorization': 'Bearer your-token-here',
    'Content-Type': 'application/json',
  },
});

// 执行远程调用（自动处理连接、重试）
const result = await apiProxy.execute('getUserData', 'user-123');

// 健康检查
const isHealthy = await apiProxy.healthCheck();
if (!isHealthy) {
  console.warn('Remote service is unhealthy');
}

// 手动断开连接
(apiProxy as RemoteProxy<ISubject>).disconnect();
```

### 场景：微服务通信

```typescript
// 用户服务代理
const userServiceProxy = ProxyFactory.createRemote<UserService>({
  baseUrl: 'http://user-service:3000',
  timeout: 5000,
  retries: 2,
});

// 订单服务代理
const orderServiceProxy = ProxyFactory.createRemote<OrderService>({
  baseUrl: 'http://order-service:3001',
  timeout: 5000,
  retries: 2,
});

// 跨服务调用
const user = await userServiceProxy.execute('getUser', 'user-123');
const orders = await orderServiceProxy.execute('getUserOrders', user.id);
```

### 运行示例

```typescript
// 直接运行内置示例
await exampleRemoteProxy();
```

---

## 示例 4: 组合代理 (Nested Proxy)

### 场景：远程服务 + 权限控制

```typescript
// 第一层：远程代理
const remoteProxy = ProxyFactory.createRemote<ISubject>({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
});

// 第二层：保护代理（包装远程代理）
// 注意：需要调整类型以支持嵌套
const realSubject = new RealSubject();
const protectionProxy = new ProtectionProxy<ISubject>(realSubject, UserRole.USER);

// 现在同时具有远程调用和权限控制能力
```

### 场景：虚拟加载 + 缓存 + 权限控制

```typescript
// 可以堆叠多层代理实现复杂功能
// 1. 最内层：真实数据源
// 2. 中间层：虚拟代理（延迟加载）
// 3. 最外层：保护代理（权限控制）

const realSubject = new ExpensiveResource();
const virtualProxy = new VirtualProxy(realSubject);
const protectedProxy = new ProtectionProxy(virtualProxy, UserRole.USER);

// 使用时：权限检查 → 延迟加载 → 获取数据
const data = await protectedProxy.execute('getData', 'resource-id');
```

### 运行示例

```typescript
// 直接运行内置示例
await exampleNestedProxy();
```

---

## 实际应用场景

### 1. 图片懒加载组件

```typescript
class ImageComponent {
  private imageProxy: IProxy<ImageData>;
  
  constructor(imageUrl: string) {
    this.imageProxy = ProxyFactory.createVirtual<ImageData>();
    // 只在图片进入视口时才加载
  }
  
  async onViewportEnter(): Promise<void> {
    const imageData = await this.imageProxy.execute('load', this.imageUrl);
    this.render(imageData);
  }
}
```

### 2. API 网关中间件

```typescript
class ApiGateway {
  private proxy: IProxy<ApiService>;
  
  constructor() {
    // 组合：远程代理 + 保护代理 + 日志代理
    this.proxy = this.createStackedProxy();
  }
  
  async handleRequest(endpoint: string, data: any): Promise<any> {
    return await this.proxy.execute(endpoint, data);
  }
  
  private createStackedProxy(): IProxy<ApiService> {
    // 实现多层代理堆叠
    return ProxyFactory.createRemote<ApiService>({
      baseUrl: process.env.API_URL,
      timeout: 10000,
      retries: 3,
    });
  }
}
```

### 3. 数据访问层 (DAL)

```typescript
class DataAccessLayer {
  private dataProxy: IProxy<Database>;
  
  constructor(userRole: UserRole) {
    const db = new Database();
    
    // 根据用户角色创建不同的代理
    if (userRole === UserRole.GUEST) {
      this.dataProxy = ProxyFactory.createProtection<Database>(db, UserRole.GUEST);
    } else {
      this.dataProxy = ProxyFactory.createVirtual<Database>();
    }
  }
  
  async query(table: string, filters: any): Promise<any> {
    return await this.dataProxy.execute('query', table, filters);
  }
}
```

---

## 性能对比

| 场景 | 无代理 | 虚拟代理 | 保护代理 | 远程代理 |
|------|--------|----------|----------|----------|
| 首次加载时间 | 100ms | 0ms* | 100ms | 200ms |
| 后续加载时间 | 100ms | 0ms (缓存) | 100ms | 200ms |
| 内存占用 | 高 | 低 | 中 | 中 |
| 安全性 | 无 | 无 | 高 | 中 |

*虚拟代理首次调用时才加载，初始化时间为 0

---

## 最佳实践

### ✅ 推荐

1. **虚拟代理**用于昂贵资源的延迟加载
2. **保护代理**用于敏感操作的权限控制
3. **远程代理**用于网络调用的本地化
4. **组合使用**多种代理实现复杂需求

### ❌ 避免

1. 不要为简单操作创建代理（过度设计）
2. 不要在代理中实现业务逻辑（违反单一职责）
3. 不要忽略代理的性能开销
4. 不要忘记处理代理失败的情况

---

## 调试技巧

```typescript
// 1. 启用详细日志
const proxy = new VirtualProxy<ISubject>();
// 查看控制台输出的代理行为日志

// 2. 检查代理状态
console.log('RealSubject loaded:', proxy.getRealSubject() !== null);

// 3. 查看访问日志（保护代理）
const protectionProxy = new ProtectionProxy<ISubject>(new RealSubject(), UserRole.USER);
await protectionProxy.execute('request');
console.log(protectionProxy.getAccessLog());

// 4. 健康检查（远程代理）
const remoteProxy = ProxyFactory.createRemote<ISubject>(config);
const isHealthy = await remoteProxy.healthCheck();
```

---

## 扩展建议

### 添加日志代理

```typescript
class LoggingProxy<T extends ISubject> implements IProxy<T> {
  private realSubject: T;
  
  constructor(realSubject: T) {
    this.realSubject = realSubject;
  }
  
  async execute(method: string, ...args: any[]): Promise<any> {
    console.log(`[LOG] Calling ${method} with args:`, args);
    const start = Date.now();
    
    const result = await (this.realSubject as any)[method](...args);
    
    const duration = Date.now() - start;
    console.log(`[LOG] ${method} completed in ${duration}ms`);
    
    return result;
  }
  
  getRealSubject(): T | null {
    return this.realSubject;
  }
}
```

### 添加缓存代理

```typescript
class CachingProxy<T extends ISubject> implements IProxy<T> {
  private realSubject: T;
  private cache = new Map<string, any>();
  private ttl: number; // 缓存过期时间 (ms)
  
  async execute(method: string, ...args: any[]): Promise<any> {
    const cacheKey = `${method}:${JSON.stringify(args)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.ttl) {
        return cached.data;
      }
    }
    
    const result = await (this.realSubject as any)[method](...args);
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  }
  
  getRealSubject(): T | null {
    return this.realSubject;
  }
}
```

---

## 总结

代理模式是一个强大的结构型模式，适用于：

- 🐌 **性能优化** - 延迟加载、缓存
- 🔒 **安全控制** - 权限验证、访问日志
- 🌐 **远程调用** - API 本地化、服务抽象
- 🔧 **功能增强** - 日志、监控、事务

记住：**代理不应该改变原始对象的行为，只应该控制访问方式。**
