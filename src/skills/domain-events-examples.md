# 领域事件技能 - 使用示例

**文件:** `src/skills/domain-events-skill.ts`  
**作者:** Axon (KAEL Engineering)  
**版本:** 1.0.0

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { getDomainEventBus, publish, subscribe } from '@/skills/domain-events-skill';

// 获取事件总线
const eventBus = getDomainEventBus();

// 订阅事件
const unsubscribe = subscribe('user.created', (event) => {
  console.log(`用户创建: ${event.payload.username}`);
  console.log(`时间戳: ${event.metadata.timestamp}`);
});

// 发布事件
await publish('user.created', {
  userId: 'u_123',
  username: 'axon',
  email: 'axon@example.com',
}, 'user-service');

// 取消订阅
unsubscribe();
```

---

## 📋 完整示例

### 示例 1: 定义领域事件

```typescript
import { defineEvent, getDomainEventBus } from '@/skills/domain-events-skill';

// 定义用户创建事件
const userCreatedEvent = defineEvent(
  'user.created',
  '当新用户被创建时触发',
  {
    userId: 'string',
    username: 'string',
    email: 'string',
    createdAt: 'number',
  } as const
);

// 创建事件实例
const event = userCreatedEvent.create(
  {
    userId: 'u_123',
    username: 'axon',
    email: 'axon@example.com',
    createdAt: Date.now(),
  },
  'user-service'
);

console.log(event);
// {
//   type: 'user.created',
//   payload: { ... },
//   metadata: {
//     timestamp: 1234567890,
//     source: 'user-service',
//     correlationId: '1234567890-abc123xyz'
//   }
// }
```

---

### 示例 2: 订阅与发布

```typescript
import { subscribe, publish } from '@/skills/domain-events-skill';

// 订阅用户创建事件
subscribe('user.created', async (event) => {
  console.log(`🎉 新用户注册: ${event.payload.username}`);
  
  // 发送欢迎邮件
  await sendWelcomeEmail(event.payload.email);
  
  // 初始化用户数据
  await initializeUserData(event.payload.userId);
});

// 订阅带优先级 (高优先级先执行)
subscribe('user.created', (event) => {
  console.log('🔒 创建安全记录');
}, { priority: 10 });

subscribe('user.created', (event) => {
  console.log('📊 发送分析数据');
}, { priority: 5 });

// 发布事件
await publish('user.created', {
  userId: 'u_123',
  username: 'axon',
  email: 'axon@example.com',
}, 'auth-service');

// 输出:
// 🔒 创建安全记录
// 📊 发送分析数据
// 🎉 新用户注册: axon
```

---

### 示例 3: 一次性订阅

```typescript
import { subscribeOnce, waitForEvent } from '@/skills/domain-events-skill';

// 订阅一次 (自动清理)
subscribeOnce('task.completed', (event) => {
  console.log(`任务完成: ${event.payload.taskId}`);
});

// 等待事件发生
try {
  const event = await waitForEvent('task.completed', 5000);
  console.log(`任务 ${event.payload.taskId} 在 ${event.metadata.timestamp} 完成`);
} catch (error) {
  console.error('等待任务完成超时:', error);
}
```

---

### 示例 4: 批量发布事件

```typescript
import { getDomainEventBus } from '@/skills/domain-events-skill';

const eventBus = getDomainEventBus();

// 批量发布
await eventBus.publishBatch([
  { type: 'task.created', payload: { taskId: 't_1' } },
  { type: 'task.created', payload: { taskId: 't_2' } },
  { type: 'task.created', payload: { taskId: 't_3' } },
]);
```

---

### 示例 5: 事件历史查询

```typescript
import { getDomainEventBus } from '@/skills/domain-events-skill';

const eventBus = getDomainEventBus();

// 获取所有历史事件
const allHistory = eventBus.getHistory();

// 获取特定类型的事件
const userEvents = eventBus.getHistory({ type: 'user.created' });

// 获取最近 10 条记录
const recent = eventBus.getHistory({ limit: 10 });

// 获取指定时间范围内的事件
const todayEvents = eventBus.getHistory({
  since: new Date('2026-03-13').getTime(),
  until: new Date('2026-03-14').getTime(),
});

console.log(`今天发生了 ${todayEvents.length} 个事件`);
```

---

### 示例 6: 使用预定义事件

```typescript
import { 
  subscribe, 
  publish, 
  UserEvents, 
  TaskEvents, 
  AgentEvents 
} from '@/skills/domain-events-skill';

// 订阅用户登录事件
subscribe(UserEvents.LOGGED_IN, (event) => {
  console.log(`${event.payload.username} 登录成功`);
});

// 订阅任务完成事件
subscribe(TaskEvents.COMPLETED, (event) => {
  console.log(`任务 ${event.payload.taskId} 完成`);
});

// 订阅 Agent 错误事件
subscribe(AgentEvents.ERROR, (event) => {
  console.error(`Agent ${event.payload.agentId} 发生错误:`, event.payload.error);
});

// 发布事件
await publish(UserEvents.LOGGED_IN, {
  userId: 'u_123',
  username: 'axon',
  loginTime: Date.now(),
});

