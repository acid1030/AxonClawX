# Job Queue Pro Skill - 使用示例

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)

---

## 示例 1: 基础任务队列

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

// 创建队列
const queue = createJobQueue();

// 添加简单任务
queue.enqueue(
  { 
    data: { message: 'Hello, World!' },
    description: '发送问候消息',
  },
  async (data, attempt) => {
    console.log(`[${attempt}] 处理：${data.message}`);
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: data.message };
  }
);

console.log('任务已添加到队列');
```

---

## 示例 2: 优先级调度

```typescript
import { createJobQueue, Priority } from './src/skills/job-queue-pro-skill';

const queue = createJobQueue();

// P0 - 紧急任务 (立即执行)
queue.enqueue(
  {
    data: { alert: '系统过载!' },
    priority: 'P0',
    isEmergency: true,
    description: '紧急告警',
  },
  async (data) => {
    console.log('🚨 紧急告警:', data.alert);
    await sendEmergencyAlert(data.alert);
  }
);

// P1 - 高优先级
queue.enqueue(
  {
    data: { report: '销售日报' },
    priority: 'P1',
    description: '生成日报',
  },
  async (data) => {
    console.log('📊 生成报告:', data.report);
    await generateReport(data.report);
  }
);

// P2 - 中等优先级 (默认)
queue.enqueue(
  {
    data: { task: '数据备份' },
    description: '日常备份',
  },
  async (data) => {
    console.log('💾 执行备份:', data.task);
    await backupData(data.task);
  }
);

// P3 - 低优先级
queue.enqueue(
  {
    data: { task: '清理缓存' },
    priority: 'P3',
    description: '缓存清理',
  },
  async (data) => {
    console.log('🧹 清理缓存:', data.task);
    await clearCache(data.task);
  }
);

console.log('已添加 4 个不同优先级的任务');
```

---

## 示例 3: 重试机制 - API 请求

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const apiQueue = createJobQueue({
  defaultMaxRetries: 5,
  defaultBackoffStrategy: 'exponential',
  defaultBackoffBaseDelay: 1000,
  defaultBackoffMaxDelay: 30000,
});

apiQueue.enqueue(
  {
    data: {
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token123' },
    },
    description: '获取用户列表',
    timeout: 30000, // 30 秒超时
  },
  async (data, attempt) => {
    console.log(`API 请求 (尝试 ${attempt}): ${data.url}`);
    
    try {
      const response = await fetch(data.url, {
        method: data.method,
        headers: data.headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const users = await response.json();
      console.log(`✅ 成功获取 ${users.length} 个用户`);
      return users;
      
    } catch (error) {
      console.error(`❌ 请求失败 (尝试 ${attempt}):`, error);
      throw error; // 抛出错误触发重试
    }
  }
);
```

---

## 示例 4: 不同退避策略对比

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

// 固定间隔重试
const fixedQueue = createJobQueue({
  defaultMaxRetries: 3,
  defaultBackoffStrategy: 'fixed',
  defaultBackoffBaseDelay: 5000, // 每次间隔 5 秒
});

fixedQueue.enqueue(
  { data: { strategy: 'fixed' } },
  async (data, attempt) => {
    console.log(`[Fixed] 尝试 ${attempt}, 延迟固定 5 秒`);
    if (attempt < 3) throw new Error('模拟失败');
    return 'success';
  }
);

// 线性增长重试
const linearQueue = createJobQueue({
  defaultMaxRetries: 3,
  defaultBackoffStrategy: 'linear',
  defaultBackoffBaseDelay: 2000, // 2s, 4s, 6s
});

linearQueue.enqueue(
  { data: { strategy: 'linear' } },
  async (data, attempt) => {
    const delay = 2000 * attempt;
    console.log(`[Linear] 尝试 ${attempt}, 延迟 ${delay}ms`);
    if (attempt < 3) throw new Error('模拟失败');
    return 'success';
  }
);

// 指数增长重试
const exponentialQueue = createJobQueue({
  defaultMaxRetries: 3,
  defaultBackoffStrategy: 'exponential',
  defaultBackoffBaseDelay: 1000, // 1s, 2s, 4s
});

