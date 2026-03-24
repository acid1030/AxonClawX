/**
 * Metrics Dashboard Skill - 指标仪表板工具
 * 
 * 功能:
 * 1. 指标展示 - 实时展示系统/业务指标
 * 2. 图表生成 - 生成 ASCII/Markdown 图表
 * 3. 告警规则 - 配置和触发告警规则
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

import * as os from 'os';

// ============== 类型定义 ==============

/** 指标数据类型 */
export type MetricDataType = 
  | 'gauge'      // 瞬时值 (如 CPU 使用率)
  | 'counter'    // 累计值 (如请求总数)
  | 'histogram'  // 分布值 (如响应时间)
  | 'summary';   // 摘要值 (如百分位数)

/** 指标严重级别 */
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

/** 告警状态 */
export type AlertStatus = 'pending' | 'firing' | 'resolved';

/** 指标数据点 */
export interface MetricPoint {
  /** 时间戳 (毫秒) */
  timestamp: number;
  /** 指标值 */
  value: number;
  /** 标签 */
  labels?: Record<string, string>;
}

/** 指标定义 */
export interface MetricDefinition {
  /** 指标名称 */
  name: string;
  /** 指标描述 */
  description?: string;
  /** 数据类型 */
  type: MetricDataType;
  /** 单位 */
  unit: string;
  /** 数据点历史 */
  points: MetricPoint[];
  /** 最大历史长度 */
  maxPoints?: number;
}

/** 告警规则 */
export interface AlertRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 指标名称 */
  metricName: string;
  /** 比较操作符 */
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  /** 阈值 */
  threshold: number;
  /** 持续时间 (秒) - 超过该时间才触发 */
  duration?: number;
  /** 严重级别 */
  severity: AlertSeverity;
  /** 告警消息模板 */
  message?: string;
  /** 标签过滤 */
  labels?: Record<string, string>;
  /** 启用状态 */
  enabled: boolean;
}

/** 告警实例 */
export interface AlertInstance {
  /** 告警 ID */
  id: string;
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 当前状态 */
  status: AlertStatus;
  /** 严重级别 */
  severity: AlertSeverity;
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 触发时间 */
  firingAt?: number;
  /** 解决时间 */
  resolvedAt?: number;
  /** 告警消息 */
  message: string;
  /** 标签 */
  labels?: Record<string, string>;
}

/** 仪表板配置 */
export interface DashboardConfig {
  /** 仪表板名称 */
  name: string;
  /** 刷新间隔 (毫秒) */
  refreshInterval?: number;
  /** 指标列表 */
  metrics: string[];
  /** 图表配置 */
  charts?: ChartConfig[];
  /** 告警规则 */
  alertRules?: AlertRule[];
}

/** 图表配置 */
export interface ChartConfig {
  /** 图表 ID */
  id: string;
  /** 图表类型 */
  type: 'line' | 'bar' | 'gauge' | 'pie' | 'heatmap';
  /** 标题 */
  title: string;
  /** 指标名称列表 */
  metricNames: string[];
  /** 时间范围 (秒) */
  timeRange?: number;
  /** 图表选项 */
  options?: Record<string, any>;
}

/** 仪表板状态 */
export interface DashboardState {
  /** 指标存储 */
  metrics: Map<string, MetricDefinition>;
  /** 告警规则 */
  alertRules: Map<string, AlertRule>;
  /** 告警实例 */
  alerts: Map<string, AlertInstance>;
  /** 配置 */
  config?: DashboardConfig;
}

// ============== 指标仪表板类 ==============

export class MetricsDashboard {
  private state: DashboardState;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(config?: DashboardConfig) {
    this.state = {
      metrics: new Map(),
      alertRules: new Map(),
      alerts: new Map(),
      config
    };
    this.timers = new Map();

    // 初始化配置中的指标和规则
    if (config) {
      config.metrics.forEach(name => {
        this.registerMetric(name, {
          name,
          type: 'gauge',
          unit: 'value',
          points: [],
          maxPoints: 1000
        });
      });

      config.alertRules?.forEach(rule => {
        this.addAlertRule(rule);
      });
    }
  }

