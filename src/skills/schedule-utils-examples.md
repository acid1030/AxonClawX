# 定时任务工具 - 使用示例

## 📦 安装与导入

```typescript
import {
  createScheduler,
  validateCron,
  parseCron,
  getNextRun,
  TaskScheduler,
} from './src/skills/schedule-utils-skill';
```

---

## 🚀 快速开始

### 示例 1: 创建调度器并注册任务

```typescript
// 创建调度器
const scheduler = createScheduler({
  maxConcurrentTasks: 5,      // 最大并发任务数
  defaultRetryCount: 3,       // 默认重试次数
  taskTimeout: 300000,        // 任务超时 (5 分钟)
});

// 注册任务 - 每分钟执行心跳
scheduler.register(
  'heartbeat',
  '* * * * *',  // Cron: 每分钟
  async () => {
    console.log('❤️ Heartbeat executed at', new Date().toISOString());
    // 执行心跳逻辑
  }
);

// 注册任务 - 每 5 分钟检查状态
scheduler.register(
  'status-check',
  '*/5 * * * *',  // Cron: 每 5 分钟
  async () => {
    console.log('📊 Status check executed');
    // 检查系统状态
  }
);

// 注册任务 - 每天凌晨 2 点备份
scheduler.register(
  'daily-backup',
  '0 2 * * *',  // Cron: 每天 2:00
  async () => {
    console.log('💾 Daily backup started');
    await performBackup();
    console.log('✅ Backup completed');
  }
);

// 注册任务 - 每周一上午 9 点生成周报
scheduler.register(
  'weekly-report',
  '0 9 * * 1',  // Cron: 每周一 9:00
  async () => {
    console.log('📈 Generating weekly report');
    await generateReport();
  }
);
```

---

## 📋 Cron 表达式参考

### 基础格式
```
分钟 小时 日期 月份 星期
0-59 0-23 1-31 1-12 0-6 (0=周日)
```

### 常用示例

| Cron 表达式 | 含义 | 中文描述 |
|------------|------|----------|
| `* * * * *` | 每分钟 | 每分钟执行一次 |
| `*/5 * * * *` | 每 5 分钟 | 每隔 5 分钟执行一次 |
| `0 * * * *` | 每小时整点 | 每小时执行一次 |
| `0 9 * * *` | 每天 9:00 | 每天早上 9 点执行 |
| `0 9 * * 1-5` | 工作日 9:00 | 周一到周五早上 9 点 |
| `0 0 * * 0` | 每周日午夜 | 每周日凌晨执行 |
| `0 0 1 * *` | 每月 1 号午夜 | 每月 1 号执行 |
| `0 0 1 1 *` | 每年 1 月 1 日 | 元旦执行 |
| `30 8 * * 1` | 每周一 8:30 | 周一早上 8 点半 |
| `0 9-18 * * 1-5` | 工作时间每小时 | 工作日 9 点到 18 点每小时 |

### 特殊字符说明

- `*` - 匹配所有值
- `,` - 分隔多个值 (如 `1,3,5`)
- `-` - 范围 (如 `1-5`)
- `/` - 步长 (如 `*/5` 表示每 5 个单位)

---

## 🔧 任务管理

### 查看任务状态

```typescript
// 获取所有任务
const tasks = scheduler.getTasks();
console.log(`已注册 ${tasks.length} 个任务`);

tasks.forEach(task => {
  console.log(`
    任务名：${task.name}
    ID: ${task.id}
    Cron: ${task.cronExpression}
    状态：${task.enabled ? '启用' : '禁用'}
    已执行：${task.runCount} 次
    上次执行：${task.lastRun?.toISOString() || '从未'}
    下次执行：${task.nextRun?.toISOString() || '未调度'}
  `);
});

// 获取单个任务状态
const task = scheduler.getTaskStatus('task_xxx');
if (task) {
  console.log('任务详情:', task);
}
```

### 启用/禁用任务

```typescript
// 禁用任务
scheduler.setTaskEnabled('daily-backup', false);
console.log('任务已禁用');

// 重新启用任务
scheduler.setTaskEnabled('daily-backup', true);
console.log('任务已启用');
```