exponentialQueue.enqueue(
  { data: { strategy: 'exponential' } },
  async (data, attempt) => {
    const delay = 1000 * Math.pow(2, attempt - 1);
    console.log(`[Exponential] 尝试 ${attempt}, 延迟 ${delay}ms`);
    if (attempt < 3) throw new Error('模拟失败');
    return 'success';
  }
);
```

---

## 示例 5: 事件监听

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const queue = createJobQueue();

// 监听所有事件
queue.onEvent((event) => {
  const timestamp = new Date(event.timestamp).toISOString();
  
  switch (event.type) {
    case 'created':
      console.log(`[${timestamp}] 📝 任务创建: ${event.task.id}`);
      console.log(`   优先级：${event.task.priority}`);
      console.log(`   描述：${event.task.description}`);
      break;
      
    case 'started':
      console.log(`[${timestamp}] ▶️  任务开始：${event.task.id}`);
      console.log(`   尝试次数：${event.task.retryCount + 1}`);
      break;
      
    case 'completed':
      const duration = event.task.completedAt! - event.task.startedAt!;
      console.log(`[${timestamp}] ✅ 任务完成：${event.task.id}`);
      console.log(`   结果:`, event.task.result);
      console.log(`   耗时：${duration}ms`);
      break;
      
    case 'failed':
      console.log(`[${timestamp}] ❌ 任务失败：${event.task.id}`);
      console.log(`   错误：${event.task.error}`);
      console.log(`   总重试：${event.task.retryCount}次`);
      break;
      
    case 'retrying':
      const nextRetry = new Date(event.task.nextRetryAt!).toISOString();
      console.log(`[${timestamp}] 🔄 任务重试：${event.task.id}`);
      console.log(`   第 ${event.task.retryCount} 次重试`);
      console.log(`   下次重试：${nextRetry}`);
      break;
      
    case 'cancelled':
      console.log(`[${timestamp}] ⛔ 任务取消：${event.task.id}`);
      break;
  }
});

// 添加测试任务
queue.enqueue(
  {
    data: { test: 'event_listener' },
    maxRetries: 2,
    description: '事件监听测试',
  },
  async (data, attempt) => {
    console.log(`执行任务 (尝试 ${attempt})`);
    if (attempt < 2) throw new Error('模拟失败');
    return { result: 'success' };
  }
);
```

---

## 示例 6: 批量任务处理

```typescript
import { createJobQueue, Priority } from './src/skills/job-queue-pro-skill';

const emailQueue = createJobQueue({
  concurrency: 10, // 同时发送 10 封邮件
  defaultMaxRetries: 3,
});

// 准备邮件列表
const emails = [
  { to: 'alice@example.com', subject: '欢迎加入', priority: 'P1' as Priority },
  { to: 'bob@example.com', subject: '产品更新', priority: 'P2' as Priority },
  { to: 'charlie@example.com', subject: '活动邀请', priority: 'P2' as Priority },
  { to: 'diana@example.com', subject: '账单通知', priority: 'P1' as Priority },
  { to: 'eve@example.com', subject: '系统维护', priority: 'P3' as Priority },
];

// 批量添加任务
const tasks = emailQueue.enqueueBatch(
  emails.map(email => ({
    data: email,
    priority: email.priority,
    description: `发送邮件给 ${email.to}`,
    metadata: { campaign: '2026-03' },
  })),
  async (data) => {
    console.log(`📧 发送邮件给 ${data.to}: ${data.subject}`);
    
    // 模拟邮件发送
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { 
      sent: true, 
      to: data.to, 
      messageId: `msg-${Date.now()}-${Math.random()}` 
    };
  }
);

console.log(`已添加 ${tasks.length} 个邮件发送任务`);

// 查看任务状态
tasks.forEach(task => {
  console.log(`任务 ${task.id}: ${task.description} [${task.priority}]`);
});
```

---

## 示例 7: 并发控制

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

// 创建并发队列
const concurrentQueue = createJobQueue({
  concurrency: 5,           // 最多同时执行 5 个任务
  executionInterval: 100,   // 任务启动间隔 100ms
  maxQueueSize: 100,
});

