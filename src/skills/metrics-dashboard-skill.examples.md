# 📊 Metrics Dashboard Skill - 使用示例

**指标仪表板工具** - 用于实时指标展示、图表生成和告警规则管理

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { createDashboard, MetricsDashboard } from './skills/metrics-dashboard-skill';

// 创建仪表板
const dashboard = createDashboard({
  name: 'My Application Dashboard',
  refreshInterval: 5000,
  metrics: ['cpu_usage', 'memory_usage', 'request_count', 'response_time']
});

// 记录指标值
dashboard.record('cpu_usage', 75.5);
dashboard.record('memory_usage', 60.2);
dashboard.record('request_count', 1250);
dashboard.record('response_time', 234);

// 查看指标摘要
console.log(dashboard.getMetricsSummary());
```

---

### 2. 系统监控 (自动采集)

```typescript
import { quickMonitor } from './skills/metrics-dashboard-skill';

// 启动自动系统监控 (每 5 秒采集一次)
const monitor = quickMonitor(5000);

// 10 秒后查看仪表板
setTimeout(() => {
  console.log(monitor.renderDashboard());
}, 10000);

// 手动采集
monitor.collectCpuMetrics();
monitor.collectMemoryMetrics();

// 停止采集
monitor.stopAutoCollection();
```

---

### 3. 告警规则配置

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard({
  name: 'Production Monitor',
  metrics: ['cpu_usage', 'memory_usage', 'error_rate', 'latency_p99']
});

// 添加 CPU 告警规则
dashboard.addAlertRule({
  id: 'high-cpu',
  name: 'CPU 使用率过高',
  metricName: 'cpu_usage',
  operator: '>',
  threshold: 80,
  severity: 'warning',
  duration: 60, // 持续 60 秒才触发
  message: '⚠️ CPU 使用率超过 80%！',
  enabled: true
});

// 添加内存紧急告警
dashboard.addAlertRule({
  id: 'critical-memory',
  name: '内存使用率紧急',
  metricName: 'memory_usage',
  operator: '>=',
  threshold: 95,
  severity: 'emergency',
  duration: 30,
  message: '🆘 内存使用率超过 95%，立即处理！',
  enabled: true
});

// 添加错误率告警 (带标签过滤)
dashboard.addAlertRule({
  id: 'high-error-rate',
  name: 'API 错误率过高',
  metricName: 'error_rate',
  operator: '>',
  threshold: 0.05, // 5%
  severity: 'critical',
  labels: { service: 'api-gateway' },
  enabled: true
});

// 查看活动告警
const activeAlerts = dashboard.getActiveAlerts();
activeAlerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`);
});
```

---

### 4. 图表生成

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard({
  name: 'Charts Demo',
  metrics: ['cpu_usage', 'memory_usage', 'disk_io', 'network_in', 'network_out']
});

// 模拟数据
for (let i = 0; i < 100; i++) {
  dashboard.record('cpu_usage', 50 + Math.random() * 30);
  dashboard.record('memory_usage', 60 + Math.random() * 20);
  dashboard.record('disk_io', Math.random() * 1000);
}

// 生成仪表盘 (Gauge)
console.log(dashboard.generateGauge('cpu_usage', 0, 100, 25));
// 输出:
// ╭─────────────────────────────╮
// │ [████████████░░░░░░░░░░░░░] 65.5% │
// │ cpu_usage                   │
// │ Value: 65.50                │
// ╰─────────────────────────────╯

// 生成折线图 (ASCII)
console.log(dashboard.generateLineChart('cpu_usage', 60000, 60, 15));
// 输出 ASCII 折线图

// 生成条形图
console.log(dashboard.generateBarChart(
  ['cpu_usage', 'memory_usage', 'disk_io'],
  40
));
// 输出:
// ┌──────────────────────────────────────────┐
// │ cpu_usage       │████████████ 75.50      │
// │ memory_usage    │███████████ 60.20       │
// │ disk_io         │████████ 45.30          │
// └──────────────────────────────────────────┘

// 生成 Markdown 表格
console.log(dashboard.generateMarkdownTable());
// 输出:
// | Metric | Current Value | Unit | Change |
// |--------|---------------|------|--------|
// | cpu_usage | 75.50 | value | 📈 +5.2% |
// | memory_usage | 60.20 | value | 📉 -2.1% |
```