  // ============== 指标管理 ==============

  /**
   * 注册指标
   */
  registerMetric(name: string, definition?: Partial<MetricDefinition>): MetricDefinition {
    const existing = this.state.metrics.get(name);
    if (existing) {
      return existing;
    }

    const metric: MetricDefinition = {
      name,
      type: 'gauge',
      unit: 'value',
      points: [],
      maxPoints: 1000,
      ...definition
    };

    this.state.metrics.set(name, metric);
    return metric;
  }

  /**
   * 记录指标值
   */
  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.state.metrics.get(name);
    if (!metric) {
      throw new Error(`Metric "${name}" not registered`);
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      labels
    };

    metric.points.push(point);

    // 限制历史数据长度
    const maxPoints = metric.maxPoints || 1000;
    if (metric.points.length > maxPoints) {
      metric.points = metric.points.slice(-maxPoints);
    }

    // 检查告警规则
    this.checkAlertRules(name, value, labels);
  }

  /**
   * 获取指标当前值
   */
  getCurrentValue(name: string, labels?: Record<string, string>): number | null {
    const metric = this.state.metrics.get(name);
    if (!metric || metric.points.length === 0) {
      return null;
    }

    if (!labels) {
      return metric.points[metric.points.length - 1].value;
    }

    // 按标签过滤
    for (let i = metric.points.length - 1; i >= 0; i--) {
      const point = metric.points[i];
      if (this.labelsMatch(point.labels, labels)) {
        return point.value;
      }
    }

    return null;
  }

  /**
   * 获取指标历史数据
   */
  getHistory(name: string, timeRangeMs?: number): MetricPoint[] {
    const metric = this.state.metrics.get(name);
    if (!metric) {
      return [];
    }

    if (!timeRangeMs) {
      return metric.points;
    }

    const cutoff = Date.now() - timeRangeMs;
    return metric.points.filter(p => p.timestamp >= cutoff);
  }

  /**
   * 获取所有指标摘要
   */
  getMetricsSummary(): Array<{name: string; currentValue: number; unit: string; change: number}> {
    const summary: Array<{name: string; currentValue: number; unit: string; change: number}> = [];

    this.state.metrics.forEach((metric, name) => {
      if (metric.points.length === 0) return;

      const current = metric.points[metric.points.length - 1].value;
      const previous = metric.points.length > 1 
        ? metric.points[metric.points.length - 2].value 
        : current;
      const change = ((current - previous) / previous) * 100;

      summary.push({
        name,
        currentValue: current,
        unit: metric.unit,
        change: isFinite(change) ? change : 0
      });
    });

    return summary;
  }

  // ============== 告警管理 ==============

  /**
   * 添加告警规则
   */
  addAlertRule(rule: AlertRule): void {
    this.state.alertRules.set(rule.id, rule);
  }

  /**
   * 移除告警规则
   */
  removeAlertRule(ruleId: string): void {
    this.state.alertRules.delete(ruleId);
    // 同时移除相关的告警实例
    this.state.alerts.forEach((alert, id) => {
      if (alert.ruleId === ruleId) {
        this.state.alerts.delete(id);
      }
    });
  }

  /**
   * 检查告警规则
   */
  private checkAlertRules(
    metricName: string, 
    value: number, 
    labels?: Record<string, string>
  ): void {
    this.state.alertRules.forEach((rule, ruleId) => {
      if (!rule.enabled || rule.metricName !== metricName) {
        return;
      }

      // 检查标签匹配
      if (rule.labels && !this.labelsMatch(labels, rule.labels)) {
        return;
      }

      // 检查阈值
      const isTriggered = this.evaluateCondition(value, rule.operator, rule.threshold);
      
      if (!isTriggered) {
        // 如果告警正在触发，解决它
        const existingAlert = this.state.alerts.get(ruleId);
        if (existingAlert && existingAlert.status === 'firing') {
          existingAlert.status = 'resolved';
          existingAlert.resolvedAt = Date.now();
        }
        return;
      }

      // 检查持续时间
      if (rule.duration) {
        const history = this.getHistory(metricName, rule.duration * 1000);
        const allTriggered = history.every(p => 
          this.evaluateCondition(p.value, rule.operator, rule.threshold)
        );
        if (!allTriggered) {
          return;
        }
      }

      // 创建或更新告警实例
      const existingAlert = this.state.alerts.get(ruleId);
      if (existingAlert) {
        if (existingAlert.status !== 'firing') {
          existingAlert.status = 'firing';
          existingAlert.firingAt = Date.now();
        }
        existingAlert.currentValue = value;
      } else {
        const alert: AlertInstance = {
          id: `alert-${ruleId}-${Date.now()}`,
          ruleId,
          ruleName: rule.name,
          status: 'firing',
          severity: rule.severity,
          currentValue: value,
          threshold: rule.threshold,
          firingAt: Date.now(),
          message: rule.message || this.generateAlertMessage(rule, value),
          labels
        };
        this.state.alerts.set(ruleId, alert);
      }
    });
  }

  /**
   * 评估条件
   */
  private evaluateCondition(value: number, operator: AlertRule['operator'], threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
    }
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, value: number): string {
    return `告警：${rule.name} - 指标 ${rule.metricName} ${rule.operator} ${rule.threshold} (当前值：${value})`;
  }

  /**
   * 标签匹配检查
   */
  private labelsMatch(actual?: Record<string, string>, expected?: Record<string, string>): boolean {
    if (!expected) return true;
    if (!actual) return false;
    
    return Object.entries(expected).every(([key, value]) => actual[key] === value);
  }

  /**
   * 获取活动告警
   */
  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.state.alerts.values())
      .filter(alert => alert.status === 'firing');
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): AlertInstance[] {
    return Array.from(this.state.alerts.values());
  }

  // ============== 图表生成 ==============

  /**
   * 生成 ASCII 折线图
   */
  generateLineChart(
    metricName: string,
    timeRangeMs: number = 60000,
    width: number = 60,
    height: number = 15
  ): string {
    const points = this.getHistory(metricName, timeRangeMs);
    if (points.length === 0) {
      return 'No data available';
    }

    const values = points.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // 创建画布
    const canvas: string[][] = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    );

    // 绘制数据点
    const step = Math.max(1, Math.floor(points.length / width));
    for (let i = 0; i < points.length; i += step) {
      const x = Math.min(Math.floor((i / points.length) * width), width - 1);
      const normalizedValue = (values[i] - minValue) / range;
      const y = Math.floor((1 - normalizedValue) * (height - 1));
      
      canvas[y][x] = '●';
    }

    // 添加边框和标签
    const lines: string[] = [];
    lines.push(`┌${'─'.repeat(width)}┐ ${metricName}`);
    
    canvas.forEach((row, i) => {
      const label = i === 0 ? maxValue.toFixed(1).padStart(6) :
                    i === height - 1 ? minValue.toFixed(1).padStart(6) :
                    ' '.repeat(6);
      lines.push(`│${label} │${row.join('')}│`);
    });

    lines.push(`└${'─'.repeat(width + 8)}┘`);
    
    return lines.join('\n');
  }

  /**
   * 生成 ASCII 条形图
   */
  generateBarChart(
    metrics: string[],
    width: number = 40
  ): string {
    if (metrics.length === 0) {
      return 'No metrics to display';
    }

    const data = metrics.map(name => ({
      name,
      value: this.getCurrentValue(name) || 0
    }));

    const maxValue = Math.max(...data.map(d => d.value));
    const lines: string[] = [];

    lines.push(`┌${'─'.repeat(width + 30)}┐`);

    data.forEach(item => {
      const barLength = Math.round((item.value / maxValue) * width);
      const bar = '█'.repeat(barLength);
      const valueStr = item.value.toFixed(2).padStart(10);
      lines.push(`│ ${item.name.padEnd(15)} │${bar} ${valueStr} │`);
    });

    lines.push(`└${'─'.repeat(width + 30)}┘`);

    return lines.join('\n');
  }

  /**
   * 生成仪表盘 (Gauge)
   */
  generateGauge(
    metricName: string,
    min: number = 0,
    max: number = 100,
    size: number = 20
  ): string {
    const value = this.getCurrentValue(metricName);
    if (value === null) {
      return 'No data available';
    }

    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const filled = Math.floor(normalized * size);
    const empty = size - filled;

    const percentage = (normalized * 100).toFixed(1);
    
    return [
      `╭${'─'.repeat(size + 4)}╮`,
      `│ [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}% │`,
      `│ ${metricName.padEnd(size + 2)} │`,
      `│ Value: ${value.toFixed(2)} ${' '.repeat(size - 10)} │`,
      `╰${'─'.repeat(size + 4)}╯`
    ].join('\n');
  }

  /**
   * 生成 Markdown 表格
   */
  generateMarkdownTable(): string {
    const summary = this.getMetricsSummary();
    
    const lines: string[] = [];
    lines.push('| Metric | Current Value | Unit | Change |');
    lines.push('|--------|---------------|------|--------|');
    
    summary.forEach(item => {
      const changeStr = item.change >= 0 ? `+${item.change.toFixed(1)}%` : `${item.change.toFixed(1)}%`;
      const changeColor = item.change >= 0 ? '📈' : '📉';
      lines.push(`| ${item.name} | ${item.currentValue.toFixed(2)} | ${item.unit} | ${changeColor} ${changeStr} |`);
    });

    return lines.join('\n');
  }

  // ============== 系统指标采集 ==============

  /**
   * 采集 CPU 指标
   */
  collectCpuMetrics(): void {
    const cpus = os.cpus();
    const totalLoad = os.loadavg()[0];
    
    // 计算平均 CPU 使用率
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      const times = cpu.times;
      totalIdle += times.idle;
      totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
    });

    const usage = 100 * (1 - totalIdle / totalTick);
    
    // 自动注册指标
    if (!this.state.metrics.has('cpu_usage')) {
      this.registerMetric('cpu_usage', { unit: 'percent' });
    }
    if (!this.state.metrics.has('cpu_load1')) {
      this.registerMetric('cpu_load1', { unit: 'load' });
    }
    
    this.record('cpu_usage', usage);
    this.record('cpu_load1', totalLoad);
  }

  /**
   * 采集内存指标
   */
  collectMemoryMetrics(): void {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    // 自动注册指标
    if (!this.state.metrics.has('memory_total')) {
      this.registerMetric('memory_total', { unit: 'bytes' });
    }
    if (!this.state.metrics.has('memory_used')) {
      this.registerMetric('memory_used', { unit: 'bytes' });
    }
    if (!this.state.metrics.has('memory_free')) {
      this.registerMetric('memory_free', { unit: 'bytes' });
    }
    if (!this.state.metrics.has('memory_usage')) {
      this.registerMetric('memory_usage', { unit: 'percent' });
    }

    this.record('memory_total', total);
    this.record('memory_used', used);
    this.record('memory_free', free);
    this.record('memory_usage', usage);
  }

  /**
   * 采集系统指标
   */
  collectSystemMetrics(): void {
    this.collectCpuMetrics();
    this.collectMemoryMetrics();
    
    // 自动注册 uptime 指标
    if (!this.state.metrics.has('uptime')) {
      this.registerMetric('uptime', { unit: 'seconds' });
    }
    
    // 磁盘使用率
    this.record('uptime', os.uptime());
  }

  // ============== 自动采集 ==============

  /**
   * 启动自动采集
   */
  startAutoCollection(intervalMs: number = 5000): void {
    if (this.timers.has('auto-collection')) {
      this.stopAutoCollection();
    }

    const timer = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    this.timers.set('auto-collection', timer);
  }

  /**
   * 停止自动采集
   */
  stopAutoCollection(): void {
    const timer = this.timers.get('auto-collection');
    if (timer) {
      clearInterval(timer);
      this.timers.delete('auto-collection');
    }
  }

  // ============== 仪表板渲染 ==============

  /**
   * 渲染完整仪表板
   */
  renderDashboard(): string {
    const lines: string[] = [];
    
    // 标题
    lines.push('╔════════════════════════════════════════════════════════╗');
    lines.push(`║  ${this.state.config?.name || 'Metrics Dashboard'} `.padEnd(57) + '║');
    lines.push('╚════════════════════════════════════════════════════════╝');
    lines.push('');

    // 指标摘要
    lines.push('📊 指标摘要:');
    lines.push(this.generateMarkdownTable());
    lines.push('');

    // 活动告警
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length > 0) {
      lines.push('🚨 活动告警:');
      activeAlerts.forEach(alert => {
        const severityIcon = {
          info: 'ℹ️',
          warning: '⚠️',
          critical: '🔴',
          emergency: '🆘'
        }[alert.severity];
        lines.push(`  ${severityIcon} [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
      lines.push('');
    }

    // 关键指标仪表盘
    lines.push('📈 关键指标:');
    ['cpu_usage', 'memory_usage'].forEach(metric => {
      if (this.state.metrics.has(metric)) {
        lines.push(this.generateGauge(metric, 0, 100, 25));
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  // ============== 工具方法 ==============

  /**
   * 清空指标数据
   */
  clearMetrics(name?: string): void {
    if (name) {
      const metric = this.state.metrics.get(name);
      if (metric) {
        metric.points = [];
      }
    } else {
      this.state.metrics.forEach(metric => {
        metric.points = [];
      });
    }
  }

  /**
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = Array.from(this.state.metrics.entries()).map(([name, metric]) => ({
      name,
      type: metric.type,
      unit: metric.unit,
      points: metric.points
    }));

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV 格式
    const lines: string[] = ['timestamp,metric,value'];
    data.forEach(metric => {
      metric.points.forEach(point => {
        lines.push(`${point.timestamp},${metric.name},${point.value}`);
      });
    });
    return lines.join('\n');
  }

  /**
   * 销毁仪表板
   */
  destroy(): void {
    this.stopAutoCollection();
    this.state.metrics.clear();
    this.state.alertRules.clear();
    this.state.alerts.clear();
  }
}

// ============== 快捷函数 ==============

/**
 * 创建仪表板实例
 */
export function createDashboard(config?: DashboardConfig): MetricsDashboard {
  return new MetricsDashboard(config);
}

/**
 * 快速监控系统指标
 */
export function quickMonitor(intervalMs: number = 5000): MetricsDashboard {
  const dashboard = new MetricsDashboard({
    name: 'System Monitor',
    refreshInterval: intervalMs,
    metrics: ['cpu_usage', 'memory_usage', 'cpu_load1', 'uptime']
  });

  dashboard.startAutoCollection(intervalMs);
  
  return dashboard;
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * @example
 * // 1. 创建仪表板
 * const dashboard = createDashboard({
 *   name: 'My Dashboard',
 *   metrics: ['cpu_usage', 'memory_usage', 'request_count']
 * });
 * 
 * @example
 * // 2. 记录指标
 * dashboard.record('cpu_usage', 75.5);
 * dashboard.record('memory_usage', 60.2);
 * 
 * @example
 * // 3. 添加告警规则
 * dashboard.addAlertRule({
 *   id: 'high-cpu',
 *   name: 'CPU 使用率过高',
 *   metricName: 'cpu_usage',
 *   operator: '>',
 *   threshold: 80,
 *   severity: 'warning',
 *   duration: 60, // 持续 60 秒才触发
 *   enabled: true
 * });
 * 
 * @example
 * // 4. 生成图表
 * console.log(dashboard.generateGauge('cpu_usage', 0, 100, 20));
 * console.log(dashboard.generateLineChart('cpu_usage', 60000));
 * 
 * @example
 * // 5. 渲染完整仪表板
 * console.log(dashboard.renderDashboard());
 * 
 * @example
 * // 6. 快速监控
 * const monitor = quickMonitor(5000);
 * setTimeout(() => {
 *   console.log(monitor.renderDashboard());
 * }, 10000);
 */

export default MetricsDashboard;
