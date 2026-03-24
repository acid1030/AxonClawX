# 🚀 限流器快速开始指南

**5 分钟上手并发限流器**

---

## 1️⃣ 安装导入

```typescript
import { ConcurrencyLimiter } from './src/skills/limiter-utils-skill';
```

---

## 2️⃣ 创建限流器

```typescript
const limiter = new ConcurrencyLimiter({ 
  concurrency: 3  // 最多 3 个任务同时执行
});
```

---

## 3️⃣ 添加任务

```typescript
// 添加单个任务
const result = await limiter.add(async () => {
  return await fetchData();
});

// 添加带优先级的任务
await limiter.add(() => urgentTask(), 'critical');  // 紧急
await limiter.add(() => normalTask(), 'normal');    // 普通
await limiter.add(() => backgroundTask(), 'low');   // 后台
```

---

## 4️⃣ 批量执行

```typescript
// 批量添加任务
const tasks = [
  () => fetchUrl('https://api1.com'),
  () => fetchUrl('https://api2.com'),
  () => fetchUrl('https://api3.com'),
];

const results = await limiter.addBatch(tasks, 'high');
```

---

## 5️⃣ 查看状态

```typescript
const stats = limiter.getStats();
console.log(stats);
// {
//   running: 3,      // 运行中
//   pending: 5,      // 等待中
//   completed: 10,   // 已完成
//   failed: 1,       // 失败
//   cancelled: 0,    // 已取消
//   avgWaitTime: 120,  // 平均等待 (ms)
//   avgExecTime: 350   // 平均执行 (ms)
// }
```

---

## 6️⃣ 取消任务

```typescript
// 取消单个任务
limiter.cancel(taskId);

// 取消所有任务
limiter.cancelAll();
```

---

## 🎯 常见场景

### 场景 1: 批量 API 请求
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 10 });

const urls = Array.from({ length: 100 }, (_, i) => 
  `https://api.example.com/data/${i}`
);

const results = await Promise.all(
  urls.map(url => limiter.add(() => fetch(url).then(r => r.json())))
);
```

### 场景 2: 文件下载
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 3 });

const files = ['file1.zip', 'file2.zip', 'file3.zip', 'file4.zip', 'file5.zip'];

await Promise.all(
  files.map(file => 
    limiter.add(() => downloadFile(file))
  )
);
```

### 场景 3: 数据库批量插入
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 5 });

const records = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

await Promise.all(
  records.map(record => 
    limiter.add(() => db.insert(record))
  )
);
```

### 场景 4: 优先级任务
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 2 });

// 普通任务
limiter.add(() => processOrder('order-1'), 'normal');
limiter.add(() => processOrder('order-2'), 'normal');

// VIP 任务插队
await limiter.add(() => processOrder('VIP-001'), 'critical');
```

---

## ⚙️ 配置选项

```typescript
new ConcurrencyLimiter({
  concurrency: 5,       // 最大并发数
  maxQueueSize: 1000,   // 队列最大长度
  timeout: 30000,       // 任务超时 (ms)
  autoRetry: false,     // 自动重试
  retryCount: 3,        // 重试次数
  retryDelay: 1000,     // 重试延迟 (ms)
});
```

---

## 📊 优先级级别

| 优先级 | 说明 | 使用场景 |
|--------|------|----------|
| `critical` | 紧急 | 系统告警、VIP 请求 |
| `high` | 高 | 重要业务、付费用户 |
| `normal` | 普通 | 默认级别 |
| `low` | 低 | 后台任务、日志处理 |

---

## 🛠️ 便捷函数

### 快速创建
```typescript
const limiter = createLimiter(3); // 等同于 new ConcurrencyLimiter({ concurrency: 3 })
```

### 批量执行
```typescript
const results = await executeWithConcurrency(
  tasks,  // 任务数组
  5       // 并发数
);
```

### 优先级批处理
```typescript
const results = await executeWithPriority(
  {
    critical: [urgentTask1, urgentTask2],
    high: [importantTask],
    normal: [normalTask1, normalTask2],
    low: [backgroundTask],
  },
  3  // 并发数
);
```

---

## ⚠️ 注意事项

### 1. 错误处理
```typescript
try {
  const result = await limiter.add(() => riskyOperation());
  if (result.status === 'failed') {
    console.error('任务失败:', result.error);
  }
} catch (error) {
  console.error('异常:', error);
}
```

### 2. 内存保护
```typescript
new ConcurrencyLimiter({
  maxQueueSize: 100  // 防止队列无限增长
});
```

### 3. 超时设置
```typescript
new ConcurrencyLimiter({
  timeout: 30000  // 30 秒超时，防止任务卡死
});
```

---

## 📈 性能建议

### 并发数选择
- **CPU 密集型**: `CPU 核心数`
- **IO 密集型**: `CPU 核心数 × 2~10`
- **网络请求**: `10~50`

### 示例
```typescript
// 4 核 CPU，IO 密集型任务
const limiter = new ConcurrencyLimiter({ concurrency: 8 });

// 网络爬虫
const limiter = new ConcurrencyLimiter({ concurrency: 20 });
```

---

## 🎓 完整示例

```typescript
import { ConcurrencyLimiter } from './src/skills/limiter-utils-skill';

async function main() {
  // 创建限流器
  const limiter = new ConcurrencyLimiter({ 
    concurrency: 3,
    timeout: 10000,
  });
  
  // 添加任务
  const promises = Array.from({ length: 10 }, (_, i) => 
    limiter.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `Task ${i} completed`;
    })
  );
  
  // 等待所有任务完成
  const results = await Promise.all(promises);
  
  // 打印结果
  console.log('完成:', results.length);
  
  // 打印统计
  const stats = limiter.getStats();
  console.log('统计:', stats);
}

main();
```

---

## 📚 更多资源

- [完整 API 文档](./LIMITER-README.md)
- [使用示例](./limiter-utils-examples.ts)
- [源代码](./limiter-utils-skill.ts)

---

**完成时间:** 5 分钟  
**难度:** ⭐⭐☆☆☆