### 立即执行任务

```typescript
// 立即执行某个任务 (不等待定时)
const success = await scheduler.runNow('heartbeat');
if (success) {
  console.log('任务立即执行成功');
} else {
  console.log('任务不存在');
}
```

### 取消任务

```typescript
// 取消并删除任务
const removed = scheduler.unregister('weekly-report');
if (removed) {
  console.log('任务已取消');
}
```

### 停止所有任务

```typescript
// 停止调度器 (清除所有定时器)
scheduler.stop();
console.log('所有任务已停止');
```

---

## 📊 队列管理

### 查看队列状态

```typescript
const queueStatus = scheduler.getQueueStatus();
console.log(`
  待执行：${queueStatus.pending}
  执行中：${queueStatus.running}
  总计：${queueStatus.total}
`);
```

### 自定义任务优先级

```typescript
// 任务队列会自动按优先级排序
// priority: 1-10, 1 = 最高优先级
// 当任务失败时会自动加入重试队列
```

---

## ✅ Cron 验证工具

```typescript
// 验证 Cron 表达式是否有效
console.log(validateCron('* * * * *'));      // true
console.log(validateCron('*/5 * * * *'));    // true
console.log(validateCron('0 9 * * 1-5'));    // true
console.log(validateCron('invalid'));        // false
console.log(validateCron('60 * * * *'));     // false (分钟超出范围)
```

---

## 📅 计算下次执行时间

```typescript
// 获取下次执行时间
const nextRun = getNextRun('0 9 * * 1');
console.log('下次执行时间:', nextRun.toISOString());

// 从指定时间开始计算
const fromDate = new Date('2026-03-13T10:00:00');
const nextRun2 = getNextRun('0 9 * * 1', fromDate);
console.log('从指定时间计算的下次执行:', nextRun2);
```

---

## 🛡️ 错误处理与重试

```typescript
const scheduler = createScheduler({
  defaultRetryCount: 3,  // 失败后最多重试 3 次
  taskTimeout: 60000,    // 任务超时 60 秒
});

scheduler.register(
  'data-sync',
  '*/15 * * * *',
  async () => {
    try {
      console.log('开始数据同步...');
      await syncData();
      console.log('数据同步完成');
    } catch (error) {
      console.error('数据同步失败:', error);
      throw error; // 抛出错误会触发重试机制
    }
  }
);

// 重试逻辑:
// - 第 1 次重试：1 秒后
// - 第 2 次重试：2 秒后
// - 第 3 次重试：4 秒后
// - 最大延迟：30 秒
```

---

## 🎯 实际应用场景

### 场景 1: 定期数据清理

```typescript
scheduler.register(
  'cleanup-temp-files',
  '0 3 * * *',  // 每天凌晨 3 点
  async () => {
    const tempDir = '/tmp/app';
    const files = await fs.readdir(tempDir);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      // 删除 7 天前的文件
      if (Date.now() - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
        await fs.unlink(filePath);
        console.log('删除旧文件:', file);
      }
    }
  }
);
```

### 场景 2: API 健康检查

```typescript
scheduler.register(
  'api-health-check',
  '*/5 * * * *',  // 每 5 分钟
  async () => {
    const endpoints = [
      'https://api.example.com/health',
      'https://api.example.com/status',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { timeout: 5000 });
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
        console.log(`✅ ${endpoint} 正常`);
      } catch (error) {
        console.error(`❌ ${endpoint} 异常:`, error);
        // 发送告警通知
        await sendAlert(endpoint, error);
      }
    }
  }
);
```

### 场景 3: 定时报告生成

```typescript
scheduler.register(
  'daily-metrics-report',
  '0 8 * * 1-5',  // 工作日早上 8 点
  async () => {
    console.log('生成每日指标报告...');
    
    // 收集数据
    const metrics = await collectMetrics();
    
    // 生成报告
    const report = await generateReport(metrics);
    
    // 发送邮件
    await sendEmail({
      to: 'team@example.com',
      subject: '每日指标报告',
      body: report,
    });
    
    console.log('报告发送完成');
  }
);
```

