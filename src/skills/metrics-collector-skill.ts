/**
 * Metrics Collector Skill - 指标收集工具
 * 
 * 功能:
 * 1. 指标记录 - 记录单个或批量指标数据
 * 2. 指标聚合 - 按时间窗口/维度聚合指标
 * 3. 指标导出 - 导出为 JSON/CSV 格式
 * 
 * @module skills/metrics-collector
 * @author ACE
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Skill, Command } from './skill-registry';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 指标数据类型
 */
export enum MetricType {
  COUNTER = 'counter',      // 计数器 (只增不减)
  GAUGE = 'gauge',          // 仪表 (可增可减)
  HISTOGRAM = 'histogram',  // 直方图 (分布统计)
  SUMMARY = 'summary',      // 摘要 (分位数统计)
}

/**
 * 指标记录
 */
export interface MetricRecord {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 指标类型 */
  type: MetricType;
  /** 时间戳 (毫秒) */
  timestamp: number;
  /** 标签/维度 */
  labels?: Record<string, string>;
  /** 单位 */
  unit?: string;
  /** 描述 */
  description?: string;
}

/**
 * 聚合结果
 */
export interface AggregationResult {
  /** 指标名称 */
  name: string;
  /** 聚合类型 */
  aggregation: AggregationType;
  /** 时间窗口 */
  window: TimeWindow;
  /** 聚合值 */
  value: number;
  /** 样本数量 */
  count: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 平均值 */
  avg?: number;
  /** 总和 */
  sum?: number;
  /** 分位数 (仅 histogram/summary) */
  quantiles?: Record<number, number>;
}

/**
 * 聚合类型
 */
export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  RATE = 'rate',
  P95 = 'p95',
  P99 = 'p99',
}

/**
 * 时间窗口
 */
export interface TimeWindow {
  /** 起始时间戳 */
  start: number;
  /** 结束时间戳 */
  end: number;
  /** 窗口大小 (秒) */
  size?: number;
}

/**
 * 导出格式
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PROMETHEUS = 'prometheus',
}

/**
 * 指标收集器配置
 */
export interface MetricsCollectorConfig {
  /** 数据存储路径 */
  storagePath: string;
  /** 最大保留天数 */
  maxRetentionDays: number;
  /** 自动聚合间隔 (秒) */
  autoAggregateInterval?: number;
  /** 是否启用压缩 */
  enableCompression?: boolean;
}

/**
 * 指标查询条件
 */
export interface MetricQuery {
  /** 指标名称 (支持通配符) */
  name?: string;
  /** 标签过滤 */
  labels?: Record<string, string>;
  /** 起始时间 */
  start?: number;
  /** 结束时间 */
  end?: number;
  /** 指标类型过滤 */
  type?: MetricType;
}

// ============================================================================
// MetricsCollector 技能类
// ============================================================================

export class MetricsCollectorSkill {
  private config: MetricsCollectorConfig;
  private metrics: MetricRecord[] = [];
  private aggregations: Map<string, AggregationResult> = new Map();

  constructor(config?: Partial<MetricsCollectorConfig>) {
    this.config = {
      storagePath: path.join(process.cwd(), '.metrics'),
      maxRetentionDays: 30,
      autoAggregateInterval: 60,
      enableCompression: false,
      ...config,
    };

    // 确保存储目录存在
    this.ensureStorageDir();
    // 加载已有数据
    this.loadMetrics();
  }

  /**
   * 1. 指标记录 - 记录单个指标
   * 
   * @param name 指标名称
   * @param value 指标值
   * @param options 选项 (类型/标签/单位/描述)
   * @returns MetricRecord 记录的指标
   */
  async record(
    name: string,
    value: number,
    options?: {
      type?: MetricType;
      labels?: Record<string, string>;
      unit?: string;
      description?: string;
    }
  ): Promise<MetricRecord> {
    const record: MetricRecord = {
      name,
      value,
      type: options?.type || MetricType.GAUGE,
      timestamp: Date.now(),
      labels: options?.labels,
      unit: options?.unit,
      description: options?.description,
    };

    // 验证计数器类型
    if (record.type === MetricType.COUNTER && value < 0) {
      throw new MetricsCollectorError('计数器指标不能为负值', name);
    }

    this.metrics.push(record);
    
    // 自动保存
    await this.saveMetrics();

    return record;
  }

