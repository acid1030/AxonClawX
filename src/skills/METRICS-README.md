# Metrics Utils Skill - 性能指标监控工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**依赖:** 无 (纯 Node.js 原生模块)

---

## 📋 功能概述

### 1. 指标收集
- ✅ CPU 使用率、负载 (1/5/15 分钟)
- ✅ 内存使用率、可用内存
- ✅ 磁盘使用率、剩余空间
- ✅ 网络流量 (接收/发送)
- ✅ 自定义指标

### 2. 指标聚合
- ✅ 基础统计 (平均值、最大值、最小值、总和)
- ✅ 标准差计算
- ✅ 百分位数 (P50/P90/P95/P99)
- ✅ 时间窗口聚合

### 3. 告警触发
- ✅ 多级告警 (info/warning/critical)
- ✅ 灵活的条件配置 (>/</>=/<=/==/!=)
- ✅ 聚合函数支持 (avg/max/min)
- ✅ 时间窗口配置
- ✅ 告警冷却机制
- ✅ 告警历史追踪

---

## 🚀 快速开始

### 基础使用

```typescript
import { MetricsCollector } from './src/skills/metrics-utils-skill';

// 创建收集器
const collector = new MetricsCollector({
  collectionInterval: 5000,    // 5 秒收集一次
  retentionPeriod: 3600,       // 保留 1 小时数据
  maxDataPoints: 10000,        // 最多 10000 个数据点
});

// 启动自动收集
collector.startAutoCollection();

// 查询指标
const cpuMetrics = collector.queryMetrics({ name: 'cpu_usage' });
const latestCpu = collector.getLatestMetric('cpu_usage');

console.log(`CPU 使用率：${latestCpu?.value.toFixed(2)}%`);

// 停止收集
collector.stopAutoCollection();
```

---

## 📊 指标类型

### 系统指标

| 类型 | 名称 | 单位 | 描述 |
|------|------|------|------|
| **CPU** | `cpu_usage` | percent | CPU 使用率 (0-100) |
| | `cpu_load1` | load | 1 分钟负载 |
| | `cpu_load5` | load | 5 分钟负载 |
| | `cpu_load15` | load | 15 分钟负载 |
| **Memory** | `memory_usage` | percent | 内存使用率 |
| | `memory_free` | bytes | 空闲内存 |
| | `memory_available` | bytes | 可用内存 |
| **Disk** | `disk_usage` | percent | 磁盘使用率 |
| | `disk_free` | bytes | 剩余空间 |
| | `disk_total` | bytes | 总容量 |
| **Network** | `network_rx_bytes` | bytes | 接收字节数 |
| | `network_tx_bytes` | bytes | 发送字节数 |

### 自定义指标

```typescript
// 添加自定义指标
collector.addCustomMetric('api_response_time', 125.5, 'ms', {
  endpoint: '/api/users',
  method: 'GET',
});

collector.addCustomMetric('db_connections', 45, 'count', {
  database: 'postgres',
  pool: 'main',
});
```

---

## 📈 指标聚合

### 基础聚合

```typescript
const aggregated = collector.aggregateMetrics('cpu_usage', {
  calculatePercentiles: true,
  calculateStdDev: true,
});

console.log(`平均值：${aggregated.avg.toFixed(2)}%`);
console.log(`最大值：${aggregated.max.toFixed(2)}%`);
console.log(`最小值：${aggregated.min.toFixed(2)}%`);
console.log(`P95: ${aggregated.percentiles?.p95.toFixed(2)}%`);
console.log(`标准差：${aggregated.stddev?.toFixed(2)}`);
```

### 时间窗口聚合

```typescript
// 按 1 分钟窗口聚合
const windows = collector.aggregateByWindow('cpu_usage', 60);

windows.forEach(window => {
  console.log(`时间：${new Date(window.timeRange.start).toLocaleTimeString()}`);
  console.log(`平均值：${window.avg.toFixed(2)}%`);
  console.log(`数据点：${window.count}\n`);
});
```

---

## 🚨 告警管理

### 添加告警规则