### 场景 4: 缓存刷新

```typescript
scheduler.register(
  'refresh-cache',
  '0 */2 * * *',  // 每 2 小时
  async () => {
    console.log('刷新缓存...');
    
    const cacheKeys = ['users', 'products', 'settings'];
    
    for (const key of cacheKeys) {
      const data = await fetchFromDatabase(key);
      await cache.set(key, data, { ttl: 7200 }); // 2 小时过期
    }
    
    console.log('缓存刷新完成');
  }
);
```

---

## 📝 最佳实践

### 1. 任务命名规范

```typescript
// ✅ 好的命名
scheduler.register('daily-backup', '0 2 * * *', handler);
scheduler.register('hourly-metrics', '0 * * * *', handler);

// ❌ 避免的命名
scheduler.register('task1', '0 2 * * *', handler);
scheduler.register('test', '0 * * * *', handler);
```

### 2. 错误处理

```typescript
// ✅ 总是捕获并记录错误
scheduler.register('my-task', '* * * * *', async () => {
  try {
    await doSomething();
  } catch (error) {
    console.error('任务执行失败:', error);
    throw error; // 触发重试
  }
});
```

### 3. 资源管理

```typescript
// ✅ 应用退出时清理
process.on('SIGINT', () => {
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  scheduler.stop();
  process.exit(0);
});
```

### 4. 并发控制

```typescript
// 根据系统负载调整并发数
const scheduler = createScheduler({
  maxConcurrentTasks: os.cpus().length, // 根据 CPU 核心数
});
```

---

## 🔍 调试技巧

```typescript
// 1. 查看所有注册的任务
console.table(scheduler.getTasks().map(t => ({
  name: t.name,
  cron: t.cronExpression,
  enabled: t.enabled,
  nextRun: t.nextRun?.toLocaleString(),
})));

// 2. 验证 Cron 表达式
const cron = '*/5 * * * *';
console.log('Cron 有效:', validateCron(cron));
console.log('解析结果:', parseCron(cron));
console.log('人类可读:', CronParser.toHumanReadable(cron));
console.log('下次执行:', getNextRun(cron).toLocaleString());

// 3. 监控队列
setInterval(() => {
  const status = scheduler.getQueueStatus();
  console.log('队列状态:', status);
}, 10000);
```

---

## 📚 API 参考

### CronParser

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `parse(expression)` | `string` | `CronExpression` | 解析 Cron 表达式 |
| `validate(expression)` | `string` | `boolean` | 验证 Cron 表达式 |
| `getNextRun(cron, fromDate?)` | `CronExpression, Date?` | `Date` | 计算下次执行时间 |
| `toHumanReadable(expression)` | `string` | `string` | 转换为人类可读格式 |

### TaskScheduler

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `register(name, cron, handler)` | `string, string, Function` | `ScheduledTask` | 注册任务 |
| `unregister(taskId)` | `string` | `boolean` | 取消任务 |
| `setTaskEnabled(taskId, enabled)` | `string, boolean` | `boolean` | 启用/禁用任务 |
| `runNow(taskId)` | `string` | `Promise<boolean>` | 立即执行 |
| `getTasks()` | - | `ScheduledTask[]` | 获取所有任务 |
| `getTaskStatus(taskId)` | `string` | `ScheduledTask?` | 获取任务状态 |
| `getQueueStatus()` | - | `object` | 获取队列状态 |
| `stop()` | - | `void` | 停止所有任务 |

---

## ⚠️ 注意事项

1. **时区**: 当前实现使用系统本地时间，如需 UTC 时间请自行调整
2. **精度**: 最小精度为分钟，不支持秒级调度
3. **持久化**: 任务注册信息不持久化，重启后需重新注册
4. **内存**: 长时间运行的应用注意监控内存使用
5. **错误处理**: 务必在任务处理器中处理异常，避免未捕获的 Promise rejection

---

**版本:** 1.0.0  
**作者:** NOVA  
**更新时间:** 2026-03-13
