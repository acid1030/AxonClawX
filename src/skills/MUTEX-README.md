# Mutex Utils 技能

并发同步原语工具集，提供 Mutex、Semaphore、RWLock 三种基础并发控制原语。

## 快速开始

```typescript
import { Mutex, Semaphore, RWLock } from './skills/mutex-utils-skill';
```

## 功能概览

### 1. Mutex 互斥锁

保证同一时间只有一个异步操作可以执行。

**核心 API:**
- `acquire()` - 获取锁
- `release()` - 释放锁
- `run(fn)` - 执行受保护的异步操作
- `tryAcquire()` - 尝试获取锁 (非阻塞)
- `isLocked()` - 检查锁状态
- `queueLength()` - 获取等待队列长度

**使用场景:**
- 保护共享资源
- 防止竞态条件
- 防止重复提交

**示例:**
```typescript
const mutex = new Mutex();
let counter = 0;

await mutex.run(async () => {
  const current = counter;
  await someAsyncOperation();
  counter = current + 1;
});
```

### 2. Semaphore 信号量

控制同时执行的异步操作数量。

**核心 API:**
- `acquire()` - 获取许可
- `release()` - 释放许可
- `run(fn)` - 执行受限制的异步操作
- `tryAcquire()` - 尝试获取许可
- `available()` - 获取可用许可数
- `maxConcurrency()` - 获取最大并发数

**使用场景:**
- 限制 API 请求并发数
- 数据库连接池管理
- 批量任务并发控制

**示例:**
```typescript
const semaphore = new Semaphore(3); // 最多 3 个并发

const tasks = [task1, task2, task3, task4, task5];
await Promise.all(tasks.map(task => semaphore.run(task)));
```

### 3. RWLock 读写锁

允许多个读者同时读取，但写者独占访问。

**核心 API:**
- `acquireRead()` / `releaseRead()` - 读锁
- `acquireWrite()` / `releaseWrite()` - 写锁
- `read(fn)` - 执行读操作
- `write(fn)` - 执行写操作
- `tryAcquireRead()` / `tryAcquireWrite()` - 尝试获取锁
- `readerCount()` - 获取当前读者数
- `isWriteLocked()` - 检查写锁状态

**使用场景:**
- 缓存系统 (读多写少)
- 配置文件管理
- 共享数据结构

**示例:**
```typescript
const rwlock = new RWLock();

// 读操作 (可并发)
await rwlock.read(async () => {
  return cache.get(key);
});

// 写操作 (独占)
await rwlock.write(async () => {
  cache.set(key, value);
});
```

## 高级功能

### ReentrantMutex 可重入锁

允许同一任务多次获取同一把锁。

```typescript
const mutex = new ReentrantMutex();

async function recursiveFunction(depth: number) {
  await mutex.run(async () => {
    if (depth > 0) {
      await recursiveFunction(depth - 1); // 可以重入
    }
  });
}
```

### 超时控制

带超时的锁获取操作。

```typescript
import { acquireWithTimeout } from './mutex-utils-skill';

const acquired = await acquireWithTimeout(mutex, 1000); // 1 秒超时
if (acquired) {
  // 成功获取锁
  mutex.release();
} else {
  // 超时处理
}
```

### 批量执行

使用信号量批量执行任务。

```typescript
import { runAllWithSemaphore } from './mutex-utils-skill';

const semaphore = new Semaphore(2);
const tasks = [task1, task2, task3, task4, task5];

const results = await runAllWithSemaphore(semaphore, tasks);
```

## 完整示例

详见 `mutex-utils-examples.ts` 文件，包含：

1. **Mutex 示例**
   - 保护共享资源 (计数器)
   - 防止重复提交
   - 带超时的锁获取

2. **Semaphore 示例**
   - 限制并发请求数
   - 数据库连接池
   - 批量处理任务

3. **RWLock 示例**
   - 缓存读写
   - 配置文件管理
   - 尝试获取锁

4. **ReentrantMutex 示例**
   - 递归调用场景

5. **综合示例**
   - 线程安全的任务队列

## 注意事项

1. **始终释放锁**: 使用 `run()` 方法可以自动释放，避免忘记释放导致死锁
2. **避免死锁**: 多个锁的情况下，注意获取顺序
3. **超时处理**: 对于可能长时间持有的锁，建议使用超时机制
4. **性能考虑**: Mutex 是串行的，高并发场景考虑使用 Semaphore 或 RWLock