await publish(TaskEvents.COMPLETED, {
  taskId: 't_456',
  completedAt: Date.now(),
  result: 'success',
});
```

---

### 示例 7: 事件溯源模式

```typescript
import { getDomainEventBus } from '@/skills/domain-events-skill';

const eventBus = getDomainEventBus();

// 定义聚合根
class UserAggregate {
  private events: any[] = [];
  
  createUser(data: any) {
    this.events.push({
      type: 'user.created',
      payload: data,
    });
    
    // 发布事件
    publish('user.created', data, 'user-aggregate');
  }
  
  updateUser(id: string, data: any) {
    this.events.push({
      type: 'user.updated',
      payload: { id, ...data },
    });
    
    publish('user.updated', { id, ...data }, 'user-aggregate');
  }
  
  // 重放事件重建状态
  replay(events: any[]) {
    events.forEach(event => {
      if (event.type === 'user.created') {
        // 重建用户
      } else if (event.type === 'user.updated') {
        // 应用更新
      }
    });
  }
}

// 获取历史事件进行重放
const userEvents = eventBus.getHistory({ type: 'user.created' });
const user = new UserAggregate();
user.replay(userEvents);
```

---

### 示例 8: 错误处理与超时

```typescript
import { subscribe, publish } from '@/skills/domain-events-skill';

// 带超时处理的订阅
subscribe('critical.operation', async (event) => {
  try {
    await performCriticalOperation(event.payload);
  } catch (error) {
    console.error('关键操作失败:', error);
    // 发布补偿事件
    await publish('operation.failed', {
      operationId: event.payload.operationId,
      error: error.message,
    });
  }
}, {
  timeout: 10000, // 10 秒超时
  priority: 100,  // 最高优先级
});
```

---

## 🔧 API 参考

### 类

#### `DomainEventBus`
主事件总线类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `defineEvent` | `type, description, schema?` | `EventDefinition` | 定义事件类型 |
| `subscribe` | `eventType, handler, options?` | `() => void` | 订阅事件 |
| `subscribeOnce` | `eventType, handler` | `() => void` | 订阅一次 |
| `publish` | `eventType, payload, source?` | `Promise<void>` | 发布事件 |
| `publishBatch` | `events[]` | `Promise<void>` | 批量发布 |
| `getHistory` | `options?` | `DomainEvent[]` | 获取历史 |
| `waitForEvent` | `eventType, timeout?` | `Promise<DomainEvent>` | 等待事件 |
| `getListenerCount` | `eventType` | `number` | 监听器数量 |
| `getEventTypes` | - | `string[]` | 所有事件类型 |
| `destroy` | - | `void` | 销毁 |

### 接口

#### `DomainEvent<T>`
```typescript
{
  type: string;
  payload: T;
  metadata: {
    timestamp: number;
    source?: string;
    correlationId?: string;
    causationId?: string;
  };
}
```

#### `SubscriptionOptions`
```typescript
{
  once?: boolean;      // 只触发一次
  priority?: number;   // 优先级
  timeout?: number;    // 超时时间 (ms)
}
```

### 便捷函数

```typescript
// 定义事件
defineEvent<T>(type, description, schema?)

// 订阅事件
subscribe<T>(eventType, handler, options?)

// 发布事件
publish<T>(eventType, payload, source?)

// 等待事件
waitForEvent<T>(eventType, timeout?)

// 获取全局实例
getDomainEventBus()

// 重置 (测试用)
resetDomainEventBus()
```

---

## 🎯 最佳实践

### 1. 事件命名规范
```typescript
// ✅ 推荐：aggregate.action
'user.created'
'task.completed'
'agent.error'

// ❌ 避免：动词开头或模糊命名
'createUser'
'done'
'event1'
```

### 2. 事件 payload 设计
```typescript
// ✅ 推荐：包含完整上下文
{
  userId: 'u_123',
  username: 'axon',
  email: 'axon@example.com',
  createdAt: Date.now(),
}

// ❌ 避免：信息不完整
{
  id: 'u_123',  // 什么 ID？
}
```

### 3. 错误处理
```typescript
subscribe('user.created', async (event) => {
  try {
    await processUser(event.payload);
  } catch (error) {
    // 发布补偿事件
    await publish('user.creation_failed', {
      userId: event.payload.userId,
      error: error.message,
    });
  }
});
```

### 4. 事件溯源
```typescript
// 保留所有历史事件用于重建状态
const eventBus = getDomainEventBus();
const history = eventBus.getHistory({ type: 'order.*' });
```

---

## ⚠️ 注意事项

1. **内存管理**: 及时取消不需要的订阅 (`unsubscribe()`)
2. **异步处理**: 处理器支持 async/await，但注意超时设置
3. **事件顺序**: 高优先级处理器先执行，但不保证严格顺序
4. **错误隔离**: 单个处理器错误不影响其他处理器
5. **测试清理**: 测试时使用 `resetDomainEventBus()` 清理状态

---

**完成时间:** 5 分钟内  
**交付物:** `src/skills/domain-events-skill.ts` + 使用示例
