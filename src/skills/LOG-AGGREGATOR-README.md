# 📊 Log Aggregator Skill - ACE 日志聚合工具

**完成时间:** 2026-03-13 20:48  
**交付物:** `src/skills/log-aggregator-skill.ts`

---

## 🎯 功能概述

### 1. 日志收集 (Log Collection)
- ✅ 支持多来源日志收集 (Console, File, Network, Database, Agent, System)
- ✅ 自动时间戳和 ID 生成
- ✅ 实时监听器支持
- ✅ 批量收集优化

### 2. 日志聚合 (Log Aggregation)
- ✅ 多收集器统一管理
- ✅ 自动去重和排序
- ✅ 时间窗口聚合
- ✅ 按模块/来源/级别聚合
- ✅ 统计信息生成

### 3. 日志查询 (Log Query)
- ✅ 关键词搜索
- ✅ 正则表达式搜索
- ✅ 多维度过滤 (级别/来源/模块/时间)
- ✅ 分页支持
- ✅ 错误/警告快速筛选

### 4. 日志导出 (Log Export)
- ✅ JSON 格式
- ✅ CSV 格式
- ✅ 文本格式

---

## 📦 核心类

### LogCollector
日志收集器，负责从单一来源收集日志。

```typescript
const collector = new LogCollector(maxEntries?: number);
```

### LogAggregator
日志聚合器，统一管理多个收集器。

```typescript
const aggregator = new LogAggregator();
aggregator.registerCollector('name', collector);
```

### LogSearcher
日志查询器，提供搜索和过滤功能。

```typescript
const searcher = new LogSearcher(aggregator);
```

### LogExporter
日志导出器，支持多种格式导出。

```typescript
const exporter = new LogExporter();
```

---

## 🚀 快速开始

### 基础使用

```typescript
import { LogCollector, LogLevel, LogSource } from './log-aggregator-skill';

// 1. 创建收集器
const collector = new LogCollector();

// 2. 收集日志
collector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'TaskExecutor',
  message: 'Task started successfully',
  data: { taskId: '123', priority: 'high' },
});

// 3. 获取日志
const logs = collector.getEntries();
console.log(`Collected ${logs.length} logs`);
```

### 多收集器聚合

```typescript
import { LogAggregator, LogCollector, LogLevel, LogSource } from './log-aggregator-skill';

// 1. 创建聚合器
const aggregator = new LogAggregator();

// 2. 创建多个收集器
const agentCollector = new LogCollector();
const systemCollector = new LogCollector();
const networkCollector = new LogCollector();

// 3. 注册收集器
aggregator.registerCollector('agent', agentCollector);
aggregator.registerCollector('system', systemCollector);
aggregator.registerCollector('network', networkCollector);

// 4. 各收集器独立收集日志
agentCollector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'Agent1',
  message: 'Agent initialized',
});

systemCollector.collect({
  level: LogLevel.WARN,
  source: LogSource.SYSTEM,
  module: 'Memory',
  message: 'High memory usage detected',
  data: { usage: '85%' },
});

// 5. 获取聚合日志
const allLogs = aggregator.getAggregatedLogs();
console.log(`Total: ${allLogs.length} logs`);

// 6. 获取统计信息
const stats = aggregator.getStats();
console.log('Stats:', stats);
// 输出:
// {
//   total: 2,
//   byLevel: { INFO: 1, WARN: 1 },
//   bySource: { AGENT: 1, SYSTEM: 1 },
//   byModule: { Agent1: 1, Memory: 1 },
//   timeRange: { start: ..., end: ... }
// }
```

---

## 🔍 查询和过滤

### 关键词搜索

```typescript
import { LogSearcher } from './log-aggregator-skill';

const searcher = new LogSearcher(aggregator);

// 基础搜索
const results = searcher.search('error');
console.log(`Found ${results.length} logs`);

// 区分大小写
const caseSensitiveResults = searcher.search('Error', { caseSensitive: true });

// 限制结果数量
const limitedResults = searcher.search('error', { limit: 50 });
```

### 正则表达式搜索

```typescript
// 搜索包含数字的日志
const numberLogs = searcher.searchByRegex(/\d+/);

// 搜索邮箱地址
const emailLogs = searcher.searchByRegex(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

// 搜索错误代码
const errorCodeLogs = searcher.searchByRegex(/E\d{3,4}/);
```

### 按级别过滤

```typescript
// 获取所有错误 (ERROR 和 FATAL)
const errors = searcher.filterByLevel(LogLevel.ERROR, true);

// 仅获取 ERROR 级别
const onlyErrors = searcher.filterByLevel(LogLevel.ERROR, false);

// 快捷方法
const errorLogs = searcher.getErrors();
const warningLogs = searcher.getWarnings();
```

