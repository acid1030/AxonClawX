# 🔔 观察者模式专业工具 - ACE Observer Pattern Pro

**版本:** 1.0.0  
**作者:** ACE  
**日期:** 2026-03-13

---

## 📖 概述

观察者模式 (Observer Pattern) 是一种行为设计模式，允许对象之间建立一对多的依赖关系。当一个对象 (主题) 的状态发生改变时，所有依赖于它的对象 (观察者) 都会收到通知并自动更新。

本实现提供：
- ✅ **主题定义** - 支持多主题、层级主题
- ✅ **观察者管理** - 自动注册/注销、优先级队列
- ✅ **消息通知** - 同步/异步、批量/即时、过滤通知

---

## 🚀 快速开始

### 安装

无需安装，直接导入使用：

```typescript
import {
  createSubject,
  createObserver,
  getSubject,
  SubjectManager,
  Observer,
  Subject,
} from './skills/observer-pattern-pro-skill';
```

---

## 📚 核心 API

### 1. 创建主题 (Subject)

```typescript
const subject = createSubject<TData>({
  id?: string,           // 可选，自动生成
  name: string,          // 主题名称
  parentId?: string,     // 可选，父主题 ID (层级结构)
  enableHierarchy?: boolean, // 是否启用层级通知 (默认 false)
});
```

### 2. 创建观察者 (Observer)

```typescript
const observer = createObserver<TData>({
  id?: string,           // 可选，自动生成
  name: string,          // 观察者名称
  priority?: 'low' | 'normal' | 'high' | 'critical', // 优先级
  enabled?: boolean,     // 是否启用 (默认 true)
  onUpdate: (data: TData, topic: string) => void | Promise<void>,
  onError?: (error: Error, topic: string) => void, // 可选错误处理
});
```

### 3. 注册/移除观察者

```typescript
// 注册
subject.attach(observer);

// 移除
subject.detach(observerId);

// 获取观察者数量
subject.observerCount;

// 获取所有观察者
subject.getObservers();
```

### 4. 通知观察者

```typescript
// 同步通知 (按优先级顺序)
await subject.notify(data, 'sync');

// 异步通知 (并行执行)
await subject.notify(data, 'async');

// 批量通知 (延迟执行)
await subject.notify(data, 'batch');

// 带选项的通知
await subject.notify(data, {
  type: 'async',
  timeoutMs: 5000,
  parallel: true,
  filter: (observer) => observer.priority === 'high',
});
```

---

## 💡 使用示例

### 示例 1: 基础用法

```typescript
import { createSubject, createObserver } from './skills/observer-pattern-pro-skill';

// 创建天气主题
const weatherSubject = createSubject({
  id: 'weather',
  name: '天气更新',
});

// 创建观察者
const phoneObserver = createObserver({
  name: '手机通知',
  priority: 'high',
  onUpdate: (data: any) => {
    console.log(`📱 手机收到天气更新：${data.temperature}°C`);
  },
});

const watchObserver = createObserver({
  name: '手表通知',
  priority: 'normal',
  onUpdate: (data: any) => {
    console.log(`⌚ 手表收到天气更新：${data.temperature}°C`);
  },
});

// 注册观察者
weatherSubject.attach(phoneObserver);
weatherSubject.attach(watchObserver);

// 通知所有观察者
weatherSubject.notify({ temperature: 25, condition: '晴' });

// 输出:
// 📱 手机收到天气更新：25°C
// ⌚ 手表收到天气更新：25°C
```

### 示例 2: 异步通知

```typescript
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
        console.log(`📰 订阅者${i} 收到新闻：${data.headline}`);
      },
    })
  );
}

// 异步并行通知
const result = await newsSubject.notify(
  { headline: '重大新闻发布!' },
  'async'
);

console.log(`通知结果：${result.successCount} 成功，${result.failureCount} 失败`);
console.log(`耗时：${result.durationMs}ms`);
```

### 示例 3: 层级主题

```typescript
// 创建主题层级
const appSubject = createSubject({
  id: 'app',
  name: '应用事件',
  enableHierarchy: true, // 启用层级通知
});

const userSubject = createSubject({
  id: 'app.user',
  name: '用户事件',
  parentId: 'app', // 设置父主题
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
      console.log(`👤 用户事件：${data.action}`);
    },
  })
);

// 通知用户主题 (会级联通知到 app 主题的观察者)
userSubject.notify({ action: '用户登录', userId: 123 });

// 输出:
// 👤 用户事件：用户登录
// 🔔 [全局] 用户事件：{"action":"用户登录","userId":123}
```

### 示例 4: 优先级控制

```typescript
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

// 按优先级顺序通知 (critical → high → normal → low)
await alertSubject.notify({ level: 'ERROR', message: '系统异常' }, 'sync');

// 输出:
// 🚨 发送紧急短信!
// 📧 发送邮件通知
// 📝 记录日志
```