```typescript
// CPU 使用率告警
collector.addAlertRule({
  name: 'CPU 使用率过高',
  level: 'warning',
  condition: {
    metricName: 'cpu_usage',
    operator: '>',
    threshold: 80,           // 超过 80%
    aggregator: 'avg',       // 使用平均值
    window: 60,              // 1 分钟窗口
  },
  message: '⚠️ CPU 使用率持续过高，请检查系统负载',
  cooldown: 300,             // 5 分钟冷却时间
  enabled: true,
});

// 内存使用率严重告警
collector.addAlertRule({
  name: '内存使用率严重',
  level: 'critical',
  condition: {
    metricName: 'memory_usage',
    operator: '>',
    threshold: 90,
    aggregator: 'max',
    window: 30,
  },
  message: '🚨 内存使用率超过 90%，系统可能崩溃',
  cooldown: 60,
  enabled: true,
});
```

### 告警级别

| 级别 | 描述 | 使用场景 |
|------|------|----------|
| `info` | 信息 | 一般通知 |
| `warning` | 警告 | 需要关注 |
| `critical` | 严重 | 立即处理 |

### 检查告警

```typescript
// 检查并触发告警
const triggeredAlerts = collector.checkAlertRules();

triggeredAlerts.forEach(alert => {
  console.log(`[${alert.level.toUpperCase()}] ${alert.ruleName}`);
  console.log(`当前值：${alert.currentValue}`);
  console.log(`阈值：${alert.threshold}`);
  console.log(`消息：${alert.message}\n`);
});

// 获取活跃告警
const activeAlerts = collector.getActiveAlerts();

// 解决告警
if (activeAlerts.length > 0) {
  collector.resolveAlert(activeAlerts[0].id);
}
```

### 查询告警历史

```typescript
// 查询所有告警
const allAlerts = collector.getAlertHistory();

// 按级别查询
const criticalAlerts = collector.getAlertHistory({ level: 'critical' });

// 查询未解决告警
const unresolvedAlerts = collector.getAlertHistory({ resolved: false });

// 按时间范围查询
const recentAlerts = collector.getAlertHistory({
  startTime: Date.now() - 3600000, // 1 小时内
  limit: 10,
});
```

---

## 🔧 配置选项

### MetricsCollectorConfig

```typescript
interface MetricsCollectorConfig {
  /** 收集间隔 (毫秒，默认：5000) */
  collectionInterval?: number;
  
  /** 数据保留时间 (秒，默认：3600) */
  retentionPeriod?: number;
  
  /** 最大数据点数 (默认：10000) */
  maxDataPoints?: number;
  
  /** 存储目录 (可选) */
  storageDir?: string;
  
  /** 是否持久化到磁盘 (默认：false) */
  persistToDisk?: boolean;
}
```

### 使用示例

```typescript
const collector = new MetricsCollector({
  collectionInterval: 10000,    // 10 秒收集一次
  retentionPeriod: 7200,        // 保留 2 小时
  maxDataPoints: 5000,          // 最多 5000 个数据点
  persistToDisk: true,          // 启用持久化
  storageDir: './metrics-data', // 存储目录
});
```

---

## 💾 数据导出

### 导出为 JSON

```typescript
const json = collector.exportToJson({
  startTime: Date.now() - 3600000, // 1 小时内
  name: 'cpu_usage',
});

fs.writeFileSync('metrics.json', json);
```

### 导出为 CSV

```typescript
const csv = collector.exportToCsv({
  startTime: Date.now() - 3600000,
  name: 'cpu_usage',
});

fs.writeFileSync('metrics.csv', csv);
```

---

## 📝 完整示例

### 系统健康监控

```typescript
import { MetricsCollector } from './src/skills/metrics-utils-skill';
import * as os from 'os';

const collector = new MetricsCollector({
  collectionInterval: 10000,
  retentionPeriod: 7200,
});

// 配置告警规则
collector.addAlertRule({
  name: '系统负载过高',
  level: 'warning',
  condition: {
    metricName: 'cpu_load1',
    operator: '>',
    threshold: os.cpus().length * 0.8,
    aggregator: 'avg',
    window: 60,
  },
  cooldown: 300,
  enabled: true,
});

collector.addAlertRule({
  name: '内存不足',
  level: 'critical',
  condition: {
    metricName: 'memory_usage',
    operator: '>',
    threshold: 85,
    aggregator: 'avg',
    window: 60,
  },
  cooldown: 120,
  enabled: true,
});

// 启动监控
collector.startAutoCollection();

console.log('✅ 系统监控已启动');

// 定期检查告警
setInterval(() => {
  const alerts = collector.checkAlertRules();
  
  if (alerts.length > 0) {
    alerts.forEach(alert => {
      console.log(`🚨 [${alert.level.toUpperCase()}] ${alert.message}`);
    });
  }
}, 10000);
```

