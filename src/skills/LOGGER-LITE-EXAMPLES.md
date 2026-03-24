# Logger Lite Skill - 使用示例

## 📦 安装

无需额外依赖，纯 Node.js 原生模块实现。

```bash
# 直接使用，无需安装
```

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { LoggerLite } from './src/skills/logger-lite-skill';

// 创建日志记录器实例
const logger = new LoggerLite();

// 记录不同级别的日志
logger.debug('MyModule', '这是调试信息', { userId: 123 });
logger.info('MyModule', '这是普通信息');
logger.warn('MyModule', '这是警告信息');
logger.error('MyModule', '这是错误信息', new Error('出错了!'));
```

### 2. 自定义配置

```typescript
const logger = new LoggerLite({
  logDir: './custom-logs',        // 自定义日志目录
  maxFileSize: 5 * 1024 * 1024,   // 5MB 轮转
  maxFiles: 3,                    // 最多保留 3 个文件
  defaultLevel: 'debug',          // 记录所有级别
  consoleOutput: true,            // 输出到控制台
  fileNamePrefix: 'myapp',        // 文件名前缀
});
```

---

## 📝 使用场景

### 场景 1: API 服务日志

```typescript
import { LoggerLite } from './src/skills/logger-lite-skill';

const apiLogger = new LoggerLite({
  logDir: './logs/api',
  fileNamePrefix: 'api',
});

// 请求日志
apiLogger.info('HTTP', '收到请求', {
  method: 'POST',
  path: '/api/users',
  ip: '192.168.1.100',
});

// 响应日志
apiLogger.info('HTTP', '请求完成', {
  status: 200,
  duration: '45ms',
});

// 错误日志
apiLogger.error('HTTP', '请求失败', {
  status: 500,
  error: 'Database connection timeout',
});
```

### 场景 2: 任务执行日志

```typescript
import { LoggerLite } from './src/skills/logger-lite-skill';

const taskLogger = new LoggerLite({
  logDir: './logs/tasks',
  fileNamePrefix: 'tasks',
});

async function executeTask(taskId: string) {
  taskLogger.info('TaskExecutor', `开始执行任务 ${taskId}`);
  
  try {
    // 任务逻辑...
    taskLogger.debug('TaskExecutor', `任务 ${taskId} 进度`, { progress: 50 });
    
    taskLogger.info('TaskExecutor', `任务 ${taskId} 完成`);
  } catch (error) {
    taskLogger.error('TaskExecutor', `任务 ${taskId} 失败`, error);
    throw error;
  }
}
```

### 场景 3: 数据库操作日志

```typescript
import { LoggerLite } from './src/skills/logger-lite-skill';

const dbLogger = new LoggerLite({
  logDir: './logs/database',
  fileNamePrefix: 'db',
  defaultLevel: 'debug',
});

class DatabaseService {
  async query(sql: string, params?: any[]) {
    dbLogger.debug('Database', '执行查询', { sql, params });
    
    const start = Date.now();
    try {
      const result = await this.executeQuery(sql, params);
      const duration = Date.now() - start;
      
      dbLogger.info('Database', '查询完成', { duration: `${duration}ms`, rows: result.length });
      return result;
    } catch (error) {
      dbLogger.error('Database', '查询失败', { sql, error });
      throw error;
    }
  }
}
```

---

## 🔍 日志查询

### 1. 按级别查询

```typescript
import { query } from './src/skills/logger-lite-skill';

// 查询所有 ERROR 级别日志
const errors = query({ level: 'error' });

// 查询 WARN 和 ERROR 级别日志
const warnings = query({ level: ['warn', 'error'] });
```

### 2. 按模块查询

```typescript
// 查询特定模块的日志
const httpLogs = query({ module: 'HTTP' });

// 模糊匹配模块名
const dbLogs = query({ module: 'Database' });
```

### 3. 时间范围查询

```typescript
// 查询最近 1 小时的日志
const recentLogs = query({
  startTime: new Date(Date.now() - 3600000).toISOString(),
  endTime: new Date().toISOString(),
});
```

### 4. 关键词搜索

```typescript
// 搜索包含 "error" 的日志
const errorLogs = query({ search: 'error' });

// 组合查询
const criticalLogs = query({
  level: ['warn', 'error'],
  module: 'HTTP',
  search: 'timeout',
  limit: 50,
});
```

### 5. 分页查询

```typescript
// 第一页 (100 条)
const page1 = query({ limit: 100, offset: 0 });

// 第二页
const page2 = query({ limit: 100, offset: 100 });
```

---

## 📊 统计信息

```typescript
import { getStats } from './src/skills/logger-lite-skill';

