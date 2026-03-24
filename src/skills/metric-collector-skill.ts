/**
 * Metric Collector Skill - KAEL 指标监控工具
 * 
 * 功能:
 * 1. 指标定义 - 定义指标元数据、类型、单位、标签
 * 2. 指标收集 - 收集系统指标、自定义指标、业务指标
 * 3. 指标聚合 - 按时间窗口聚合、统计分析、趋势计算
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

import * as os from 'os';

// ============== 类型定义 ==============

/** 指标类型 */
export type MetricKind = 
  | 'gauge'       // 瞬时值 (CPU 使用率、内存使用率)
  | 'counter'     // 累加值 (请求数、错误数)
  | 'histogram'   // 分布值 (响应时间、延迟)
  | 'summary';    // 摘要统计 (总量、平均值)

/** 指标数据类型 */
export type MetricDataType = 
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'string';

/** 指标定义 */
export interface MetricDefinition {
  /** 指标名称 (唯一标识) */
  name: string;
  /** 指标描述 */
  description: string;
  /** 指标类型 */
  kind: MetricKind;
  /** 数据类型 */
  dataType: MetricDataType;
  /** 单位 */
  unit: string;
  /** 标签键列表 */
  labelKeys: string[];
  /** 是否启用 */
  enabled: boolean;
  /** 采集间隔 (毫秒) */
  collectionInterval?: number;
  /** 保留时间 (秒) */
  retentionPeriod?: number;
  /** 告警阈值配置 */
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

/** 指标数据点 */
export interface MetricPoint {
  /** 时间戳 (毫秒) */
  timestamp: number;
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 标签 */
  labels: Record<string, string>;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** 聚合统计结果 */
export interface AggregationResult {
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
  /** 最新值 */
  latest: number;
  /** 变化率 (每秒) */
  rate?: number;
  /** 百分位数 */
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
    duration: number;
  };
}

/** 时间窗口聚合结果 */
export interface WindowedAggregation {
  /** 窗口起始时间 */
  windowStart: number;
  /** 窗口结束时间 */
  windowEnd: number;
  /** 聚合结果 */
  aggregation: AggregationResult;
}

/** 指标收集器配置 */
export interface MetricCollectorConfig {
  /** 默认采集间隔 (毫秒) */
  defaultInterval?: number;
  /** 默认保留时间 (秒) */
  defaultRetention?: number;
  /** 最大数据点数 */
  maxDataPoints?: number;
  /** 是否自动清理旧数据 */
  autoCleanup?: boolean;
}

// ============== 预定义指标模板 ==============

/** 系统指标模板 */
export const SYSTEM_METRIC_TEMPLATES: Record<string, Omit<MetricDefinition, 'name'>> = {
  cpu_usage: {
    description: 'CPU 使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['core', 'host'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
    thresholds: { warning: 70, critical: 90 },
  },
  memory_usage: {
    description: '内存使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['host'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
    thresholds: { warning: 75, critical: 95 },
  },
  disk_usage: {
    description: '磁盘使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['mountpoint', 'device', 'host'],
    enabled: true,
    collectionInterval: 60000,
    retentionPeriod: 7200,
    thresholds: { warning: 80, critical: 95 },
  },
  network_rx: {
    description: '网络接收流量',
    kind: 'counter',
    dataType: 'integer',
    unit: 'bytes',
    labelKeys: ['interface', 'host'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
  },
  network_tx: {
    description: '网络发送流量',
    kind: 'counter',
    dataType: 'integer',
    unit: 'bytes',
    labelKeys: ['interface', 'host'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
  },
};

/** 业务指标模板 */
export const BUSINESS_METRIC_TEMPLATES: Record<string, Omit<MetricDefinition, 'name'>> = {
  request_count: {
    description: '请求总数',
    kind: 'counter',
    dataType: 'integer',
    unit: 'count',
    labelKeys: ['method', 'endpoint', 'status', 'service'],
    enabled: true,
    retentionPeriod: 86400,
  },
  request_duration: {
    description: '请求耗时',
    kind: 'histogram',
    dataType: 'float',
    unit: 'milliseconds',
    labelKeys: ['method', 'endpoint', 'service'],
    enabled: true,
    retentionPeriod: 3600,
    thresholds: { warning: 500, critical: 1000 },
  },
  error_count: {
    description: '错误总数',
    kind: 'counter',
    dataType: 'integer',
    unit: 'count',
    labelKeys: ['type', 'service', 'endpoint'],
    enabled: true,
    retentionPeriod: 86400,
  },
  active_connections: {
    description: '活跃连接数',
    kind: 'gauge',
    dataType: 'integer',
    unit: 'count',
    labelKeys: ['service', 'host'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
  },
};

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

// ============== MetricCollector 类 ==============

export class MetricCollector {
  private config: Required<MetricCollectorConfig>;
  private definitions: Map<string, MetricDefinition> = new Map();
  private dataPoints: Map<string, MetricPoint[]> = new Map();
  private collectionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: MetricCollectorConfig) {
    this.config = {
      defaultInterval: 5000,
      defaultRetention: 3600,
      maxDataPoints: 10000,
      autoCleanup: true,
      ...config,
    };
  }

  // ============== 1. 指标定义 ==============

  /**
   * 定义新指标
   */
  defineMetric(definition: MetricDefinition): void {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Metric "${definition.name}" already defined`);
    }

    // 验证必填字段
    if (!definition.name || !definition.description || !definition.kind || !definition.dataType || !definition.unit) {
      throw new Error('Missing required fields in metric definition');
    }

    this.definitions.set(definition.name, {
      ...definition,
      collectionInterval: definition.collectionInterval ?? this.config.defaultInterval,
      retentionPeriod: definition.retentionPeriod ?? this.config.defaultRetention,
      enabled: definition.enabled ?? true,
    });

    // 初始化数据点存储
    this.dataPoints.set(definition.name, []);
  }

  /**
   * 使用预定义模板创建指标
   */
  defineFromTemplate(name: string, templateName: keyof typeof SYSTEM_METRIC_TEMPLATES | keyof typeof BUSINESS_METRIC_TEMPLATES, labels?: Record<string, string>): void {
    const systemTemplate = SYSTEM_METRIC_TEMPLATES[templateName as keyof typeof SYSTEM_METRIC_TEMPLATES];
    const businessTemplate = BUSINESS_METRIC_TEMPLATES[templateName as keyof typeof BUSINESS_METRIC_TEMPLATES];
    
    const selectedTemplate = systemTemplate || businessTemplate;
    
    if (!selectedTemplate) {
      throw new Error(`Template "${templateName}" not found`);
    }

    this.defineMetric({
      name,
      ...selectedTemplate,
      labelKeys: labels ? Object.keys(labels) : selectedTemplate.labelKeys,
    });
  }

  /**
   * 获取指标定义
   */
  getDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * 列出所有指标定义
   */
  listDefinitions(): MetricDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 启用/禁用指标
   */
  toggleMetric(name: string, enabled: boolean): void {
    const definition = this.definitions.get(name);
    if (definition) {
      definition.enabled = enabled;
    }
  }

  /**
   * 删除指标定义
   */
  deleteMetric(name: string): void {
    this.definitions.delete(name);
    this.dataPoints.delete(name);
    this.stopCollection(name);
  }

  // ============== 2. 指标收集 ==============

  /**
   * 记录指标数据点
   */
  record(name: string, value: number, labels: Record<string, string> = {}, metadata?: Record<string, any>): void {
    const definition = this.definitions.get(name);
    
    if (!definition) {
      // 自动创建未定义的指标
      this.defineMetric({
        name,
        description: 'Auto-created metric',
        kind: 'gauge',
        dataType: 'number',
        unit: 'unknown',
        labelKeys: Object.keys(labels),
        enabled: true,
      });
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      name,
      value,
      labels,
      metadata,
    };

    let points = this.dataPoints.get(name);
    if (!points) {
      points = [];
      this.dataPoints.set(name, points);
    }

    points.push(point);

    // 限制数据点数量
    const maxPoints = definition?.retentionPeriod 
      ? Math.min(this.config.maxDataPoints, Math.floor(definition.retentionPeriod * 1000 / (definition.collectionInterval || this.config.defaultInterval)))
      : this.config.maxDataPoints;

    if (points.length > maxPoints) {
      points.splice(0, points.length - maxPoints);
    }
  }

  /**
   * 收集系统 CPU 指标
   */
  collectCpuMetrics(labels: Record<string, string> = {}): void {
    const cpus = os.cpus();
    const totalCpus = cpus.length;
    
    // 计算总体 CPU 使用率
    const cpuTimes = cpus.map(cpu => {
      const total = cpu.times.idle + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq;
      const idle = cpu.times.idle;
      return { total, idle };
    });

    const totalSum = cpuTimes.reduce((sum, t) => sum + t.total, 0);
    const idleSum = cpuTimes.reduce((sum, t) => sum + t.idle, 0);
    const usagePercent = ((totalSum - idleSum) / totalSum) * 100;

    this.record('system.cpu.usage', usagePercent, { ...labels, cores: totalCpus.toString() });

    // Load averages
    const loads = os.loadavg();
    this.record('system.cpu.load1', loads[0], labels);
    this.record('system.cpu.load5', loads[1], labels);
    this.record('system.cpu.load15', loads[2], labels);
  }

  /**
   * 收集系统内存指标
   */
  collectMemoryMetrics(labels: Record<string, string> = {}): void {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = (used / total) * 100;

    this.record('system.memory.usage', usagePercent, labels);
    this.record('system.memory.total', total, labels);
    this.record('system.memory.free', free, labels);
    this.record('system.memory.used', used, labels);
  }

  /**
   * 收集所有系统指标
   */
  collectSystemMetrics(labels: Record<string, string> = {}): void {
    this.collectCpuMetrics(labels);
    this.collectMemoryMetrics(labels);
  }

  /**
   * 启动自动收集
   */
  startCollection(name: string, collector: () => void, interval?: number): void {
    this.stopCollection(name);

    const definition = this.definitions.get(name);
    const collectInterval = interval ?? definition?.collectionInterval ?? this.config.defaultInterval;

    // 立即执行一次
    collector();

    const timer = setInterval(() => {
      collector();
      
      if (this.config.autoCleanup) {
        this.cleanupOldData(name);
      }
    }, collectInterval);

    this.collectionTimers.set(name, timer);
  }

  /**
   * 停止自动收集
   */
  stopCollection(name: string): void {
    const timer = this.collectionTimers.get(name);
    if (timer) {
      clearInterval(timer);
      this.collectionTimers.delete(name);
    }
  }

  /**
   * 停止所有收集
   */
  stopAllCollection(): void {
    this.collectionTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.collectionTimers.clear();
  }

  // ============== 3. 指标聚合 ==============

  /**
   * 查询指标数据点
   */
  query(name: string, options: {
    startTime?: number;
    endTime?: number;
    labels?: Record<string, string>;
    limit?: number;
  } = {}): MetricPoint[] {
    const points = this.dataPoints.get(name) || [];
    let result = [...points];

    // 按时间范围过滤
    if (options.startTime) {
      result = result.filter(p => p.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      result = result.filter(p => p.timestamp <= options.endTime!);
    }

    // 按标签过滤
    if (options.labels) {
      result = result.filter(p => {
        return Object.entries(options.labels!).every(([key, value]) => p.labels[key] === value);
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
  latest(name: string, labels?: Record<string, string>): MetricPoint | null {
    const points = this.query(name, { labels, limit: 1 });
    return points.length > 0 ? points[0] : null;
  }

  /**
   * 聚合指标统计
   */
  aggregate(name: string, options: {
    startTime?: number;
    endTime?: number;
    labels?: Record<string, string>;
    calculatePercentiles?: boolean;
    calculateRate?: boolean;
  } = {}): AggregationResult | null {
    const points = this.query(name, {
      startTime: options.startTime,
      endTime: options.endTime,
      labels: options.labels,
    });

    if (points.length === 0) {
      return null;
    }

    const values = points.map(p => p.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const latest = points[points.length - 1].value;

    const result: AggregationResult = {
      name,
      count: values.length,
      avg,
      max,
      min,
      sum,
      latest,
      timeRange: {
        start: points[0].timestamp,
        end: points[points.length - 1].timestamp,
        duration: points[points.length - 1].timestamp - points[0].timestamp,
      },
    };

    // 计算变化率
    if (options.calculateRate && result.timeRange.duration > 0) {
      const firstValue = points[0].value;
      const lastValue = latest;
      const durationSeconds = result.timeRange.duration / 1000;
      result.rate = (lastValue - firstValue) / durationSeconds;
    }

    // 计算百分位数
    if (options.calculatePercentiles && values.length >= 4) {
      const sorted = [...values].sort((a, b) => a - b);
      result.percentiles = {
        p50: calculatePercentile(sorted, 50),
        p90: calculatePercentile(sorted, 90),
        p95: calculatePercentile(sorted, 95),
        p99: calculatePercentile(sorted, 99),
      };
    }

    return result;
  }

  /**
   * 按时间窗口聚合
   */
  aggregateByWindow(name: string, windowSeconds: number, options: {
    startTime?: number;
    endTime?: number;
    labels?: Record<string, string>;
  } = {}): WindowedAggregation[] {
    const points = this.query(name, {
      startTime: options.startTime,
      endTime: options.endTime,
      labels: options.labels,
    });

    if (points.length === 0) return [];

    const windowMs = windowSeconds * 1000;
    const windows: Record<number, MetricPoint[]> = {};

    for (const point of points) {
      const windowKey = Math.floor(point.timestamp / windowMs) * windowMs;
      if (!windows[windowKey]) {
        windows[windowKey] = [];
      }
      windows[windowKey].push(point);
    }

    const results: WindowedAggregation[] = [];

    for (const [windowStart, windowPoints] of Object.entries(windows)) {
      const start = parseInt(windowStart);
      const values = windowPoints.map(p => p.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;

      results.push({
        windowStart: start,
        windowEnd: start + windowMs,
        aggregation: {
          name,
          count: values.length,
          avg,
          max: Math.max(...values),
          min: Math.min(...values),
          sum,
          latest: windowPoints[windowPoints.length - 1].value,
          timeRange: {
            start,
            end: start + windowMs,
            duration: windowMs,
          },
        },
      });
    }

    return results.sort((a, b) => a.windowStart - b.windowStart);
  }

  /**
   * 比较两个时间段的指标
   */
  compare(name: string, period1: { startTime: number; endTime: number }, period2: { startTime: number; endTime: number }): {
    period1: AggregationResult | null;
    period2: AggregationResult | null;
    change: number;
    changePercent: number;
  } | null {
    const agg1 = this.aggregate(name, { startTime: period1.startTime, endTime: period1.endTime });
    const agg2 = this.aggregate(name, { startTime: period2.startTime, endTime: period2.endTime });

    if (!agg1 || !agg2) {
      return null;
    }

    const change = agg2.avg - agg1.avg;
    const changePercent = agg1.avg !== 0 ? (change / agg1.avg) * 100 : 0;

    return {
      period1: agg1,
      period2: agg2,
      change,
      changePercent,
    };
  }

  // ============== 数据管理 ==============

  /**
   * 清理旧数据
   */
  cleanupOldData(name: string): void {
    const definition = this.definitions.get(name);
    if (!definition || !definition.retentionPeriod) return;

    const points = this.dataPoints.get(name) || [];
    const cutoffTime = Date.now() - definition.retentionPeriod * 1000;
    
    const filtered = points.filter(p => p.timestamp >= cutoffTime);
    
    if (filtered.length !== points.length) {
      this.dataPoints.set(name, filtered);
    }
  }

  /**
   * 清理所有旧数据
   */
  cleanupAllOldData(): void {
    this.dataPoints.forEach((_, name) => {
      this.cleanupOldData(name);
    });
  }

  /**
   * 清空所有数据
   */
  clearAll(): void {
    this.dataPoints.forEach((_, name) => {
      this.dataPoints.set(name, []);
    });
  }

  /**
   * 导出为 JSON
   */
  exportToJson(options: {
    name?: string;
    startTime?: number;
    endTime?: number;
  } = {}): string {
    let data: MetricPoint[];

    if (options.name) {
      data = this.query(options.name, {
        startTime: options.startTime,
        endTime: options.endTime,
      });
    } else {
      data = [];
      this.dataPoints.forEach((points) => {
        data.push(...points);
      });
      if (options.startTime || options.endTime) {
        data = data.filter(p => {
          if (options.startTime && p.timestamp < options.startTime) return false;
          if (options.endTime && p.timestamp > options.endTime) return false;
          return true;
        });
      }
    }

    return JSON.stringify({
      exportedAt: Date.now(),
      metricCount: this.definitions.size,
      dataPointCount: data.length,
      data,
    }, null, 2);
  }

  /**
   * 导出为 CSV
   */
  exportToCsv(name: string, options: {
    startTime?: number;
    endTime?: number;
  } = {}): string {
    const points = this.query(name, {
      startTime: options.startTime,
      endTime: options.endTime,
    });

    const headers = ['timestamp', 'name', 'value', 'labels'];
    const lines = [headers.join(',')];

    for (const point of points) {
      const labelsStr = Object.entries(point.labels)
        .map(([k, v]) => `${k}=${v}`)
        .join(';');
      
      const row = [
        point.timestamp,
        point.name,
        point.value,
        labelsStr,
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  // ============== 状态查询 ==============

  /**
   * 获取收集器状态
   */
  getStatus(): {
    metricCount: number;
    totalDataPoints: number;
    activeCollections: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
    };
  } {
    let totalDataPoints = 0;
    this.dataPoints.forEach((points) => {
      totalDataPoints += points.length;
    });

    return {
      metricCount: this.definitions.size,
      totalDataPoints,
      activeCollections: this.collectionTimers.size,
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
    };
  }
}

// ============== 导出默认实例 ==============

export const metricCollector = new MetricCollector();

export default MetricCollector;
