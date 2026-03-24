# 懒加载技能 - Lazy Loading Skill

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📚 概述

懒加载技能提供了一套完整的延迟加载解决方案，包含三个核心功能：

1. **懒加载代理 (Lazy Proxy)** - 延迟初始化重型对象，直到真正需要时才加载
2. **虚拟代理 (Virtual Proxy)** - 控制对真实对象的访问，支持访问权限检查和自动方法代理
3. **加载状态管理 (Loading State)** - 追踪和管理加载过程的各个状态

---

## 🎯 核心特性

### ✅ 懒加载代理 (LazyProxy)
- ⏱️ 延迟加载 - 只在需要时才初始化
- 🔄 自动重试 - 支持配置重试次数和间隔
- ⏰ 超时控制 - 防止无限期加载
- 📊 状态追踪 - 实时监控加载进度
- 🚫 可取消 - 支持中止正在进行的加载
- 💾 自动缓存 - 避免重复加载

### ✅ 虚拟代理 (VirtualProxy)
- 🎭 访问控制 - 在访问前执行权限检查
- 🔧 方法自动代理 - 自动代理所有方法调用
- 💾 实例缓存 - 可选的实例缓存策略
- 🔍 延迟初始化 - 第一次访问时才创建实例

### ✅ 加载状态管理器 (LoadingStateManager)
- 📈 状态枚举 - IDLE / LOADING / SUCCESS / ERROR
- 📊 进度追踪 - 支持进度百分比
- ⏱️ 耗时统计 - 自动计算加载耗时
- 🔔 状态回调 - 支持状态变化监听
- 🚫 中止支持 - 基于 AbortController 的中止机制

---

## 📦 安装

无需额外安装，直接使用：

```typescript
import {
  LazyProxy,
  VirtualProxy,
  LoadingStateManager,
  LazyLoadFactory,
  LoadingState
} from './src/skills/lazy-loading-skill';
```

---

## 🚀 快速开始

### 1. 基础懒加载

```typescript
const loader = new LazyProxy({
  loader: async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  timeout: 5000,
  retries: 3
});

// 只有在调用时才加载
const data = await loader.getValue();
```

### 2. 虚拟代理

```typescript
class HeavyObject {
  constructor() {
    console.log('初始化重型对象');
  }
  
  expensiveMethod() {
    return 'result';
  }
}

const proxy = new VirtualProxy({
  factory: () => new HeavyObject(),
  onAccess: (instance) => {
    console.log('访问实例');
  }
});

// 第一次访问时才初始化
const instance = proxy.getInstance();
instance.expensiveMethod();
```

### 3. 状态管理

```typescript
const stateManager = new LoadingStateManager();

stateManager.onStateChange((status) => {
  console.log('状态:', status.state, '进度:', status.progress);
});

stateManager.setLoading(0);
// ... 加载过程
stateManager.setSuccess();
```

---

## 📖 API 文档

### LoadingState 枚举

```typescript
enum LoadingState {
  IDLE = 'idle',       // 未开始加载
  LOADING = 'loading', // 加载中
  SUCCESS = 'success', // 加载成功
  ERROR = 'error'      // 加载失败
}
```

### LoadingStatus 接口

```typescript
interface LoadingStatus {
  state: LoadingState;      // 当前状态
  progress?: number;        // 进度百分比 (0-100)
  error?: string;           // 错误信息
  startedAt?: number;       // 开始时间戳
  completedAt?: number;     // 完成时间戳
}
```

### LazyProxy 类

**构造函数参数:**

```typescript
interface LazyLoadConfig<T> {
  loader: () => Promise<T>;     // 加载函数
  immediate?: boolean;          // 是否立即加载 (默认 false)
  timeout?: number;             // 超时时间 (毫秒)
  retries?: number;             // 重试次数 (默认 0)
  retryDelay?: number;          // 重试间隔 (毫秒)
  onStateChange?: (status: LoadingStatus) => void; // 状态回调
}
```

**方法:**

```typescript
interface ILazyProxy<T> {
  getStatus(): LoadingStatus;     // 获取加载状态
  load(): Promise<T>;             // 手动触发加载
  getValue(): Promise<T>;         // 获取值 (自动加载)
  isLoaded(): boolean;            // 检查是否已加载
  reset(): void;                  // 重置 (清除缓存)
  cancel(): void;                 // 取消加载
}
```

### VirtualProxy 类

**构造函数参数:**

```typescript
interface VirtualProxyConfig<T> {
  factory: () => T;               // 真实对象创建函数
  accessCheck?: () => boolean;    // 访问前检查函数
  onAccess?: (instance: T) => void; // 访问回调
  cache?: boolean;                // 缓存实例 (默认 true)
}
```

**方法:**

```typescript
interface IVirtualProxy<T> {
  getInstance(): T;         // 获取真实实例
  isInitialized(): boolean; // 检查是否已初始化
  initialize(): T;          // 强制初始化
  destroy(): void;          // 销毁实例
}
```

**静态方法:**

```typescript
// 创建带方法代理的虚拟代理
VirtualProxy.createMethodProxy<T>(
  factory: () => T,
  options?: VirtualProxyConfig<T>
): T
```

### LoadingStateManager 类

**方法:**

