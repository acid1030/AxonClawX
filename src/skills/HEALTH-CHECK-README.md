# Health Check Pattern Skill - ACE 健康监控工具

**版本:** 1.0.0  
**作者:** Axon  
**位置:** `src/skills/health-check-pattern-skill.ts`

---

## 🎯 功能概览

| 功能类别 | 方法数 | 描述 |
|---------|--------|------|
| **健康检查定义** | 5+ | 注册/注销自定义检查 |
| **检查执行** | 10+ | 内置检查 + 自定义命令 |
| **状态报告** | 3+ | 生成报告 + 获取结果 |
| **系统指标** | 1 | 获取完整系统指标 |

---

## 🚀 快速开始

### 导入

```typescript
// 类式 API
import { HealthChecker } from './health-check-pattern-skill';

// 函数式 API
import { 
  runHealthCheck, 
  getSystemMetrics, 
  checkCPU, 
  checkMemory,
  registerCheck 
} from './health-check-pattern-skill';
```

### 基础使用

```typescript
// 执行所有健康检查
const report = await runHealthCheck();
console.log('整体状态:', report.overall);
console.log('检查数量:', report.summary.total);
console.log('健康:', report.summary.healthy);
console.log('警告:', report.summary.warning);
console.log('严重:', report.summary.critical);

// 输出:
// 整体状态: healthy
// 检查数量: 5
// 健康: 5
// 警告: 0
// 严重: 0
```

### 获取系统指标

```typescript
const metrics = await getSystemMetrics();
console.log('CPU 使用率:', metrics.cpu.usage.toFixed(1) + '%');
console.log('内存使用率:', metrics.memory.usagePercent.toFixed(1) + '%');
console.log('磁盘使用率:', metrics.disk.usagePercent.toFixed(1) + '%');
console.log('运行时间:', metrics.uptime / 3600 + '小时');
console.log('平台:', metrics.platform);
console.log('架构:', metrics.arch);
console.log('Node 版本:', metrics.nodeVersion);
```

### 快速单项检查

```typescript
// CPU 检查
const cpuResult = await checkCPU();
console.log(cpuResult.status, cpuResult.message);

// 内存检查
const memResult = await checkMemory();
console.log(memResult.status, memResult.message);

// 磁盘检查
const diskResult = await checkDisk();
console.log(diskResult.status, diskResult.message);

// 运行时间检查
const uptimeResult = await checkUptime();
console.log(uptimeResult.status, uptimeResult.message);

// 负载检查
const loadResult = await checkLoad();
console.log(loadResult.status, loadResult.message);
```

---

## 📚 API 参考

### 类式 API

#### HealthChecker 类

```typescript
class HealthChecker {
  // 注册健康检查
  register(config: HealthCheckConfig): void
  
  // 注销健康检查
  unregister(name: string): void
  
  // 执行单个检查
  executeCheck(config: HealthCheckConfig): Promise<HealthCheckResult>
  
  // 执行所有检查
  executeAll(): Promise<HealthReport>
  
  // 获取系统指标
  getSystemMetrics(): Promise<SystemMetrics>
  
  // 获取检查结果
  getResults(): Map<string, HealthCheckResult>
}
```

### 函数式 API

| 函数 | 返回 | 描述 |
|------|------|------|
| `registerCheck(config)` | void | 注册检查 |
| `unregisterCheck(name)` | void | 注销检查 |
| `runHealthCheck()` | Promise<HealthReport> | 执行所有检查 |
| `getSystemMetrics()` | Promise<SystemMetrics> | 获取系统指标 |
| `getCheckResults()` | Map<string, HealthCheckResult> | 获取结果 |
| `checkCPU()` | Promise<HealthCheckResult> | CPU 检查 |
| `checkMemory()` | Promise<HealthCheckResult> | 内存检查 |
| `checkDisk()` | Promise<HealthCheckResult> | 磁盘检查 |
| `checkUptime()` | Promise<HealthCheckResult> | 运行时间检查 |
| `checkLoad()` | Promise<HealthCheckResult> | 负载检查 |
| `checkCommand(name, cmd, threshold, critical)` | Promise<HealthCheckResult> | 自定义命令检查 |