### API 性能监控

```typescript
import { MetricsCollector } from './src/skills/metrics-utils-skill';

const collector = new MetricsCollector();

// 在 API 中间件中使用
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    collector.addCustomMetric('api_response_time', duration, 'ms', {
      endpoint: req.path,
      method: req.method,
      status: res.statusCode.toString(),
    });
  });
  
  next();
});

// 添加性能告警
collector.addAlertRule({
  name: 'API 响应时间过长',
  level: 'warning',
  condition: {
    metricName: 'api_response_time',
    operator: '>',
    threshold: 500,
    aggregator: 'avg',
    window: 60,
  },
  cooldown: 120,
  enabled: true,
});

// 定期生成性能报告
setInterval(() => {
  const aggregated = collector.aggregateMetrics('api_response_time', {
    calculatePercentiles: true,
    calculateStdDev: true,
  });
  
  console.log('📊 API 性能报告:');
  console.log(`   平均响应时间：${aggregated.avg.toFixed(2)} ms`);
  console.log(`   P95: ${aggregated.percentiles?.p95.toFixed(2)} ms`);
  console.log(`   P99: ${aggregated.percentiles?.p99.toFixed(2)} ms`);
}, 60000);
```

---

## 🎯 最佳实践

### 1. 合理设置收集间隔
- 开发环境：10-30 秒
- 生产环境：5-10 秒
- 高性能场景：1-5 秒

### 2. 配置告警冷却时间
- Warning 级别：5-10 分钟
- Critical 级别：1-5 分钟
- 避免告警风暴

### 3. 数据保留策略
- 短期分析：1-2 小时
- 日常监控：24 小时
- 趋势分析：7-30 天 (需要外部存储)

### 4. 告警规则设计
- 使用聚合函数 (avg/max) 而非单点值
- 配置合理的时间窗口
- 分级告警 (warning/critical)

---

## 📚 API 参考

### MetricsCollector 类

#### 构造函数
```typescript
new MetricsCollector(config?: MetricsCollectorConfig)
```

#### 指标收集方法
- `startAutoCollection()` - 启动自动收集
- `stopAutoCollection()` - 停止自动收集
- `collectAllMetrics()` - 手动收集所有指标
- `addCustomMetric(name, value, unit, tags)` - 添加自定义指标

#### 指标查询方法
- `queryMetrics(options)` - 查询指标数据
- `getLatestMetric(name, type)` - 获取最新指标值

#### 指标聚合方法
- `aggregateMetrics(name, options)` - 聚合指标
- `aggregateByWindow(name, windowSeconds)` - 按时间窗口聚合

#### 告警管理方法
- `addAlertRule(rule)` - 添加告警规则
- `removeAlertRule(ruleId)` - 移除告警规则
- `toggleAlertRule(ruleId, enabled)` - 启用/禁用规则
- `checkAlertRules()` - 检查并触发告警
- `getAlertHistory(options)` - 查询告警历史
- `resolveAlert(alertId)` - 解决告警
- `getActiveAlerts()` - 获取活跃告警

#### 数据导出方法
- `exportToJson(options)` - 导出为 JSON
- `exportToCsv(options)` - 导出为 CSV

---

## 🔍 故障排查

### 问题：指标数据为空
**解决:** 确保已调用 `collectAllMetrics()` 或 `startAutoCollection()`

### 问题：告警未触发
**解决:** 
1. 检查规则是否启用 (`enabled: true`)
2. 检查冷却时间是否已过
3. 确认指标名称匹配
4. 验证阈值设置

### 问题：内存占用过高
**解决:**
1. 减少 `maxDataPoints` 配置
2. 缩短 `retentionPeriod`
3. 增加 `collectionInterval`

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**维护者:** Axon (KAEL Engineering)
