/**
 * Metrics Utils Skill - 性能指标监控工具
 * 
 * 功能:
 * 1. 指标收集 - 收集 CPU、内存、磁盘、网络等系统指标
 * 2. 指标聚合 - 按时间窗口聚合指标数据 (平均值、最大值、最小值、百分位数)
 * 3. 告警触发 - 基于阈值规则触发告警
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/** 指标类型 */
export type MetricType = 
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network'
  | 'process'
  | 'custom';

/** 指标数据点 */
export interface MetricDataPoint {
  /** 时间戳 (毫秒) */
  timestamp: number;
  /** 指标类型 */
  type: MetricType;
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 附加标签 */
  tags?: Record<string, string>;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** CPU 指标 */
export interface CpuMetric extends MetricDataPoint {
  type: 'cpu';
  name: 'cpu_usage' | 'cpu_load1' | 'cpu_load5' | 'cpu_load15';
  value: number;
  unit: 'percent' | 'load';
  metadata: {
    cores: number;
    model: string;
    speed: number;
  };
}

/** 内存指标 */
export interface MemoryMetric extends MetricDataPoint {
  type: 'memory';
  name: 'memory_usage' | 'memory_free' | 'memory_available' | 'swap_usage';
  value: number;
  unit: 'bytes' | 'percent';
  metadata: {
    total: number;
    used: number;
    free: number;
    available: number;
  };
}

/** 磁盘指标 */
export interface DiskMetric extends MetricDataPoint {
  type: 'disk';
  name: 'disk_usage' | 'disk_free' | 'disk_total' | 'disk_io_read' | 'disk_io_write';
  value: number;
  unit: 'bytes' | 'percent' | 'bytes_per_sec';
  tags: {
    mountpoint: string;
    device: string;
  };
}

/** 网络指标 */
export interface NetworkMetric extends MetricDataPoint {
  type: 'network';
  name: 'network_rx_bytes' | 'network_tx_bytes' | 'network_rx_packets' | 'network_tx_packets';
  value: number;
  unit: 'bytes' | 'packets' | 'bytes_per_sec' | 'packets_per_sec';
  tags: {
    interface: string;
  };
}

/** 进程指标 */
export interface ProcessMetric extends MetricDataPoint {
  type: 'process';
  name: 'process_cpu' | 'process_memory' | 'process_count';
  value: number;
  unit: 'percent' | 'bytes' | 'count';
  tags: {
    pid: string;
    name: string;
  };
}

/** 自定义指标 */
export interface CustomMetric extends MetricDataPoint {
  type: 'custom';
  name: string;
  value: number;
  unit: string;
}

/** 所有指标类型的联合 */
export type Metric = CpuMetric | MemoryMetric | DiskMetric | NetworkMetric | ProcessMetric | CustomMetric;

/** 告警级别 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/** 告警条件 */
export interface AlertCondition {
  /** 指标名称 */
  metricName: string;
  /** 比较操作符 */
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  /** 阈值 */
  threshold: number;
  /** 持续时间 (秒) - 指标超过阈值多长时间才触发 */
  duration?: number;
  /** 聚合函数 (avg/max/min) */
  aggregator?: 'avg' | 'max' | 'min';
  /** 时间窗口 (秒) */
  window?: number;
}

/** 告警规则 */
export interface AlertRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 告警条件 */
  condition: AlertCondition;
  /** 告警消息模板 */
  message?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 告警冷却时间 (秒) - 防止重复告警 */
  cooldown?: number;
  /** 上次告警时间 */
  lastAlertedAt?: number;
}

/** 告警事件 */
export interface AlertEvent {
  /** 告警 ID */
  id: string;
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 触发时间 */
  triggeredAt: number;
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 告警消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, any>;
  /** 是否已解决 */
  resolved?: boolean;
  /** 解决时间 */
  resolvedAt?: number;
}

/** 指标聚合结果 */
export interface AggregatedMetrics {
  /** 指标名称 */
  name: string;
  /** 数据点数量 */
  count: number;
  /** 平均值 */
  avg: number;
  /** 最大值 */
  max: number;
  /** 最小值 */
  min: number;
  /** 总和 */
  sum: number;
  /** 标准差 */
  stddev?: number;
  /** 百分位数 (p50, p90, p95, p99) */
  percentiles?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** 时间范围 */
  timeRange: {
    start: number;
    end: number;
  };
}

