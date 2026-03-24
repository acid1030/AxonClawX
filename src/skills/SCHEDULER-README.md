# Scheduler Utils Skill - ACE 任务调度器

> 轻量级任务调度工具，支持定时任务、任务队列和任务取消

## 📦 功能特性

- ✅ **定时任务** - 支持 Cron 表达式和延迟执行
- ✅ **任务队列** - 优先级队列、并发控制
- ✅ **任务取消** - 支持运行中任务取消
- ✅ **重试机制** - 自动重试、指数退避
- ✅ **超时控制** - 任务超时自动终止
- ✅ **状态管理** - 完整的任务生命周期追踪

## 🚀 快速开始

### 基础使用

```typescript
import { createScheduler } from './scheduler-utils-skill';

const scheduler = createScheduler({ maxConcurrent: 3 });

// 添加任务
const task = scheduler.add(async () => {
  console.log('Task executed');
  await doSomething();
}, {
  name: 'my-task',
  priority: 5,
  timeout: 30000,
});

// 等待完成
await scheduler.waitForTask(task.id);

// 查看统计
console.log(scheduler.getStats());
```

### 定时任务

```typescript
// 每分钟执行
scheduler.add(async () => {
  console.log('Heartbeat');
}, { cron: '* * * * *', name: 'heartbeat' });

// 每天凌晨 2 点执行
scheduler.add(async () => {
  console.log('Daily backup');
}, { cron: '0 2 * * *', name: 'backup' });

// 每 5 分钟执行
scheduler.add(async () => {
  console.log('Check status');
}, { cron: '*/5 * * * *', name: 'checker' });
```

### 延迟任务

```typescript
// 5 秒后执行
scheduler.add(async () => {
  console.log('Delayed task');
}, { delay: 5000, name: 'delayed' });
```

### 任务取消

```typescript
const task = scheduler.add(async () => {
  for (let i = 0; i < 100; i++) {
    if (task.cancelToken?.cancelled) {
      console.log('Cancelled, cleaning up');
      return;
    }
    await processItem(i);
  }
}, { name: 'long-running' });

// 取消任务
scheduler.cancel(task.id);
```

## 📖 API 参考

### createScheduler(options?)

创建调度器实例

```typescript
createScheduler({
  maxConcurrent?: number  // 最大并发数，默认 5
})
```

### scheduler.add(handler, options?)

添加任务到队列

```typescript
scheduler.add(
  async () => { /* 任务逻辑 */ },
  {
    id?: string,           // 自定义 ID
    name?: string,         // 任务名称
    priority?: number,     // 优先级 1-10，1 最高，默认 5
    timeout?: number,      // 超时时间 (ms)
    retries?: number,      // 重试次数，默认 0
    delay?: number,        // 延迟执行 (ms)
    cron?: string,         // Cron 表达式
    tags?: string[],       // 标签
  }
)
```

### scheduler.cancel(taskId)

取消任务

```typescript
const success = scheduler.cancel('task-id');
```

### scheduler.cancelAll()

取消所有任务

### scheduler.getTask(taskId)

获取任务详情

### scheduler.getTasks()

获取所有任务

### scheduler.getTasksByStatus(status)

按状态筛选任务

```typescript
const pending = scheduler.getTasksByStatus('pending');
const running = scheduler.getTasksByStatus('running');
const completed = scheduler.getTasksByStatus('completed');
```

### scheduler.getStats()

获取队列统计

```typescript
{
  pending: number,
  running: number,
  completed: number,
  failed: number,
  cancelled: number,
  total: number
}
```

### scheduler.waitForTask(taskId, timeout?)

等待单个任务完成

```typescript
await scheduler.waitForTask('task-id', 5000); // 5 秒超时
```

### scheduler.waitForAll(timeout?)

等待所有任务完成

```typescript
await scheduler.waitForAll(10000); // 10 秒超时
```

### scheduler.clearFinished()

清空已完成/失败/取消的任务

### scheduler.stop()

停止调度器，取消所有任务

## 🔧 工具函数

### validateCron(expression)

验证 Cron 表达式