  /**
   * 批量记录指标
   * 
   * @param records 指标记录数组
   * @returns 记录的指标数量
   */
  async recordBatch(records: Array<{
    name: string;
    value: number;
    type?: MetricType;
    labels?: Record<string, string>;
    unit?: string;
    description?: string;
  }>): Promise<number> {
    const validRecords: MetricRecord[] = [];
    const timestamp = Date.now();

    for (const r of records) {
      if (r.type === MetricType.COUNTER && r.value < 0) {
        continue; // 跳过无效的计数器
      }

      validRecords.push({
        name: r.name,
        value: r.value,
        type: r.type || MetricType.GAUGE,
        timestamp,
        labels: r.labels,
        unit: r.unit,
        description: r.description,
      });
    }

    this.metrics.push(...validRecords);
    await this.saveMetrics();

    return validRecords.length;
  }

  /**
   * 2. 指标聚合 - 按时间窗口聚合
   * 
   * @param query 查询条件
   * @param aggregation 聚合类型
   * @param windowSize 窗口大小 (秒)
   * @returns AggregationResult 聚合结果
   */
  async aggregate(
    query: MetricQuery,
    aggregation: AggregationType,
    windowSize?: number
  ): Promise<AggregationResult> {
    const filtered = this.queryMetrics(query);
    
    if (filtered.length === 0) {
      throw new MetricsCollectorError('没有匹配的指标数据', query.name || 'unknown');
    }

    const values = filtered.map(m => m.value);
    const window: TimeWindow = {
      start: filtered[0].timestamp,
      end: filtered[filtered.length - 1].timestamp,
      size: windowSize,
    };

    let resultValue = 0;
    let quantiles: Record<number, number> | undefined;

    // 计算聚合值
    switch (aggregation) {
      case AggregationType.SUM:
        resultValue = values.reduce((sum, v) => sum + v, 0);
        break;
      case AggregationType.AVG:
        resultValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        break;
      case AggregationType.MIN:
        resultValue = Math.min(...values);
        break;
      case AggregationType.MAX:
        resultValue = Math.max(...values);
        break;
      case AggregationType.COUNT:
        resultValue = values.length;
        break;
      case AggregationType.RATE:
        const timeRange = (window.end - window.start) / 1000; // 转换为秒
        resultValue = timeRange > 0 ? (values[values.length - 1] - values[0]) / timeRange : 0;
        break;
      case AggregationType.P95:
        quantiles = { 0.95: this.calculatePercentile(values, 95) };
        resultValue = quantiles[0.95];
        break;
      case AggregationType.P99:
        quantiles = { 0.99: this.calculatePercentile(values, 99) };
        resultValue = quantiles[0.99];
        break;
    }

    const result: AggregationResult = {
      name: query.name || 'aggregated',
      aggregation,
      window,
      value: resultValue,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      sum: values.reduce((sum, v) => sum + v, 0),
      quantiles,
    };

    // 缓存聚合结果
    const cacheKey = this.getAggregationCacheKey(query, aggregation, windowSize);
    this.aggregations.set(cacheKey, result);

    return result;
  }