```typescript
class LoadingStateManager {
  getStatus(): LoadingStatus;
  setLoading(progress?: number): void;
  setSuccess(): void;
  setError(error: string): void;
  reset(): void;
  getAbortSignal(): AbortSignal | undefined;
  abort(): void;
  isAbortable(): boolean;
  onStateChange(callback: (status) => void): () => void;
  isLoading(): boolean;
  isLoaded(): boolean;
  isError(): boolean;
  getLoadDuration(): number | undefined;
}
```

### LazyLoadFactory 类

**方法:**

```typescript
class LazyLoadFactory {
  create<T>(key: string, config: LazyLoadConfig<T>): ILazyProxy<T>;
  get<T>(key: string): ILazyProxy<T> | undefined;
  isLoaded(key: string): boolean;
  getAllStatuses(): Record<string, LoadingStatus>;
  preloadAll(): Promise<void>;
  reset(key: string): void;
  resetAll(): void;
  remove(key: string): void;
  cleanup(): void;
}
```

---

## 💡 使用场景

### 1. 懒加载大型图片

```typescript
class ImageLazyLoader {
  private proxy: LazyProxy<HTMLImageElement>;

  constructor(imageUrl: string) {
    this.proxy = new LazyProxy({
      loader: async () => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageUrl;
        });
      },
      timeout: 10000,
      retries: 2
    });
  }

  async getImage(): Promise<HTMLImageElement> {
    return this.proxy.getValue();
  }
}
```

### 2. 懒加载 API 数据

```typescript
const apiLoader = new LazyProxy({
  loader: async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  timeout: 8000,
  retries: 3,
  retryDelay: 1000
});

const data = await apiLoader.getValue();
```

### 3. 延迟初始化重型对象

```typescript
class DatabaseConnection {
  constructor() {
    // 耗时的连接初始化
  }
  
  query(sql: string) {
    // 执行查询
  }
}

const dbProxy = new VirtualProxy({
  factory: () => new DatabaseConnection(),
  accessCheck: () => user.hasPermission('database'),
  onAccess: (instance) => {
    console.log('访问数据库');
  }
});

// 只在第一次访问时建立连接
const db = dbProxy.getInstance();
```

### 4. 批量资源管理

```typescript
const factory = new LazyLoadFactory();

factory.create('config', {
  loader: async () => fetch('/api/config').then(r => r.json())
});

factory.create('user', {
  loader: async () => fetch('/api/user').then(r => r.json())
});

// 预加载所有资源
await factory.preloadAll();

// 按需获取
const config = await factory.get('config')!.getValue();
```

### 5. React Hook 集成

```typescript
import { useState, useEffect } from 'react';

function useLazyLoad<T>(loader: () => Promise<T>, options?: LazyLoadConfig<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const proxy = new LazyProxy({
      loader,
      ...options,
      onStateChange: (status) => {
        setLoading(status.state === LoadingState.LOADING);
        if (status.state === LoadingState.SUCCESS) {
          // 数据通过 getValue 获取
        }
        if (status.state === LoadingState.ERROR) {
          setError(status.error || 'Unknown error');
        }
      }
    });

    proxy.getValue().then(setData).catch(setError);
  }, []);

  return { data, loading, error };
}
```

---

## ⚠️ 注意事项

### 1. 内存管理
- 使用 `reset()` 或 `cleanup()` 及时清理不需要的代理
- 避免创建过多的懒加载代理导致内存泄漏

### 2. 错误处理
```typescript
try {
  const data = await loader.getValue();
} catch (error) {
  console.error('加载失败:', error);
  // 处理错误
}
```

### 3. 超时设置
- 为网络请求设置合理的超时时间
- 考虑用户网络环境，建议 5-10 秒

### 4. 重试策略
- 不要设置过多重试次数 (建议 2-3 次)
- 设置合适的重试间隔，避免频繁请求

### 5. 中止加载
```typescript
// 组件卸载时取消加载
useEffect(() => {
  return () => {
    loader.cancel();
  };
}, []);
```

---

## 🧪 测试示例

```typescript
import { LazyProxy, LoadingState } from './lazy-loading-skill';

describe('LazyProxy', () => {
  it('should lazy load on first access', async () => {
    let loadCalled = false;
    
    const loader = new LazyProxy({
      loader: async () => {
        loadCalled = true;
        return { data: 'test' };
      }
    });

    expect(loadCalled).toBe(false);
    
    const data = await loader.getValue();
    expect(loadCalled).toBe(true);
    expect(data).toEqual({ data: 'test' });
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    
    const loader = new LazyProxy({
      loader: async () => {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return { success: true };
      },
      retries: 3,
      retryDelay: 100
    });

    const result = await loader.getValue();
    expect(attempts).toBe(3);
    expect(result).toEqual({ success: true });
  });

  it('should respect timeout', async () => {
    const loader = new LazyProxy({
      loader: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { data: 'slow' };
      },
      timeout: 1000
    });

    await expect(loader.getValue()).rejects.toThrow();
    expect(loader.getStatus().state).toBe(LoadingState.ERROR);
  });
});
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✨ 初始版本发布
- ✅ 实现懒加载代理 (LazyProxy)
- ✅ 实现虚拟代理 (VirtualProxy)
- ✅ 实现加载状态管理器 (LoadingStateManager)
- ✅ 实现懒加载工厂 (LazyLoadFactory)
- 📚 提供完整的使用示例和文档

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

## 📄 许可证

MIT License

---

**作者:** KAEL  
**联系:** [your-email@example.com]