```typescript
validateCron('* * * * *');     // true
validateCron('0 2 * * *');     // true
validateCron('invalid');       // false
```

### getNextCronRun(expression, fromDate?)

获取下次执行时间

```typescript
getNextCronRun('* * * * *');        // 下一分钟
getNextCronRun('0 2 * * *');        // 明天凌晨 2 点
getNextCronRun('0 9 * * 1');        // 下周一 9 点
```

## 📋 Cron 表达式格式

```
┌───────────── 分钟 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日期 (1 - 31)
│ │ │ ┌───────────── 月份 (1 - 12)
│ │ │ │ ┌───────────── 星期 (0 - 6, 0 = 周日)
│ │ │ │ │
* * * * *
```

### 特殊字符

- `*` - 所有值
- `,` - 分隔多个值 (e.g., `1,3,5`)
- `-` - 范围 (e.g., `1-5`)
- `/` - 步长 (e.g., `*/5` = 每 5 个单位)

### 示例

| 表达式 | 含义 |
|--------|------|
| `* * * * *` | 每分钟 |
| `*/5 * * * *` | 每 5 分钟 |
| `0 * * * *` | 每小时整点 |
| `0 2 * * *` | 每天凌晨 2 点 |
| `0 9 * * 1` | 每周一上午 9 点 |
| `0 0 1 * *` | 每月 1 号午夜 |
| `0 0 1 1,4,7,10 *` | 每季度第一天 |
| `0 9-18 * * 1-5` | 工作时间每小时 |

## 🎯 使用场景

### 1. 后台任务处理

```typescript
const scheduler = createScheduler({ maxConcurrent: 5 });

// 批量处理数据
dataItems.forEach(item => {
  scheduler.add(async () => {
    await processData(item);
  }, { priority: item.priority });
});

await scheduler.waitForAll();
```

### 2. 定期健康检查

```typescript
scheduler.add(async () => {
  const health = await checkSystemHealth();
  if (!health.healthy) {
    await alertAdmin(health);
  }
}, { cron: '*/5 * * * *', name: 'health-check' });
```

### 3. 定时数据同步

```typescript
scheduler.add(async () => {
  await syncDatabase();
  await syncCache();
}, { cron: '0 */6 * * *', name: 'data-sync' });
```

### 4. 可取消的长时间任务

```typescript
const task = scheduler.add(async () => {
  const files = await scanDirectory('/large/path');
  
  for (const file of files) {
    if (task.cancelToken?.cancelled) {
      await cleanup();
      return;
    }
    await processFile(file);
  }
}, { name: 'file-processor' });

// 用户点击取消按钮时
cancelButton.onclick = () => scheduler.cancel(task.id);
```

## ⚠️ 注意事项

1. **内存管理**: 定期调用 `clearFinished()` 清理已完成任务
2. **错误处理**: 任务失败会自动记录到 `task.error`
3. **资源清理**: 使用 `scheduler.stop()` 优雅关闭
4. **超时设置**: 建议为所有任务设置合理的 `timeout`

## 📝 完整示例

```typescript
import { createScheduler, validateCron } from './scheduler-utils-skill';

// 创建调度器
const scheduler = createScheduler({ maxConcurrent: 3 });

// 注册定时任务
scheduler.add(async () => {
  console.log('Heartbeat');
}, { cron: '* * * * *', name: 'heartbeat' });

// 添加批量任务
for (let i = 0; i < 100; i++) {
  scheduler.add(async () => {
    await processItem(i);
  }, { 
    name: `item-${i}`,
    priority: i % 3 + 1,  // 1-3 优先级
    retries: 2,
  });
}

// 等待完成
try {
  await scheduler.waitForAll(60000);
  console.log('All tasks completed');
} catch (error) {
  console.error('Timeout or error:', error);
}

// 清理
scheduler.clearFinished();
console.log('Stats:', scheduler.getStats());

// 停止
scheduler.stop();
```

## 🏃 运行示例

```bash
# 运行示例文件
uv run tsx src/skills/scheduler-utils-examples.ts
```

## 📄 License

MIT