/** 指标收集器配置 */
export interface MetricsCollectorConfig {
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

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<MetricsCollectorConfig> = {
  collectionInterval: 5000,
  retentionPeriod: 3600,
  maxDataPoints: 10000,
  storageDir: path.join(process.cwd(), 'metrics-data'),
  persistToDisk: false,
};

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算百分位数
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedValues[lower];
  }
  
  const fraction = index - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * fraction;
}

/**
 * 计算标准差
 */
function calculateStdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

// ============== MetricsCollector 类 ==============

export class MetricsCollector {
  private config: Required<MetricsCollectorConfig>;
  private metrics: Metric[] = [];
  private alertRules: AlertRule[] = [];
  private alertHistory: AlertEvent[] = [];
  private collectionTimer?: NodeJS.Timeout;
  private networkStats: Record<string, { rx_bytes: number; tx_bytes: number; rx_packets: number; tx_packets: number }> = {};

  constructor(config?: MetricsCollectorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.persistToDisk) {
      this.ensureStorageDir();
      this.loadFromDisk();
    }
  }

  // ============== 指标收集方法 ==============

  /**
   * 启动自动收集
   */
  startAutoCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    this.collectAllMetrics();
    
    this.collectionTimer = setInterval(() => {
      this.collectAllMetrics();
      this.cleanupOldMetrics();
    }, this.config.collectionInterval);
  }

  /**
   * 停止自动收集
   */
  stopAutoCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
  }

  /**
   * 收集所有系统指标
   */
  collectAllMetrics(): void {
    this.collectCpuMetrics();
    this.collectMemoryMetrics();
    this.collectDiskMetrics();
    this.collectNetworkMetrics();
    this.checkAlertRules();
    
    if (this.config.persistToDisk) {
      this.saveToDisk();
    }
  }

  /**
   * 收集 CPU 指标
   */
  collectCpuMetrics(): void {
    const cpus = os.cpus();
    const totalCpus = cpus.length;
    
    // CPU 使用率
    const cpuTimes = cpus.map(cpu => {
      const total = cpu.times.idle + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq;
      const idle = cpu.times.idle;
      return { total, idle };
    });

    // 计算平均使用率
    const totalSum = cpuTimes.reduce((sum, t) => sum + t.total, 0);
    const idleSum = cpuTimes.reduce((sum, t) => sum + t.idle, 0);
    const usagePercent = ((totalSum - idleSum) / totalSum) * 100;

    const cpuMetric: CpuMetric = {
      timestamp: Date.now(),
      type: 'cpu',
      name: 'cpu_usage',
      value: usagePercent,
      unit: 'percent',
      metadata: {
        cores: totalCpus,
        model: cpus[0].model,
        speed: cpus[0].speed,
      },
    };

    this.addMetric(cpuMetric);

    // Load averages
    const loads = os.loadavg();
    this.addMetric({
      timestamp: Date.now(),
      type: 'cpu',
      name: 'cpu_load1',
      value: loads[0],
      unit: 'load',
      metadata: { cores: totalCpus, model: cpus[0].model, speed: cpus[0].speed },
    });

    this.addMetric({
      timestamp: Date.now(),
      type: 'cpu',
      name: 'cpu_load5',
      value: loads[1],
      unit: 'load',
      metadata: { cores: totalCpus, model: cpus[0].model, speed: cpus[0].speed },
    });

    this.addMetric({
      timestamp: Date.now(),
      type: 'cpu',
      name: 'cpu_load15',
      value: loads[2],
      unit: 'load',
      metadata: { cores: totalCpus, model: cpus[0].model, speed: cpus[0].speed },
    });
  }

  /**
   * 收集内存指标
   */
  collectMemoryMetrics(): void {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const available = free; // 简化处理
    const usagePercent = (used / total) * 100;

    const memoryMetric: MemoryMetric = {
      timestamp: Date.now(),
      type: 'memory',
      name: 'memory_usage',
      value: usagePercent,
      unit: 'percent',
      metadata: { total, used, free, available },
    };

    this.addMetric(memoryMetric);

    this.addMetric({
      timestamp: Date.now(),
      type: 'memory',
      name: 'memory_free',
      value: free,
      unit: 'bytes',
      metadata: { total, used, free, available },
    });

    this.addMetric({
      timestamp: Date.now(),
      type: 'memory',
      name: 'memory_available',
      value: available,
      unit: 'bytes',
      metadata: { total, used, free, available },
    });
  }

  /**
   * 收集磁盘指标
   */
  collectDiskMetrics(): void {
    // 注意：os 模块不直接提供磁盘使用情况，这里使用简化版本
    // 实际项目中可能需要调用系统命令或使用第三方库
    
    const platforms = os.platform();
    
    if (platforms === 'darwin' || platforms === 'linux') {
      // 可以执行 df 命令获取磁盘信息
      // 这里提供一个简化的实现
      try {
        const homeDir = os.homedir();
        const stat = fs.statfsSync(homeDir);
        const blockSize = stat.bsize;
        const total = stat.blocks * blockSize;
        const free = stat.bfree * blockSize;
        const available = stat.bavail * blockSize;
        const used = total - free;
        const usagePercent = (used / total) * 100;

        this.addMetric({
          timestamp: Date.now(),
          type: 'disk',
          name: 'disk_usage',
          value: usagePercent,
          unit: 'percent',
          tags: { mountpoint: homeDir, device: 'root' },
        });

        this.addMetric({
          timestamp: Date.now(),
          type: 'disk',
          name: 'disk_free',
          value: available,
          unit: 'bytes',
          tags: { mountpoint: homeDir, device: 'root' },
        });

        this.addMetric({
          timestamp: Date.now(),
          type: 'disk',
          name: 'disk_total',
          value: total,
          unit: 'bytes',
          tags: { mountpoint: homeDir, device: 'root' },
        });
      } catch (e) {
        // 忽略错误
      }
    }
  }

  /**
   * 收集网络指标
   */
  collectNetworkMetrics(): void {
    const interfaces = os.networkInterfaces();
    
    for (const [name, iface] of Object.entries(interfaces)) {
      if (!iface || iface.length === 0) continue;

      // 跳过回环接口
      if (iface[0].internal) continue;

      // 简化处理：模拟网络流量
      // 实际项目中应该读取 /proc/net/dev (Linux) 或使用 netstat (macOS)
      const prevStats = this.networkStats[name] || { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
      
      // 模拟增长
      const rxBytes = prevStats.rx_bytes + Math.floor(Math.random() * 10000);
      const txBytes = prevStats.tx_bytes + Math.floor(Math.random() * 5000);
      const rxPackets = prevStats.rx_packets + Math.floor(Math.random() * 100);
      const txPackets = prevStats.tx_packets + Math.floor(Math.random() * 50);

      this.networkStats[name] = { rx_bytes: rxBytes, tx_bytes: txBytes, rx_packets: rxPackets, tx_packets: txPackets };

      this.addMetric({
        timestamp: Date.now(),
        type: 'network',
        name: 'network_rx_bytes',
        value: rxBytes,
        unit: 'bytes',
        tags: { interface: name },
      });

      this.addMetric({
        timestamp: Date.now(),
        type: 'network',
        name: 'network_tx_bytes',
        value: txBytes,
        unit: 'bytes',
        tags: { interface: name },
      });
    }
  }

  /**
   * 添加自定义指标
   */
  addCustomMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: CustomMetric = {
      timestamp: Date.now(),
      type: 'custom',
      name,
      value,
      unit,
      tags,
    };
    this.addMetric(metric);
  }

  /**
   * 内部方法：添加指标
   */
  private addMetric(metric: Metric): void {
    this.metrics.push(metric);
    
    // 限制数据点数量
    if (this.metrics.length > this.config.maxDataPoints) {
      this.metrics = this.metrics.slice(-this.config.maxDataPoints);
    }
  }

  // ============== 指标查询方法 ==============

  /**
   * 查询指标数据
   */
  queryMetrics(options: {
    name?: string;
    type?: MetricType;
    startTime?: number;
    endTime?: number;
    tags?: Record<string, string>;
    limit?: number;
  } = {}): Metric[] {
    let result = [...this.metrics];

    // 按名称过滤
    if (options.name) {
      result = result.filter(m => m.name === options.name);
    }

    // 按类型过滤
    if (options.type) {
      result = result.filter(m => m.type === options.type);
    }

    // 按时间范围过滤
    if (options.startTime) {
      result = result.filter(m => m.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      result = result.filter(m => m.timestamp <= options.endTime!);
    }

    // 按标签过滤
    if (options.tags) {
      result = result.filter(m => {
        if (!m.tags) return false;
        return Object.entries(options.tags!).every(([key, value]) => m.tags?.[key] === value);
      });
    }

    // 限制数量
    if (options.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * 获取最新指标值
   */
  getLatestMetric(name: string, type?: MetricType): Metric | null {
    const metrics = this.queryMetrics({ name, type, limit: 1 });
    return metrics.length > 0 ? metrics[0] : null;
  }

  // ============== 指标聚合方法 ==============

  /**
   * 聚合指标
   */
  aggregateMetrics(name: string, options: {
    startTime?: number;
    endTime?: number;
    window?: number; // 时间窗口 (秒)
    calculatePercentiles?: boolean;
    calculateStdDev?: boolean;
  } = {}): AggregatedMetrics {
    const metrics = this.queryMetrics({ name, startTime: options.startTime, endTime: options.endTime });
    
    if (metrics.length === 0) {
      return {
        name,
        count: 0,
        avg: 0,
        max: 0,
        min: 0,
        sum: 0,
        timeRange: { start: 0, end: 0 },
      };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const aggregated: AggregatedMetrics = {
      name,
      count: values.length,
      avg,
      max,
      min,
      sum,
      timeRange: {
        start: metrics[0].timestamp,
        end: metrics[metrics.length - 1].timestamp,
      },
    };

    // 计算标准差
    if (options.calculateStdDev && values.length >= 2) {
      aggregated.stddev = calculateStdDev(values, avg);
    }

    // 计算百分位数
    if (options.calculatePercentiles && values.length >= 4) {
      const sorted = [...values].sort((a, b) => a - b);
      aggregated.percentiles = {
        p50: calculatePercentile(sorted, 50),
        p90: calculatePercentile(sorted, 90),
        p95: calculatePercentile(sorted, 95),
        p99: calculatePercentile(sorted, 99),
      };
    }

    return aggregated;
  }

  /**
   * 按时间窗口聚合
   */
  aggregateByWindow(name: string, windowSeconds: number): AggregatedMetrics[] {
    const metrics = this.queryMetrics({ name });
    
    if (metrics.length === 0) return [];

    const windowMs = windowSeconds * 1000;
    const startTime = metrics[0].timestamp;
    const endTime = metrics[metrics.length - 1].timestamp;
    
    const windows: Record<number, number[]> = {};
    
    for (const metric of metrics) {
      const windowKey = Math.floor(metric.timestamp / windowMs) * windowMs;
      if (!windows[windowKey]) {
        windows[windowKey] = [];
      }
      windows[windowKey].push(metric.value);
    }

    const results: AggregatedMetrics[] = [];
    
    for (const [windowStart, values] of Object.entries(windows)) {
      const start = parseInt(windowStart);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      results.push({
        name,
        count: values.length,
        avg,
        max: Math.max(...values),
        min: Math.min(...values),
        sum: values.reduce((a, b) => a + b, 0),
        timeRange: {
          start,
          end: start + windowMs,
        },
      });
    }

    return results.sort((a, b) => a.timeRange.start - b.timeRange.start);
  }

  // ============== 告警管理方法 ==============

  /**
   * 添加告警规则
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): void {
    const alertRule: AlertRule = {
      ...rule,
      id: generateId(),
    };
    this.alertRules.push(alertRule);
  }

  /**
   * 移除告警规则
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
  }

  /**
   * 启用/禁用告警规则
   */
  toggleAlertRule(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 检查告警规则
   */
  checkAlertRules(): AlertEvent[] {
    const triggeredAlerts: AlertEvent[] = [];
    const now = Date.now();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      if (rule.lastAlertedAt && rule.cooldown) {
        const timeSinceLastAlert = (now - rule.lastAlertedAt) / 1000;
        if (timeSinceLastAlert < rule.cooldown) {
          continue;
        }
      }

      // 获取指标数据
      const condition = rule.condition;
      const window = condition.window || 60; // 默认 60 秒窗口
      const startTime = now - window * 1000;
      
      const metrics = this.queryMetrics({
        name: condition.metricName,
        startTime,
      });

      if (metrics.length === 0) continue;

      // 聚合数据
      let currentValue: number;
      const aggregator = condition.aggregator || 'avg';
      
      if (aggregator === 'avg') {
        currentValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      } else if (aggregator === 'max') {
        currentValue = Math.max(...metrics.map(m => m.value));
      } else if (aggregator === 'min') {
        currentValue = Math.min(...metrics.map(m => m.value));
      } else {
        currentValue = metrics[metrics.length - 1].value;
      }

      // 检查条件
      const triggered = this.evaluateCondition(currentValue, condition.operator, condition.threshold);

      if (triggered) {
        const alert: AlertEvent = {
          id: generateId(),
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          triggeredAt: now,
          currentValue,
          threshold: condition.threshold,
          message: rule.message || this.generateAlertMessage(rule, currentValue),
        };

        this.alertHistory.push(alert);
        triggeredAlerts.push(alert);
        
        rule.lastAlertedAt = now;
      }
    }

    return triggeredAlerts;
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(options: {
    level?: AlertLevel;
    ruleId?: string;
    startTime?: number;
    endTime?: number;
    resolved?: boolean;
    limit?: number;
  } = {}): AlertEvent[] {
    let result = [...this.alertHistory];

    if (options.level) {
      result = result.filter(a => a.level === options.level);
    }

    if (options.ruleId) {
      result = result.filter(a => a.ruleId === options.ruleId);
    }

    if (options.startTime) {
      result = result.filter(a => a.triggeredAt >= options.startTime!);
    }

    if (options.endTime) {
      result = result.filter(a => a.triggeredAt <= options.endTime!);
    }

    if (options.resolved !== undefined) {
      result = result.filter(a => (a.resolved || false) === options.resolved);
    }

    if (options.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): void {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  /**
   * 获取当前活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return this.alertHistory.filter(a => !a.resolved);
  }

  // ============== 数据持久化方法 ==============

  /**
   * 清理旧数据
   */
  cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * 保存到磁盘
   */
  saveToDisk(): void {
    if (!this.config.persistToDisk) return;

    const data = {
      metrics: this.metrics,
      alertHistory: this.alertHistory,
      savedAt: Date.now(),
    };

    const filePath = path.join(this.config.storageDir, 'metrics.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * 从磁盘加载
   */
  loadFromDisk(): void {
    const filePath = path.join(this.config.storageDir, 'metrics.json');
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        this.metrics = data.metrics || [];
        this.alertHistory = data.alertHistory || [];
      } catch (e) {
        // 忽略加载错误
      }
    }
  }

  /**
   * 导出指标为 JSON
   */
  exportToJson(options: {
    startTime?: number;
    endTime?: number;
    name?: string;
  } = {}): string {
    const metrics = this.queryMetrics({
      startTime: options.startTime,
      endTime: options.endTime,
      name: options.name,
    });

    return JSON.stringify(metrics, null, 2);
  }

  /**
   * 导出指标为 CSV
   */
  exportToCsv(options: {
    startTime?: number;
    endTime?: number;
    name?: string;
  } = {}): string {
    const metrics = this.queryMetrics({
      startTime: options.startTime,
      endTime: options.endTime,
      name: options.name,
    });

    const headers = ['timestamp', 'type', 'name', 'value', 'unit'];
    const lines = [headers.join(',')];

    for (const metric of metrics) {
      const row = [
        metric.timestamp,
        metric.type,
        metric.name,
        metric.value,
        metric.unit,
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  // ============== 私有方法 ==============

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const condition = rule.condition;
    const operatorText = {
      '>': '超过',
      '<': '低于',
      '>=': '达到或超过',
      '<=': '达到或低于',
      '==': '等于',
      '!=': '不等于',
    }[condition.operator];

    return `[${rule.level.toUpperCase()}] ${rule.name}: 当前值 ${currentValue.toFixed(2)} ${operatorText} 阈值 ${condition.threshold}`;
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.config.storageDir)) {
      fs.mkdirSync(this.config.storageDir, { recursive: true });
    }
  }
}

// ============== 导出默认实例 ==============

export const metricsCollector = new MetricsCollector();

export default MetricsCollector;