### 类型定义

```typescript
type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  value?: number | string;
  threshold?: number | string;
  timestamp: number;
  duration?: number;
}

interface HealthReport {
  overall: HealthStatus;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
  timestamp: number;
  duration: number;
}

interface HealthCheckConfig {
  name: string;
  command?: string;
  threshold?: number;
  criticalThreshold?: number;
  timeout?: number;
  enabled?: boolean;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  uptime: number;
  loadAvg: number[];
  platform: string;
  arch: string;
  nodeVersion: string;
}
```

---

## 💡 实际应用场景

### 1. 自定义命令检查

```typescript
// 检查 Redis 连接
registerCheck({
  name: 'redis',
  command: 'redis-cli ping',
  timeout: 3000
});

// 检查数据库连接
registerCheck({
  name: 'database',
  command: 'psql -h localhost -U user -d mydb -c "SELECT 1"',
  timeout: 5000
});

// 检查磁盘空间 (自定义阈值)
registerCheck({
  name: 'disk-custom',
  command: 'df -h / | tail -1 | awk \'{print $5}\' | tr -d "%"',
  threshold: 70,        // 70% 警告
  criticalThreshold: 90 // 90% 严重
});

// 执行所有检查 (包括自定义)
const report = await runHealthCheck();
```

### 2. 定期健康监控

```typescript
import { runHealthCheck } from './health-check-pattern-skill';

// 每 5 分钟检查一次
setInterval(async () => {
  const report = await runHealthCheck();
  
  if (report.overall === 'critical') {
    console.error('🚨 CRITICAL:', report.summary.critical, 'checks failed');
    // 发送告警通知
    // await sendAlert(report);
  } else if (report.overall === 'warning') {
    console.warn('⚠️  WARNING:', report.summary.warning, 'checks warning');
  } else {
    console.log('✅ All checks passed');
  }
}, 5 * 60 * 1000); // 5 minutes
```

### 3. API 健康端点

```typescript
// Express.js 示例
import express from 'express';
import { runHealthCheck, getSystemMetrics } from './health-check-pattern-skill';

const app = express();

// 健康检查端点
app.get('/health', async (req, res) => {
  const report = await runHealthCheck();
  
  const statusCode = {
    healthy: 200,
    warning: 200,
    critical: 503,
    unknown: 500
  }[report.overall];
  
  res.status(statusCode).json(report);
});

// 详细指标端点
app.get('/health/metrics', async (req, res) => {
  const metrics = await getSystemMetrics();
  res.json(metrics);
});

// 单项检查端点
app.get('/health/:check', async (req, res) => {
  const checkers = {
    cpu: checkCPU,
    memory: checkMemory,
    disk: checkDisk,
    uptime: checkUptime,
    load: checkLoad
  };
  
  const checker = checkers[req.params.check as keyof typeof checkers];
  if (!checker) {
    return res.status(404).json({ error: 'Check not found' });
  }
  
  const result = await checker();
  res.json(result);
});
```

### 4. 启动前检查

```typescript
import { HealthChecker } from './health-check-pattern-skill';

async function preflightChecks(): Promise<boolean> {
  const checker = new HealthChecker();
  
  // 注册启动前必须通过的检查
  checker.register({
    name: 'disk-space',
    command: 'df -h / | tail -1 | awk \'{print $5}\' | tr -d "%"',
    criticalThreshold: 95
  });
  
  checker.register({
    name: 'memory-available',
    command: 'node -e "console.log(os.freemem() / 1024 / 1024)"',
    threshold: 512 // 512MB 警告
  });
  
  const report = await checker.executeAll();
  
  if (report.overall === 'critical') {
    console.error('❌ Preflight checks failed:');
    report.checks
      .filter(c => c.status === 'critical')
      .forEach(c => console.error(`  - ${c.name}: ${c.message}`));
    return false;
  }
  
  console.log('✅ Preflight checks passed');
  return true;
}

// 在应用启动时使用
(async () => {
  const ready = await preflightChecks();
  if (!ready) {
    process.exit(1);
  }
  
  // 启动应用
  // app.listen(3000);
})();
```