---

### 5. 完整仪表板渲染

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard({
  name: 'Production System Dashboard',
  refreshInterval: 5000,
  metrics: ['cpu_usage', 'memory_usage', 'disk_usage', 'request_rate', 'error_rate'],
  alertRules: [
    {
      id: 'high-cpu',
      name: 'CPU 过高',
      metricName: 'cpu_usage',
      operator: '>',
      threshold: 80,
      severity: 'warning',
      enabled: true
    }
  ]
});

// 启动自动采集
dashboard.startAutoCollection(5000);

// 模拟一些数据
dashboard.record('cpu_usage', 85.5);
dashboard.record('memory_usage', 72.3);
dashboard.record('disk_usage', 45.0);
dashboard.record('request_rate', 1250);
dashboard.record('error_rate', 0.02);

// 渲染完整仪表板
console.log(dashboard.renderDashboard());
```

**输出示例:**

```
╔════════════════════════════════════════════════════════╗
║  Production System Dashboard                           ║
╚════════════════════════════════════════════════════════╝

📊 指标摘要:
| Metric | Current Value | Unit | Change |
|--------|---------------|------|--------|
| cpu_usage | 85.50 | value | 📈 +12.5% |
| memory_usage | 72.30 | value | 📈 +3.2% |
| disk_usage | 45.00 | value | 📉 -0.5% |
| request_rate | 1250.00 | value | 📈 +8.7% |
| error_rate | 0.02 | value | 📉 -0.01% |

🚨 活动告警:
  ⚠️ [WARNING] 告警：CPU 过高 - 指标 cpu_usage > 80 (当前值：85.5)

📈 关键指标:
╭─────────────────────────────╮
│ [████████████████░░░░░░░░░] 85.5% │
│ cpu_usage                   │
│ Value: 85.50                │
╰─────────────────────────────╯

╭─────────────────────────────╮
│ [██████████████░░░░░░░░░░░] 72.3% │
│ memory_usage                │
│ Value: 72.30                │
╰─────────────────────────────╯
```

---

### 6. 高级用法 - 自定义指标类型

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard();

// 注册 Counter 类型指标 (累计值)
dashboard.registerMetric('total_requests', {
  name: 'total_requests',
  type: 'counter',
  unit: 'requests',
  description: '总请求数',
  maxPoints: 10000
});

// 注册 Histogram 类型指标 (分布值)
dashboard.registerMetric('response_time', {
  name: 'response_time',
  type: 'histogram',
  unit: 'ms',
  description: '响应时间分布'
});

// 记录带标签的指标
dashboard.record('total_requests', 1, { 
  method: 'GET', 
  endpoint: '/api/users' 
});

dashboard.record('response_time', 234, {
  method: 'POST',
  endpoint: '/api/orders',
  status: '200'
});

// 按标签查询
const currentValue = dashboard.getCurrentValue('response_time', {
  method: 'POST',
  endpoint: '/api/orders'
});
```

---

### 7. 数据导出

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard({
  metrics: ['cpu_usage', 'memory_usage']
});

// 模拟数据
for (let i = 0; i < 100; i++) {
  dashboard.record('cpu_usage', 50 + Math.random() * 30);
  dashboard.record('memory_usage', 60 + Math.random() * 20);
}

// 导出为 JSON
const jsonData = dashboard.exportMetrics('json');
console.log(jsonData);
// 输出:
// [
//   {
//     "name": "cpu_usage",
//     "type": "gauge",
//     "unit": "value",
//     "points": [...]
//   },
//   ...
// ]

// 导出为 CSV
const csvData = dashboard.exportMetrics('csv');
console.log(csvData);
// 输出:
// timestamp,metric,value
// 1710334567890,cpu_usage,65.5
// 1710334567890,memory_usage,72.3
// ...
```

---

### 8. 告警管理

```typescript
import { createDashboard } from './skills/metrics-dashboard-skill';

const dashboard = createDashboard();

// 添加告警规则
dashboard.addAlertRule({
  id: 'rule-1',
  name: 'High CPU',
  metricName: 'cpu_usage',
  operator: '>',
  threshold: 80,
  severity: 'warning',
  enabled: true
});