// 添加 20 个任务
for (let i = 0; i < 20; i++) {
  concurrentQueue.enqueue(
    {
      data: { index: i },
      description: `处理任务 #${i}`,
    },
    async (data) => {
      const startTime = Date.now();
      console.log(`▶️  开始任务 #${data.index}, 运行中：${concurrentQueue.runningCount()}`);
      
      // 模拟耗时操作
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      
      const duration = Date.now() - startTime;
      console.log(`✅ 完成任务 #${data.index}, 耗时 ${duration}ms`);
      
      return { index: data.index, duration };
    }
  );
}

console.log('已添加 20 个任务，最多并发 5 个');

// 监控队列状态
setInterval(() => {
  const stats = concurrentQueue.getStats();
  console.log(`\n队列状态: 等待 ${stats.byStatus.pending}, 运行 ${stats.byStatus.running}, 完成 ${stats.byStatus.completed}`);
}, 2000);
```

---

## 示例 8: 队列统计与监控

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const queue = createJobQueue({
  concurrency: 3,
  defaultMaxRetries: 2,
});

// 添加各种类型的任务
for (let i = 0; i < 10; i++) {
  queue.enqueue(
    {
      data: { index: i },
      priority: i % 4 === 0 ? 'P0' : i % 4 === 1 ? 'P1' : i % 4 === 2 ? 'P2' : 'P3',
      isEmergency: i === 0,
      description: `任务 #${i}`,
    },
    async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      return { processed: data.index };
    }
  );
}

// 实时监控
const monitor = setInterval(() => {
  const stats = queue.getStats();
  
  console.log('\n=== 队列统计 ===');
  console.log(`总任务数：${stats.totalSize}`);
  console.log(`优先级分布: P0=${stats.byPriority.P0}, P1=${stats.byPriority.P1}, P2=${stats.byPriority.P2}, P3=${stats.byPriority.P3}`);
  console.log(`状态分布：等待=${stats.byStatus.pending}, 运行=${stats.byStatus.running}, 完成=${stats.byStatus.completed}, 失败=${stats.byStatus.failed}`);
  console.log(`紧急任务：${stats.emergencyCount}`);
  console.log(`累计完成：${stats.totalCompleted}`);
  console.log(`累计失败：${stats.totalFailed}`);
  console.log(`累计重试：${stats.totalRetries}`);
  console.log(`平均执行时间：${Math.round(stats.avgExecutionTime)}ms`);
  
  // 队列完成后停止监控
  if (stats.byStatus.pending === 0 && stats.byStatus.running === 0) {
    clearInterval(monitor);
    console.log('\n✅ 所有任务完成!');
  }
}, 1000);
```

---

## 示例 9: 任务取消与暂停

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const queue = createJobQueue();

// 添加任务
const task1 = queue.enqueue(
  { data: { name: '任务 1' }, description: '将被取消的任务' },
  async (data) => {
    console.log('执行:', data.name);
    return '完成';
  }
);

const task2 = queue.enqueue(
  { data: { name: '任务 2' }, description: '正常执行的任务' },
  async (data) => {
    console.log('执行:', data.name);
    return '完成';
  }
);

console.log(`任务 1 ID: ${task1.id}`);
console.log(`任务 2 ID: ${task2.id}`);

// 取消任务 1
const cancelled = queue.cancelTask(task1.id);
console.log(`任务 1 取消结果：${cancelled}`);

// 查看任务状态
const task1Status = queue.getTask(task1.id);
console.log(`任务 1 状态：${task1Status?.status}`);

// 暂停队列
queue.pause();
console.log('队列已暂停');

// 添加的任务不会立即执行
queue.enqueue(
  { data: { name: '任务 3' } },
  async (data) => {
    console.log('执行:', data.name);
  }
);

console.log('添加了任务 3 (不会立即执行)');

// 恢复队列
setTimeout(() => {
  queue.resume();
  console.log('队列已恢复');
}, 3000);
```

---

## 示例 10: 等待队列完成

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