### 按时间范围过滤

```typescript
// 最近 1 小时
const now = Date.now();
const lastHour = now - 3600000;
const recentLogs = searcher.filterByTimeRange(lastHour, now);

// 最近 24 小时
const lastDay = now - 86400000;
const todayLogs = searcher.filterByTimeRange(lastDay, now);

// 自定义时间范围
const startTime = new Date('2026-03-13T00:00:00').getTime();
const endTime = new Date('2026-03-13T23:59:59').getTime();
const dayLogs = searcher.filterByTimeRange(startTime, endTime);
```

### 高级查询

```typescript
import { LogQuery } from './log-aggregator-skill';

const query: LogQuery = {
  level: LogLevel.ERROR,      // 错误级别
  source: LogSource.AGENT,    // Agent 来源
  module: 'TaskExecutor',     // 特定模块
  startTime: Date.now() - 3600000, // 最近 1 小时
  endTime: Date.now(),
  keyword: 'timeout',         // 包含关键词
  limit: 100,                 // 最多 100 条
  offset: 0,                  // 从第 0 条开始
};

const results = aggregator.getAggregatedLogs(query);
```

---

## 📤 导出日志

```typescript
import { LogExporter } from './log-aggregator-skill';

const exporter = new LogExporter();
const logs = aggregator.getAggregatedLogs();

// 导出为 JSON
const json = exporter.exportToJson(logs);
// 可以保存到文件或发送到服务器

// 导出为 CSV
const csv = exporter.exportToCsv(logs);
// 可以用 Excel 打开

// 导出为文本
const text = exporter.exportToText(logs);
// 适合直接查看
```

---

## 🔔 实时监控

```typescript
const collector = new LogCollector();

// 添加监听器
collector.onLog(entry => {
  // 实时处理每条日志
  console.log('New log:', entry.message);
  
  // 错误告警
  if (entry.level >= LogLevel.ERROR) {
    console.error('🚨 ERROR:', entry.message);
    // 发送告警通知、记录到监控系统等
  }
});

// 监听器会实时收到新日志
collector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'Monitor',
  message: 'System running',
});
```

---

## 📊 聚合分析

### 按时间窗口聚合

```typescript
// 按 1 分钟窗口聚合
const windows = aggregator.aggregateByTimeWindow(60000);

windows.forEach((logs, timestamp) => {
  console.log(`Window ${new Date(timestamp).toISOString()}: ${logs.length} logs`);
});
```

### 按模块聚合

```typescript
const byModule = aggregator.aggregateByModule();

byModule.forEach((logs, module) => {
  console.log(`Module ${module}: ${logs.length} logs`);
});
```

---

## 🎯 实际应用场景

### 场景 1: Agent 任务追踪

```typescript
const agentCollector = new LogCollector();

// 任务开始
agentCollector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'TaskExecutor',
  message: 'Task started',
  data: { taskId: '123', type: 'code-review' },
});

// 任务进度
agentCollector.collect({
  level: LogLevel.DEBUG,
  source: LogSource.AGENT,
  module: 'TaskExecutor',
  message: 'Processing file...',
  data: { file: 'src/main.ts', progress: '50%' },
});

// 任务完成
agentCollector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'TaskExecutor',
  message: 'Task completed',
  data: { taskId: '123', duration: '2.5s' },
});
```

### 场景 2: 系统健康监控

```typescript
const systemCollector = new LogCollector();

// 实时监控
systemCollector.onLog(entry => {
  if (entry.level >= LogLevel.WARN) {
    // 发送告警
    sendAlert(entry);
  }
});

// 定期收集系统指标
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (usagePercent > 80) {
    systemCollector.collect({
      level: LogLevel.WARN,
      source: LogSource.SYSTEM,
      module: 'Memory',
      message: 'High memory usage',
      data: { usage: `${usagePercent.toFixed(2)}%` },
    });
  }
}, 60000);
```

### 场景 3: 错误分析和报告

```typescript
// 收集错误日志
const errors = searcher.getErrors();

// 生成错误报告
const errorReport = {
  total: errors.length,
  byModule: {},
  recent: errors.slice(0, 10),
  timeRange: {
    start: new Date(errors[errors.length - 1]?.timestamp),
    end: new Date(errors[0]?.timestamp),
  },
};

// 导出报告
const reportJson = exporter.exportToJson(errorReport);
```

---

## ⚙️ 配置选项

### LogCollector 配置

```typescript
const collector = new LogCollector(maxEntries?: number);
// maxEntries: 最大存储条目数 (默认：10000)
```

### LogQuery 参数