### 5. 告警系统集成

```typescript
import { runHealthCheck } from './health-check-pattern-skill';

interface AlertConfig {
  channel: string;
  threshold: 'warning' | 'critical';
  cooldown: number; // ms
}

class HealthMonitor {
  private lastAlert = new Map<string, number>();
  
  constructor(private config: AlertConfig) {}
  
  async monitor(): Promise<void> {
    const report = await runHealthCheck();
    
    // 检查是否需要告警
    const needsAlert = report.checks.some(
      c => c.status === this.config.threshold || 
           (this.config.threshold === 'warning' && c.status === 'critical')
    );
    
    if (!needsAlert) return;
    
    // 冷却检查
    const now = Date.now();
    const lastAlertTime = this.lastAlert.get(this.config.channel) || 0;
    if (now - lastAlertTime < this.config.cooldown) {
      console.log('Alert cooldown active, skipping');
      return;
    }
    
    // 发送告警
    await this.sendAlert(report);
    this.lastAlert.set(this.config.channel, now);
  }
  
  private async sendAlert(report: HealthReport): Promise<void> {
    const failedChecks = report.checks.filter(
      c => c.status === 'critical' || c.status === 'warning'
    );
    
    const message = `
🚨 Health Alert - ${report.overall.toUpperCase()}

${failedChecks.map(c => `• ${c.name}: ${c.message}`).join('\n')}

Summary:
- Total: ${report.summary.total}
- Healthy: ${report.summary.healthy}
- Warning: ${report.summary.warning}
- Critical: ${report.summary.critical}
    `.trim();
    
    console.log(message);
    // 实际使用时发送到 Slack/Discord/邮件等
    // await sendMessage(this.config.channel, message);
  }
}

// 使用示例
const monitor = new HealthMonitor({
  channel: '#alerts',
  threshold: 'warning',
  cooldown: 5 * 60 * 1000 // 5 分钟冷却
});

// 每 2 分钟检查一次
setInterval(() => monitor.monitor(), 2 * 60 * 1000);
```

### 6. 仪表盘数据源

```typescript
// WebSocket 实时推送
import { WebSocketServer } from 'ws';
import { runHealthCheck, getSystemMetrics } from './health-check-pattern-skill';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // 每秒推送系统指标
  const metricsInterval = setInterval(async () => {
    const metrics = await getSystemMetrics();
    ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
  }, 1000);
  
  // 每 5 秒推送健康检查
  const healthInterval = setInterval(async () => {
    const report = await runHealthCheck();
    ws.send(JSON.stringify({ type: 'health', data: report }));
  }, 5000);
  
  ws.on('close', () => {
    clearInterval(metricsInterval);
    clearInterval(healthInterval);
    console.log('Client disconnected');
  });
});
```

---

## 📝 使用示例文件

完整示例见：`src/skills/health-check-pattern-examples.ts`

运行示例：
```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/health-check-pattern-examples.ts
```

---

## ⚡ 性能提示

1. **合理设置检查间隔** - 避免过于频繁的检查影响性能
2. **使用冷却时间** - 告警通知设置冷却期避免轰炸
3. **自定义超时** - 根据检查类型设置合适的 timeout
4. **缓存结果** - 高频读取时使用 getResults() 而非重复执行
5. **异步执行** - 多个独立检查可并行执行

---

## 🔧 内置检查说明

| 检查项 | 默认阈值 | 严重阈值 | 描述 |
|--------|---------|---------|------|
| CPU | 70% | 90% | CPU 使用率 |
| 内存 | 80% | 95% | 内存使用率 |
| 磁盘 | 80% | 95% | 根分区使用率 |
| 运行时间 | 720h | - | 系统运行时间 (30 天警告) |
| 负载 | 70% | 90% | 1 分钟负载平均 (相对于核心数) |

---

**最后更新:** 2026-03-13  
**状态:** ✅ 完成