### 示例 5: 错误处理

```typescript
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

// 会出错的观察者 (带自定义错误处理)
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

// 输出:
// ✅ 正常处理：{ test: 'data' }
// ❌ 自定义错误处理 [测试主题]: 模拟错误
```

### 示例 6: 观察者管理

```typescript
const subject = createSubject({
  id: 'demo',
  name: '演示主题',
});

const observer = createObserver({
  name: '可管理观察者',
  onUpdate: (data) => console.log('收到:', data),
});

subject.attach(observer);

// 禁用观察者
observer.disable();
subject.notify('这条消息不会被接收');

// 启用观察者
observer.enable();
subject.notify('这条消息会被接收');

// 更新优先级
observer.setPriority('critical');

// 获取观察者
const found = subject.getObserver(observer.id);

// 清空所有观察者
subject.clearObservers();
```

### 示例 7: 主题管理器

```typescript
import { SubjectManager } from './skills/observer-pattern-pro-skill';

// 获取单例管理器
const manager = SubjectManager.getInstance();

// 创建主题
const subject1 = manager.createSubject({ id: 's1', name: '主题 1' });
const subject2 = manager.createSubject({ id: 's2', name: '主题 2' });

// 获取主题
const found = manager.getSubject('s1');

// 获取所有主题
const all = manager.getAllSubjects();

// 删除主题
manager.deleteSubject('s1');

// 清空所有主题
manager.clear();
```

---

## 🎯 通知类型对比

| 类型 | 描述 | 执行方式 | 适用场景 |
|------|------|----------|----------|
| **sync** | 同步通知 | 按优先级顺序逐个执行 | 需要保证执行顺序的场景 |
| **async** | 异步通知 | 并行执行所有观察者 | 高性能、不依赖执行顺序 |
| **batch** | 批量通知 | 延迟执行 (可防抖/节流) | 高频事件、需要合并通知 |

---

## 🔧 高级用法

### 过滤器通知

```typescript
await subject.notify(data, {
  type: 'sync',
  filter: (observer) => {
    // 只通知高优先级的观察者
    return observer.priority === 'high' || observer.priority === 'critical';
  },
});
```

### 超时控制

```typescript
await subject.notify(data, {
  type: 'async',
  timeoutMs: 5000, // 5 秒超时
});
```

### 动态主题层级

```typescript
// 创建主题后动态设置父子关系
const parent = createSubject({ id: 'parent', name: '父主题' });
const child = createSubject({ id: 'child', name: '子主题' });

child.setParent(parent); // 建立层级关系
```

---

## 📊 性能优化建议

1. **高频事件使用 batch 模式** - 避免频繁触发
2. **非关键通知使用 async 模式** - 提升响应速度
3. **合理设置优先级** - 关键观察者优先执行
4. **及时清理无用观察者** - 避免内存泄漏
5. **使用过滤器减少通知范围** - 精准通知目标观察者

---

## ⚠️ 注意事项

1. **观察者错误处理** - 建议在 `onError` 中处理错误，避免影响其他观察者
2. **循环依赖** - 避免主题之间形成循环引用
3. **内存管理** - 不再使用的主题及时调用 `clear()` 或 `deleteSubject()`
4. **异步观察者** - 确保 `onUpdate` 返回 Promise 或使用 async 函数
5. **线程安全** - 当前实现非线程安全，多线程环境需自行加锁

---

## 📝 类型定义

```typescript
// 消息类型
type MessageType = 'sync' | 'async' | 'batch';

// 消息优先级
type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

// 观察者接口
interface IObserver<TData = any> {
  id: string;
  name: string;
  priority: MessagePriority;
  enabled: boolean;
  update(data: TData, topic: string): void | Promise<void>;
  onError?(error: Error, topic: string): void;
}

// 主题接口
interface ISubject<TData = any> {
  id: string;
  name: string;
  parentId?: string;
  observerCount: number;
  attach(observer: IObserver<TData>): void;
  detach(observerId: string): boolean;
  notify(data: TData, type?: MessageType): void | Promise<void>;
  getObservers(): IObserver<TData>[];
}
```

---

## 🧪 运行示例

```bash
# 在 TypeScript 环境中
import { ObserverPatternExamples } from './skills/observer-pattern-pro-skill';

// 运行所有示例
ObserverPatternExamples.basic();
await ObserverPatternExamples.async();
ObserverPatternExamples.hierarchy();
await ObserverPatternExamples.priority();
await ObserverPatternExamples.errorHandling();
```

---

## 📄 许可证

MIT License

---

**更新日志:**
- 2026-03-13: v1.0.0 初始版本