// 查看所有告警
const allAlerts = dashboard.getAllAlerts();

// 查看活动告警
const activeAlerts = dashboard.getActiveAlerts();

// 移除告警规则
dashboard.removeAlertRule('rule-1');

// 告警级别说明:
// - info: 信息提示
// - warning: 警告 (需要注意)
// - critical: 严重 (需要立即处理)
// - emergency: 紧急 (系统可能崩溃)
```

---

## 📋 API 参考

### MetricsDashboard 类

#### 核心方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `registerMetric` | 注册指标 | name, definition | MetricDefinition |
| `record` | 记录指标值 | name, value, labels? | void |
| `getCurrentValue` | 获取当前值 | name, labels? | number \\| null |
| `getHistory` | 获取历史数据 | name, timeRangeMs? | MetricPoint[] |
| `getMetricsSummary` | 获取指标摘要 | - | Array |

#### 告警方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `addAlertRule` | 添加告警规则 | rule: AlertRule | void |
| `removeAlertRule` | 移除告警规则 | ruleId: string | void |
| `getActiveAlerts` | 获取活动告警 | - | AlertInstance[] |
| `getAllAlerts` | 获取所有告警 | - | AlertInstance[] |

#### 图表方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `generateLineChart` | 生成折线图 | metricName, timeRangeMs, width, height | string |
| `generateBarChart` | 生成条形图 | metrics, width | string |
| `generateGauge` | 生成仪表盘 | metricName, min, max, size | string |
| `generateMarkdownTable` | 生成 Markdown 表格 | - | string |

#### 系统采集方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `collectCpuMetrics` | 采集 CPU 指标 | - | void |
| `collectMemoryMetrics` | 采集内存指标 | - | void |
| `collectSystemMetrics` | 采集所有系统指标 | - | void |
| `startAutoCollection` | 启动自动采集 | intervalMs | void |
| `stopAutoCollection` | 停止自动采集 | - | void |

#### 其他方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `renderDashboard` | 渲染完整仪表板 | - | string |
| `exportMetrics` | 导出数据 | format: 'json' \\| 'csv' | string |
| `clearMetrics` | 清空指标 | name? | void |
| `destroy` | 销毁仪表板 | - | void |

---

## 🔧 配置选项

### DashboardConfig

```typescript
interface DashboardConfig {
  name: string;              // 仪表板名称
  refreshInterval?: number;  // 刷新间隔 (毫秒)
  metrics: string[];         // 指标名称列表
  charts?: ChartConfig[];    // 图表配置
  alertRules?: AlertRule[];  // 告警规则
}
```

### AlertRule

```typescript
interface AlertRule {
  id: string;                // 规则 ID (唯一)
  name: string;              // 规则名称
  metricName: string;        // 监控的指标
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;         // 阈值
  duration?: number;         // 持续时间 (秒)
  severity: AlertSeverity;   // 严重级别
  message?: string;          // 告警消息模板
  labels?: Record<string, string>; // 标签过滤
  enabled: boolean;          // 是否启用
}
```

### AlertSeverity

```typescript
type AlertSeverity = 
  | 'info'       // ℹ️ 信息
  | 'warning'    // ⚠️ 警告
  | 'critical'   // 🔴 严重
  | 'emergency'; // 🆘 紧急
```

---

## 💡 最佳实践

### 1. 合理设置告警持续时间

```typescript
// ❌ 不好 - 瞬时波动也会触发
dashboard.addAlertRule({
  id: 'cpu-spike',
  metricName: 'cpu_usage',
  threshold: 90,
  duration: 0 // 立即触发
});

// ✅ 好 - 持续高负载才触发
dashboard.addAlertRule({
  id: 'cpu-sustained',
  metricName: 'cpu_usage',
  threshold: 90,
  duration: 120 // 持续 2 分钟
});
```

### 2. 使用标签进行细粒度监控

```typescript
// 按服务监控
dashboard.record('error_rate', 0.05, { service: 'api-gateway' });
dashboard.record('error_rate', 0.02, { service: 'user-service' });