const stats = getStats();

console.log('总日志数:', stats.totalEntries);
console.log('按级别统计:', stats.byLevel);
console.log('按模块统计:', stats.byModule);
console.log('总文件大小:', stats.totalSize, 'bytes');

// 输出示例:
// 总日志数：1234
// 按级别统计：{ debug: 500, info: 600, warn: 100, error: 34 }
// 按模块统计：{ HTTP: 800, Database: 300, TaskExecutor: 134 }
// 总文件大小：2048576 bytes
```

---

## 🛠️ 便捷函数

```typescript
import { debug, info, warn, error } from './src/skills/logger-lite-skill';

// 使用默认实例快速记录日志
debug('MyModule', '调试信息');
info('MyModule', '普通信息');
warn('MyModule', '警告信息');
error('MyModule', '错误信息', new Error('出错了!'));
```

---

## 🔄 日志轮转

日志文件会自动轮转：

```
logs/
├── app.0.log  ← 当前写入的文件
├── app.1.log  ← 上一次轮转的文件
├── app.2.log
├── app.3.log
└── app.4.log  ← 最旧的文件 (超出 maxFiles 时删除)
```

当 `app.0.log` 达到 `maxFileSize` 时:
1. 删除 `app.4.log`
2. `app.3.log` → `app.4.log`
3. `app.2.log` → `app.3.log`
4. `app.1.log` → `app.2.log`
5. `app.0.log` → `app.1.log`
6. 创建新的 `app.0.log`

---

## 🧹 工具方法

### 清空日志

```typescript
import { getLogger } from './src/skills/logger-lite-skill';

const logger = getLogger();
logger.clear();  // 删除所有日志文件
```

### 导出日志

```typescript
import { getLogger } from './src/skills/logger-lite-skill';

const logger = getLogger();

// 导出所有日志
const allLogs = logger.export();

// 导出特定级别的日志
const errorLogs = logger.export({ level: 'error' });

// 导出为文件
import * as fs from 'fs';
fs.writeFileSync('export.jsonl', logger.export());
```

### 获取路径信息

```typescript
import { getLogger } from './src/skills/logger-lite-skill';

const logger = getLogger();

console.log('当前日志文件:', logger.getCurrentLogPath());
console.log('日志目录:', logger.getLogDir());
```

---

## 🎨 控制台输出样式

日志在控制台中会以彩色显示:

```
[2026-03-13 18:20:00] [DEBUG] [MyModule] 调试信息
[2026-03-13 18:20:01] [INFO] [MyModule] 普通信息
[2026-03-13 18:20:02] [WARN] [MyModule] 警告信息
[2026-03-13 18:20:03] [ERROR] [MyModule] 错误信息
```

颜色编码:
- 🔵 DEBUG - 青色
- 🟢 INFO - 绿色
- 🟡 WARN - 黄色
- 🔴 ERROR - 红色

---

## 📋 完整示例

```typescript
import { LoggerLite, getStats } from './src/skills/logger-lite-skill';

// 创建配置化的日志记录器
const logger = new LoggerLite({
  logDir: './logs/myapp',
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 5,
  defaultLevel: 'info',
  consoleOutput: true,
  fileNamePrefix: 'app',
});

// 模拟应用启动
logger.info('App', '应用启动', {
  version: '1.0.0',
  env: process.env.NODE_ENV,
  port: 3000,
});

// 模拟业务逻辑
async function processOrder(orderId: string) {
  logger.info('OrderService', `开始处理订单 ${orderId}`);
  
  try {
    // 验证订单
    logger.debug('OrderService', '验证订单数据', { orderId });
    
    // 扣减库存
    logger.info('InventoryService', '扣减库存', { orderId, quantity: 2 });
    
    // 创建支付
    logger.info('PaymentService', '创建支付', { orderId, amount: 199.99 });
    
    logger.info('OrderService', `订单 ${orderId} 处理完成`);
  } catch (error) {
    logger.error('OrderService', `订单 ${orderId} 处理失败`, error);
    throw error;
  }
}

// 运行示例
processOrder('ORD-20260313-001');

// 查看统计
const stats = getStats();
console.log('日志统计:', stats);
```

---

## ⚠️ 注意事项

1. **线程安全**: 当前实现不是线程安全的，多线程环境下需加锁
2. **性能**: 高频日志场景建议异步写入或使用流式写入
3. **磁盘空间**: 定期清理旧日志或使用日志管理服务
4. **敏感信息**: 避免在日志中记录密码、token 等敏感数据

---

## 📄 许可证

MIT License - 可自由使用和修改