  /**
   * 多维度聚合
   * 
   * @param query 查询条件
   * @param aggregation 聚合类型
   * @param groupBy 分组维度 (标签名)
   * @returns 按维度分组的聚合结果
   */
  async aggregateByDimension(
    query: MetricQuery,
    aggregation: AggregationType,
    groupBy: string
  ): Promise<Map<string, AggregationResult>> {
    const filtered = this.queryMetrics(query);
    const groups = new Map<string, MetricRecord[]>();

    // 按维度分组
    for (const metric of filtered) {
      const groupKey = metric.labels?.[groupBy] || 'unknown';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(metric);
    }

    const results = new Map<string, AggregationResult>();

    // 对每组进行聚合
    for (const [groupKey, groupMetrics] of groups) {
      const values = groupMetrics.map(m => m.value);
      
      let value = 0;
      switch (aggregation) {
        case AggregationType.SUM:
          value = values.reduce((sum, v) => sum + v, 0);
          break;
        case AggregationType.AVG:
          value = values.reduce((sum, v) => sum + v, 0) / values.length;
          break;
        case AggregationType.MIN:
          value = Math.min(...values);
          break;
        case AggregationType.MAX:
          value = Math.max(...values);
          break;
        case AggregationType.COUNT:
          value = values.length;
          break;
        default:
          value = values[0];
      }

      results.set(groupKey, {
        name: query.name || 'aggregated',
        aggregation,
        window: {
          start: groupMetrics[0].timestamp,
          end: groupMetrics[groupMetrics.length - 1].timestamp,
        },
        value,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        sum: values.reduce((sum, v) => sum + v, 0),
      });
    }

    return results;
  }

  /**
   * 3. 指标导出 - 导出为指定格式
   * 
   * @param format 导出格式
   * @param query 查询条件 (可选)
   * @param outputPath 输出路径 (可选)
   * @returns 导出的内容或文件路径
   */
  async export(
    format: ExportFormat,
    query?: MetricQuery,
    outputPath?: string
  ): Promise<string> {
    const metrics = query ? this.queryMetrics(query) : this.metrics;

    let content: string;

    switch (format) {
      case ExportFormat.JSON:
        content = this.exportAsJson(metrics);
        break;
      case ExportFormat.CSV:
        content = this.exportAsCsv(metrics);
        break;
      case ExportFormat.PROMETHEUS:
        content = this.exportAsPrometheus(metrics);
        break;
      default:
        throw new MetricsCollectorError('不支持的导出格式', format);
    }

    // 如果指定了输出路径，写入文件
    if (outputPath) {
      fs.writeFileSync(outputPath, content, 'utf-8');
      return outputPath;
    }

    return content;
  }

  /**
   * 查询指标
   */
  queryMetrics(query: MetricQuery): MetricRecord[] {
    return this.metrics.filter(metric => {
      // 名称过滤 (支持通配符 *)
      if (query.name) {
        const pattern = query.name.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (!regex.test(metric.name)) {
          return false;
        }
      }

      // 标签过滤
      if (query.labels) {
        for (const [key, value] of Object.entries(query.labels)) {
          if (metric.labels?.[key] !== value) {
            return false;
          }
        }
      }

      // 时间范围过滤
      if (query.start && metric.timestamp < query.start) {
        return false;
      }
      if (query.end && metric.timestamp > query.end) {
        return false;
      }

      // 类型过滤
      if (query.type && metric.type !== query.type) {
        return false;
      }

      return true;
    });
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): MetricRecord[] {
    return [...this.metrics];
  }

  /**
   * 清除指标数据
   */
  async clear(query?: MetricQuery): Promise<number> {
    if (!query) {
      const count = this.metrics.length;
      this.metrics = [];
      this.aggregations.clear();
      await this.saveMetrics();
      return count;
    }

    const before = this.metrics.length;
    this.metrics = this.metrics.filter(metric => {
      // 保留不匹配的
      return !this.matchesQuery(metric, query);
    });
    const removed = before - this.metrics.length;

    if (removed > 0) {
      await this.saveMetrics();
    }

    return removed;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalRecords: number;
    uniqueMetrics: number;
    timeRange: { start: number; end: number };
    storageSize: number;
  } {
    const uniqueNames = new Set(this.metrics.map(m => m.name));
    const storagePath = path.join(this.config.storagePath, 'metrics.json');
    let storageSize = 0;

    try {
      if (fs.existsSync(storagePath)) {
        storageSize = fs.statSync(storagePath).size;
      }
    } catch {
      // 忽略错误
    }

    return {
      totalRecords: this.metrics.length,
      uniqueMetrics: uniqueNames.size,
      timeRange: {
        start: this.metrics.length > 0 ? this.metrics[0].timestamp : 0,
        end: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : 0,
      },
      storageSize,
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 计算百分位数
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }

    const fraction = index - lower;
    return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
  }