## API 参考

### Mutex

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| acquire | - | `Promise<void>` | 获取锁 |
| release | - | `void` | 释放锁 |
| run | `fn: () => Promise<T>` | `Promise<T>` | 执行受保护的操作 |
| tryAcquire | - | `boolean` | 尝试获取锁 |
| isLocked | - | `boolean` | 检查锁状态 |
| queueLength | - | `number` | 等待队列长度 |

### Semaphore

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| constructor | `maxCount: number` | - | 创建信号量 |
| acquire | - | `Promise<void>` | 获取许可 |
| release | - | `void` | 释放许可 |
| run | `fn: () => Promise<T>` | `Promise<T>` | 执行受限制的操作 |
| tryAcquire | - | `boolean` | 尝试获取许可 |
| available | - | `number` | 可用许可数 |
| maxConcurrency | - | `number` | 最大并发数 |
| queueLength | - | `number` | 等待队列长度 |

### RWLock

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| acquireRead | - | `Promise<void>` | 获取读锁 |
| releaseRead | - | `void` | 释放读锁 |
| acquireWrite | - | `Promise<void>` | 获取写锁 |
| releaseWrite | - | `void` | 释放写锁 |
| read | `fn: () => Promise<T>` | `Promise<T>` | 执行读操作 |
| write | `fn: () => Promise<T>` | `Promise<T>` | 执行写操作 |
| tryAcquireRead | - | `boolean` | 尝试获取读锁 |
| tryAcquireWrite | - | `boolean` | 尝试获取写锁 |
| readerCount | - | `number` | 当前读者数 |
| isWriteLocked | - | `boolean` | 是否有写锁 |
| queueInfo | - | `{readers, writers}` | 等待队列信息 |

### ReentrantMutex

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| acquire | - | `Promise<void>` | 获取锁 |
| release | - | `void` | 释放锁 |
| run | `fn: () => Promise<T>` | `Promise<T>` | 执行受保护的操作 |
| holdCount | - | `number` | 当前持有层数 |

### 工具函数

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| acquireWithTimeout | `mutex, timeoutMs` | `Promise<boolean>` | 带超时的 Mutex 获取 |
| acquireSemaphoreWithTimeout | `semaphore, timeoutMs` | `Promise<boolean>` | 带超时的 Semaphore 获取 |
| runAllWithSemaphore | `semaphore, tasks` | `Promise<T[]>` | 批量执行任务 |

## 文件结构

```
src/skills/
├── mutex-utils-skill.ts      # 核心实现
├── mutex-utils-examples.ts   # 使用示例
└── MUTEX-README.md          # 本文档
```

## 测试建议

```typescript
import { Mutex, Semaphore, RWLock } from './mutex-utils-skill';

// 测试 Mutex
async function testMutex() {
  const mutex = new Mutex();
  let count = 0;
  
  await Promise.all(
    Array.from({ length: 100 }, () =>
      mutex.run(async () => {
        count++;
      })
    )
  );
  
  console.assert(count === 100, 'Mutex 测试失败');
}

// 测试 Semaphore
async function testSemaphore() {
  const semaphore = new Semaphore(2);
  let maxConcurrent = 0;
  let current = 0;
  
  await Promise.all(
    Array.from({ length: 10 }, () =>
      semaphore.run(async () => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise(r => setTimeout(r, 10));
        current--;
      })
    )
  );
  
  console.assert(maxConcurrent <= 2, 'Semaphore 测试失败');
}

// 测试 RWLock
async function testRWLock() {
  const rwlock = new RWLock();
  let maxReaders = 0;
  let currentReaders = 0;
  
  await Promise.all([
    ...Array.from({ length: 5 }, () =>
      rwlock.read(async () => {
        currentReaders++;
        maxReaders = Math.max(maxReaders, currentReaders);
        await new Promise(r => setTimeout(r, 10));
        currentReaders--;
      })
    ),
    rwlock.write(async () => {
      console.assert(currentReaders === 0, '写锁时不应有读者');
    })
  ]);
  
  console.assert(maxReaders > 1, 'RWLock 测试失败');
}
```