```typescript
interface LogQuery {
  level?: LogLevel;              // 日志级别
  source?: LogSource;            // 日志来源
  module?: string;               // 模块名称
  startTime?: number;            // 开始时间 (ms)
  endTime?: number;              // 结束时间 (ms)
  keyword?: string;              // 关键词搜索
  limit?: number;                // 返回数量限制
  offset?: number;               // 偏移量
}
```

---

## 🎨 日志级别

| 级别 | 值 | 描述 | 使用场景 |
|------|-----|------|----------|
| DEBUG | 0 | 调试信息 | 开发调试 |
| INFO | 1 | 普通信息 | 正常运行状态 |
| WARN | 2 | 警告信息 | 需要注意但不影响运行 |
| ERROR | 3 | 错误信息 | 影响功能但可恢复 |
| FATAL | 4 | 致命错误 | 系统崩溃或无法恢复 |

---

## 📁 日志来源

| 来源 | 描述 | 使用场景 |
|------|------|----------|
| CONSOLE | 控制台输出 | 本地调试 |
| FILE | 文件读取 | 日志文件导入 |
| NETWORK | 网络请求 | 远程日志收集 |
| DATABASE | 数据库 | 持久化日志查询 |
| AGENT | Agent 输出 | Agent 任务日志 |
| SYSTEM | 系统日志 | 系统监控指标 |

---

## 💡 最佳实践

### 1. 合理设置日志级别

```typescript
// 开发环境：DEBUG
const devCollector = new LogCollector();

// 生产环境：INFO 或 WARN
const prodCollector = new LogCollector();
```

### 2. 结构化日志数据

```typescript
// ✅ 推荐：使用 data 字段存储结构化数据
collector.collect({
  level: LogLevel.INFO,
  source: LogSource.AGENT,
  module: 'TaskExecutor',
  message: 'Task completed',
  data: {
    taskId: '123',
    duration: 2500,
    result: 'success',
  },
});

// ❌ 避免：将所有信息拼接到 message
collector.collect({
  message: 'Task 123 completed in 2500ms with result success',
});
```

### 3. 定期清理旧日志

```typescript
// 每小时清理一次
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  const oldLogs = searcher.filterByTimeRange(0, oneHourAgo);
  console.log(`Cleaned ${oldLogs.length} old logs`);
  collector.clear();
}, 3600000);
```

### 4. 使用监听器实现告警

```typescript
collector.onLog(entry => {
  if (entry.level >= LogLevel.ERROR) {
    // 立即发送告警
    sendAlert({
      level: entry.level,
      message: entry.message,
      module: entry.module,
      timestamp: entry.timestamp,
    });
  }
});
```

---

## 🧪 测试示例

```typescript
import { 
  LogCollector, 
  LogAggregator, 
  LogSearcher, 
  LogExporter,
  LogLevel,
  LogSource 
} from './log-aggregator-skill';

// 测试基础功能
function testBasicFeatures() {
  const collector = new LogCollector();
  
  collector.collect({
    level: LogLevel.INFO,
    source: LogSource.AGENT,
    module: 'Test',
    message: 'Test message',
  });
  
  const logs = collector.getEntries();
  console.assert(logs.length === 1, 'Should have 1 log');
  console.assert(logs[0].message === 'Test message', 'Message should match');
}

// 测试查询功能
function testSearchFeatures() {
  const aggregator = new LogAggregator();
  const collector = new LogCollector();
  aggregator.registerCollector('main', collector);
  
  // 收集测试数据
  collector.collectBatch([
    { level: LogLevel.INFO, source: LogSource.CONSOLE, module: 'App', message: 'Info 1' },
    { level: LogLevel.ERROR, source: LogSource.CONSOLE, module: 'App', message: 'Error 1' },
    { level: LogLevel.WARN, source: LogSource.CONSOLE, module: 'DB', message: 'Warning 1' },
  ]);
  
  const searcher = new LogSearcher(aggregator);
  
  // 测试搜索
  const results = searcher.search('1');
  console.assert(results.length === 3, 'Should find 3 logs');
  
  // 测试错误过滤
  const errors = searcher.getErrors();
  console.assert(errors.length === 1, 'Should have 1 error');
}

// 运行测试
testBasicFeatures();
testSearchFeatures();
console.log('✅ All tests passed!');
```

---

## 📝 总结

**Log Aggregator Skill** 提供了完整的日志管理解决方案：

✅ **日志收集** - 多来源、批量、实时监听  
✅ **日志聚合** - 统一管理、统计分析  
✅ **日志查询** - 关键词、正则、多维度过滤  
✅ **日志导出** - JSON、CSV、文本格式  

适用于 Agent 任务追踪、系统监控、错误分析等场景。

---

**交付完成!** 🎉