  /**
   * 导出为 JSON
   */
  private exportAsJson(metrics: MetricRecord[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: metrics.length,
        metrics,
      },
      null,
      2
    );
  }

  /**
   * 导出为 CSV
   */
  private exportAsCsv(metrics: MetricRecord[]): string {
    if (metrics.length === 0) {
      return '';
    }

    const headers = ['name', 'value', 'type', 'timestamp', 'unit', 'description', 'labels'];
    const lines = [headers.join(',')];

    for (const metric of metrics) {
      const row = [
        metric.name,
        metric.value,
        metric.type,
        metric.timestamp,
        metric.unit || '',
        metric.description || '',
        metric.labels ? JSON.stringify(metric.labels) : '',
      ];
      lines.push(row.map(cell => `"${cell}"`).join(','));
    }

    return lines.join('\n');
  }

  /**
   * 导出为 Prometheus 格式
   */
  private exportAsPrometheus(metrics: MetricRecord[]): string {
    const lines: string[] = [];
    const grouped = new Map<string, MetricRecord[]>();

    // 按指标名分组
    for (const metric of metrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }

    // 生成 Prometheus 格式
    for (const [name, group] of grouped) {
      const sample = group[0];
      
      // 添加 HELP
      if (sample.description) {
        lines.push(`# HELP ${name} ${sample.description}`);
      }
      
      // 添加 TYPE
      lines.push(`# TYPE ${name} ${sample.type}`);
      
      // 添加指标值
      for (const metric of group) {
        const labelsStr = metric.labels
          ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
          : '';
        
        if (metric.unit) {
          lines.push(`${name}${labelsStr} ${metric.value} ${metric.timestamp}`);
        } else {
          lines.push(`${name}${labelsStr} ${metric.value} ${metric.timestamp}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 生成聚合缓存键
   */
  private getAggregationCacheKey(
    query: MetricQuery,
    aggregation: AggregationType,
    windowSize?: number
  ): string {
    return `${query.name || '*'}:${aggregation}:${windowSize || 0}`;
  }

  /**
   * 检查指标是否匹配查询
   */
  private matchesQuery(metric: MetricRecord, query: MetricQuery): boolean {
    if (query.name) {
      const pattern = query.name.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (!regex.test(metric.name)) {
        return false;
      }
    }

    if (query.labels) {
      for (const [key, value] of Object.entries(query.labels)) {
        if (metric.labels?.[key] !== value) {
          return false;
        }
      }
    }

    if (query.start && metric.timestamp < query.start) {
      return false;
    }
    if (query.end && metric.timestamp > query.end) {
      return false;
    }

    if (query.type && metric.type !== query.type) {
      return false;
    }

    return true;
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, { recursive: true });
    }
  }

  /**
   * 保存指标到文件
   */
  private async saveMetrics(): Promise<void> {
    const storagePath = path.join(this.config.storagePath, 'metrics.json');
    
    // 清理过期数据
    const cutoff = Date.now() - this.config.maxRetentionDays * 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const data = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      metrics: this.metrics,
    };

    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 从文件加载指标
   */
  private loadMetrics(): void {
    const storagePath = path.join(this.config.storagePath, 'metrics.json');
    
    try {
      if (fs.existsSync(storagePath)) {
        const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
        this.metrics = data.metrics || [];
      }
    } catch (error) {
      console.warn('加载指标数据失败:', error);
      this.metrics = [];
    }
  }

  /**
   * 转换为 Skill 对象 (用于技能注册)
   */
  toSkill(): Skill {
    return {
      name: 'metrics-collector',
      version: '1.0.0',
      description: '指标收集工具 - 支持指标记录、聚合、导出等功能',
      commands: [
        {
          name: 'record',
          description: '记录单个指标',
          parameters: {
            name: '指标名称',
            value: '指标值',
            type: '指标类型 (counter|gauge|histogram|summary)',
            labels: '标签/维度 (JSON 对象)',
            unit: '单位',
            description: '描述',
          },
          handler: (params?: {
            name: string;
            value: number;
            type?: MetricType;
            labels?: Record<string, string>;
            unit?: string;
            description?: string;
          }) =>
            params
              ? this.record(params.name, params.value, {
                  type: params.type,
                  labels: params.labels,
                  unit: params.unit,
                  description: params.description,
                })
              : Promise.reject(new Error('缺少必要参数')),
        },
        {
          name: 'record-batch',
          description: '批量记录指标',
          parameters: {
            records: '指标记录数组',
          },
          handler: (params?: { records: any[] }) =>
            params ? this.recordBatch(params.records) : Promise.reject(new Error('缺少必要参数')),
        },
        {
          name: 'aggregate',
          description: '聚合指标',
          parameters: {
            name: '指标名称',
            aggregation: '聚合类型 (sum|avg|min|max|count|rate|p95|p99)',
            windowSize: '窗口大小 (秒)',
            labels: '标签过滤 (JSON 对象)',
          },
          handler: (params?: {
            name: string;
            aggregation: AggregationType;
            windowSize?: number;
            labels?: Record<string, string>;
          }) =>
            params
              ? this.aggregate(
                  { name: params.name, labels: params.labels },
                  params.aggregation,
                  params.windowSize
                )
              : Promise.reject(new Error('缺少必要参数')),
        },
        {
          name: 'export',
          description: '导出指标',
          parameters: {
            format: '导出格式 (json|csv|prometheus)',
            name: '指标名称 (可选)',
            outputPath: '输出路径 (可选)',
          },
          handler: (params?: { format: ExportFormat; name?: string; outputPath?: string }) =>
            params
              ? this.export(params.format, params.name ? { name: params.name } : undefined, params.outputPath)
              : Promise.reject(new Error('缺少必要参数')),
        },
        {
          name: 'query',
          description: '查询指标',
          parameters: {
            name: '指标名称 (支持通配符)',
            labels: '标签过滤 (JSON 对象)',
            start: '起始时间戳',
            end: '结束时间戳',
          },
          handler: (params?: {
            name?: string;
            labels?: Record<string, string>;
            start?: number;
            end?: number;
          }) =>
            Promise.resolve(this.queryMetrics({
              name: params?.name,
              labels: params?.labels,
              start: params?.start,
              end: params?.end,
            })),
        },
        {
          name: 'stats',
          description: '获取统计信息',
          handler: () => Promise.resolve(this.getStats()),
        },
        {
          name: 'clear',
          description: '清除指标数据',
          parameters: {
            name: '指标名称 (可选，不传则清除所有)',
          },
          handler: (params?: { name?: string }) =>
            this.clear(params?.name ? { name: params.name } : undefined),
        },
      ],
      enabled: true,
      metadata: {
        author: 'ACE',
        category: 'monitoring',
      },
    };
  }
}

// ============================================================================
// 错误类
// ============================================================================

export class MetricsCollectorError extends Error {
  constructor(message: string, public readonly metric?: string) {
    super(message);
    this.name = 'MetricsCollectorError';
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const metricsCollector = new MetricsCollectorSkill();

export default metricsCollector;