// 针对特定服务设置告警
dashboard.addAlertRule({
  id: 'api-errors',
  metricName: 'error_rate',
  threshold: 0.03,
  labels: { service: 'api-gateway' }
});
```

### 3. 限制历史数据长度

```typescript
// 高频指标 - 保留较短历史
dashboard.registerMetric('cpu_usage', {
  maxPoints: 1000 // ~83 分钟 (每 5 秒一次)
});

// 低频指标 - 保留较长历史
dashboard.registerMetric('daily_requests', {
  maxPoints: 10000 // ~27 小时 (每分钟一次)
});
```

### 4. 定期清理数据

```typescript
// 每天清空一次历史数据
setInterval(() => {
  dashboard.clearMetrics();
}, 24 * 60 * 60 * 1000);
```

---

## 🎯 实际应用场景

### 场景 1: Web 服务监控

```typescript
const apiMonitor = createDashboard({
  name: 'API Service Monitor',
  metrics: [
    'request_rate',
    'response_time_p50',
    'response_time_p99',
    'error_rate',
    'active_connections'
  ]
});

// 在请求处理中记录
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    apiMonitor.record('response_time_p50', duration);
    apiMonitor.record('request_rate', 1);
    
    if (res.statusCode >= 400) {
      apiMonitor.record('error_rate', 1);
    }
  });
  
  next();
});

// 设置告警
apiMonitor.addAlertRule({
  id: 'slow-response',
  name: '响应时间过长',
  metricName: 'response_time_p99',
  operator: '>',
  threshold: 1000, // 1 秒
  severity: 'warning',
  duration: 60
});
```

### 场景 2: 数据库监控

```typescript
const dbMonitor = createDashboard({
  name: 'Database Monitor',
  metrics: [
    'connections_active',
    'connections_idle',
    'query_duration',
    'slow_queries',
    'deadlocks'
  ]
});

// 定期采集数据库指标
setInterval(() => {
  const stats = await db.query('SELECT * FROM pg_stat_database');
  dbMonitor.record('connections_active', stats.activeConnections);
  dbMonitor.record('query_duration', stats.avgQueryTime);
}, 5000);
```

### 场景 3: 业务指标监控

```typescript
const businessMonitor = createDashboard({
  name: 'Business Metrics',
  metrics: [
    'orders_per_minute',
    'revenue_per_hour',
    'active_users',
    'conversion_rate'
  ]
});

// 在业务事件中记录
orderService.on('order_created', (order) => {
  businessMonitor.record('orders_per_minute', 1);
  businessMonitor.record('revenue_per_hour', order.amount);
});

// 设置业务告警
businessMonitor.addAlertRule({
  id: 'low-conversion',
  name: '转化率过低',
  metricName: 'conversion_rate',
  operator: '<',
  threshold: 0.02, // 2%
  severity: 'critical',
  duration: 300 // 5 分钟
});
```

---

## 📝 注意事项

1. **性能考虑**: 高频采集会占用内存，合理设置 `maxPoints`
2. **告警风暴**: 使用 `duration` 避免瞬时波动触发告警
3. **标签基数**: 避免使用高基数字段作为标签 (如 user_id)
4. **时间同步**: 确保分布式系统的时间同步
5. **数据导出**: 定期导出历史数据到外部存储

---

## 🛠️ 故障排查

### 问题 1: 告警不触发

```typescript
// 检查规则是否启用
const rule = dashboard.getAlertRule('rule-id');
console.log(rule?.enabled); // 应为 true

// 检查标签匹配
dashboard.record('cpu_usage', 90, { service: 'api' });
// 规则标签也必须是 { service: 'api' }
```

### 问题 2: 内存占用过高

```typescript
// 减少历史数据长度
dashboard.registerMetric('high_freq_metric', {
  maxPoints: 100 // 而不是默认的 1000
});

// 定期清理
setInterval(() => dashboard.clearMetrics(), 60000);
```

### 问题 3: 图表显示异常

```typescript
// 确保有足够的数据点
const history = dashboard.getHistory('cpu_usage', 60000);
console.log(history.length); // 应 > 0

// 检查数据范围
const gauge = dashboard.generateGauge('cpu_usage', 0, 100);
// min/max 应该覆盖实际数据范围
```

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)