async function runExample() {
  const queue = createJobQueue({ concurrency: 3 });

  // 添加 10 个任务
  for (let i = 0; i < 10; i++) {
    queue.enqueue(
      {
        data: { index: i },
        description: `任务 #${i}`,
      },
      async (data) => {
        console.log(`开始任务 #${data.index}`);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        console.log(`完成任务 #${data.index}`);
        return { index: data.index };
      }
    );
  }

  console.log('已添加 10 个任务，等待完成...\n');

  try {
    // 等待所有任务完成 (最多 30 秒)
    await queue.waitForCompletion(30000);
    console.log('\n✅ 所有任务在 30 秒内完成!');
    
    const stats = queue.getStats();
    console.log(`总完成：${stats.totalCompleted}, 总失败：${stats.totalFailed}`);
    
  } catch (error) {
    console.error('\n❌ 等待超时:', error);
    
    const stats = queue.getStats();
    console.log(`剩余任务：${stats.byStatus.pending + stats.byStatus.running}`);
  }
}

runExample();
```

---

## 示例 11: 文件处理流水线

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const fileQueue = createJobQueue({
  concurrency: 5,
  defaultMaxRetries: 2,
  defaultBackoffStrategy: 'linear',
  defaultBackoffBaseDelay: 2000,
});

// 文件处理任务
const files = [
  { path: '/uploads/photo1.jpg', operations: ['resize', 'compress'] },
  { path: '/uploads/photo2.jpg', operations: ['resize', 'watermark'] },
  { path: '/uploads/document.pdf', operations: ['compress', 'thumbnail'] },
];

fileQueue.enqueueBatch(
  files.map(file => ({
    data: file,
    priority: 'P1',
    timeout: 120000, // 2 分钟超时
    description: `处理文件：${file.path}`,
  })),
  async (data, attempt) => {
    console.log(`[${attempt}] 处理文件：${data.path}`);
    
    let processedFile = await loadFile(data.path);
    
    for (const op of data.operations) {
      console.log(`  → 执行操作：${op}`);
      
      switch (op) {
        case 'resize':
          processedFile = await resizeImage(processedFile, 1920, 1080);
          break;
        case 'compress':
          processedFile = await compressImage(processedFile, 0.8);
          break;
        case 'watermark':
          processedFile = await addWatermark(processedFile, '© 2026');
          break;
        case 'thumbnail':
          processedFile = await createThumbnail(processedFile, 200, 200);
          break;
      }
    }
    
    const outputPath = `/processed/${path.basename(data.path)}`;
    await saveFile(processedFile, outputPath);
    
    console.log(`  ✅ 完成：${outputPath}`);
    return { input: data.path, output: outputPath };
  }
);
```

---

## 示例 12: 自定义配置

```typescript
import { createJobQueue } from './src/skills/job-queue-pro-skill';

// 高吞吐配置
const highThroughputQueue = createJobQueue({
  maxQueueSize: 5000,
  defaultPriority: 'P2',
  defaultMaxRetries: 3,
  defaultBackoffStrategy: 'exponential',
  defaultBackoffBaseDelay: 1000,
  defaultBackoffMaxDelay: 60000,
  allowEmergencyInsert: true,
  concurrency: 20,
  executionInterval: 50,
});

// 低延迟配置
const lowLatencyQueue = createJobQueue({
  maxQueueSize: 100,
  defaultPriority: 'P1',
  defaultMaxRetries: 1,
  defaultBackoffStrategy: 'fixed',
  defaultBackoffBaseDelay: 500,
  defaultBackoffMaxDelay: 5000,
  allowEmergencyInsert: true,
  concurrency: 1,
  executionInterval: 0,
});

// 批处理配置
const batchQueue = createJobQueue({
  maxQueueSize: 10000,
  defaultPriority: 'P3',
  defaultMaxRetries: 5,
  defaultBackoffStrategy: 'linear',
  defaultBackoffBaseDelay: 5000,
  defaultBackoffMaxDelay: 300000,
  allowEmergencyInsert: false,
  concurrency: 2,
  executionInterval: 1000,
});

console.log('创建了 3 个不同配置的队列');
console.log('高吞吐队列配置:', highThroughputQueue.getConfig());
console.log('低延迟队列配置:', lowLatencyQueue.getConfig());
console.log('批处理队列配置:', batchQueue.getConfig());
```

---

**最后更新:** 2026-03-13  
**维护者:** Axon (KAEL Engineering)
