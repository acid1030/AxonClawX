/**
 * KAEL 系统监控仪表板中间件
 * 
 * 功能:
 * 1. CPU/内存使用率实时监控
 * 2. 请求统计与性能指标
 * 3. 系统健康状态检测
 * 4. WebSocket 实时数据推送
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============ 类型定义 ============

/**
 * 系统健康状态
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * 系统监控指标
 */
export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;        // CPU 使用率百分比
    cores: number;        // CPU 核心数
    load: number[];       // 负载平均值 [1min, 5min, 15min]
  };
  memory: {
    total: number;        // 总内存 (MB)
    used: number;         // 已使用内存 (MB)
    free: number;         // 空闲内存 (MB)
    usage: number;        // 内存使用率百分比
  };
  requests: {
    total: number;        // 总请求数
    active: number;       // 活跃请求数
    perSecond: number;    // 每秒请求数
    avgResponseTime: number; // 平均响应时间 (ms)
  };
  health: {
    status: HealthStatus;
    uptime: number;       // 运行时间 (秒)
    pid: number;          // 进程 ID
  };
}

/**
 * 请求统计
 */
export interface RequestStats {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
}

/**
 * 仪表板配置
 */
export interface DashboardConfig {
  sampleInterval?: number;    // 采样间隔 (ms)
  historySize?: number;       // 历史数据保留数量
  port?: number;              // 仪表板服务端口
  enableWebSocket?: boolean;  // 是否启用 WebSocket
}

// ============ 系统监控器 ============

/**
 * 系统监控器 - 收集系统指标
 */
export class SystemMonitor extends EventEmitter {
  private metricsHistory: SystemMetrics[] = [];
  private requestStats: RequestStats[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private startTime: number;
  private sampleInterval: number;
  private historySize: number;
  private totalRequests: number = 0;
  private activeRequests: number = 0;

  constructor(config: DashboardConfig = {}) {
    super();
    this.sampleInterval = config.sampleInterval || 5000; // 默认 5 秒采样
    this.historySize = config.historySize || 100;        // 保留 100 条历史记录
    this.startTime = Date.now();
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metricsHistory.push(metrics);
      
      // 限制历史记录大小
      if (this.metricsHistory.length > this.historySize) {
        this.metricsHistory.shift();
      }

      this.emit('metrics', metrics);
    }, this.sampleInterval);

    // 立即收集一次
    const initialMetrics = this.collectMetrics();
    this.metricsHistory.push(initialMetrics);
    this.emit('metrics', initialMetrics);
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * 收集系统指标
   */
  private collectMetrics(): SystemMetrics {
    const now = Date.now();
    
    // 获取 CPU 使用率
    const cpus = this.getCPUUsage();
    
    // 获取内存使用率
    const memory = this.getMemoryUsage();
    
    // 计算请求统计
    const requestStats = this.getRequestStats();
    
    // 确定健康状态
    const healthStatus = this.determineHealthStatus(cpus.usage, memory.usage);

    return {
      timestamp: now,
      cpu: cpus,
      memory: memory,
      requests: requestStats,
      health: {
        status: healthStatus,
        uptime: Math.floor((now - this.startTime) / 1000),
        pid: process.pid
      }
    };
  }

  /**
   * 获取 CPU 使用率
   */
  private getCPUUsage(): { usage: number; cores: number; load: number[] } {
    const os = require('os');
    const cpus = os.cpus();
    const cores = cpus.length;
    
    // 计算平均 CPU 使用率
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      const times = cpu.times;
      totalIdle += times.idle;
      totalTick += times.user + times.nice + times.sys + times.idle + times.irq + times.softirq;
    });

    const usage = 100 - (totalIdle / totalTick) * 100;
    
    // 获取负载平均值
    const load = os.loadavg();

    return {
      usage: Math.round(usage * 100) / 100,
      cores,
      load: load.map(l => Math.round(l * 100) / 100)
    };
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): { total: number; used: number; free: number; usage: number } {
    const os = require('os');
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total: Math.round(total / 1024 / 1024), // MB
      used: Math.round(used / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      usage: Math.round(usage * 100) / 100
    };
  }

  /**
   * 获取请求统计
   */
  private getRequestStats(): { total: number; active: number; perSecond: number; avgResponseTime: number } {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 计算最近 1 秒的请求数
    const recentRequests = this.requestStats.filter(r => r.timestamp > oneSecondAgo);
    const perSecond = recentRequests.length;
    
    // 计算平均响应时间
    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
      : 0;

    return {
      total: this.totalRequests,
      active: this.activeRequests,
      perSecond,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100
    };
  }

  /**
   * 确定健康状态
   */
  private determineHealthStatus(cpuUsage: number, memoryUsage: number): HealthStatus {
    if (cpuUsage > 90 || memoryUsage > 90) {
      return 'critical';
    } else if (cpuUsage > 70 || memoryUsage > 70) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * 记录请求
   */
  recordRequest(stats: RequestStats): void {
    this.totalRequests++;
    this.requestStats.push(stats);
    
    // 限制请求统计历史记录
    if (this.requestStats.length > 1000) {
      this.requestStats.shift();
    }
  }

  /**
   * 增加活跃请求数
   */
  incrementActiveRequests(): void {
    this.activeRequests++;
  }

  /**
   * 减少活跃请求数
   */
  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * 获取历史指标
   */
  getHistory(): SystemMetrics[] {
    return this.metricsHistory;
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): SystemMetrics {
    if (this.metricsHistory.length === 0) {
      return this.collectMetrics();
    }
    return this.metricsHistory[this.metricsHistory.length - 1];
  }
}

// ============ 仪表板中间件 ============

/**
 * 创建系统监控仪表板中间件
 */
export function createPowerDashboard(config: DashboardConfig = {}) {
  const monitor = new SystemMonitor(config);
  let htmlContent: string | null = null;

  // 启动监控
  monitor.start();

  /**
   * 中间件函数
   */
  const middleware = async (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    const url = req.url || '/';
    const startTime = Date.now();

    // 记录请求开始
    monitor.incrementActiveRequests();

    // 仪表板页面路由
    if (url === '/dashboard' || url === '/dashboard.html') {
      try {
        if (!htmlContent) {
          htmlContent = readFileSync(
            join(__dirname, '../monitor/dashboard-power.html'),
            'utf-8'
          );
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Dashboard page not found',
          message: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
      monitor.decrementActiveRequests();
      return;
    }

    // API 路由 - 获取监控数据
    if (url === '/api/metrics') {
      const metrics = monitor.getCurrentMetrics();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(metrics));
      monitor.decrementActiveRequests();
      return;
    }

    // API 路由 - 获取历史数据
    if (url === '/api/metrics/history') {
      const history = monitor.getHistory();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(history));
      monitor.decrementActiveRequests();
      return;
    }

    // API 路由 - 健康检查
    if (url === '/api/health') {
      const metrics = monitor.getCurrentMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: metrics.health.status,
        uptime: metrics.health.uptime,
        timestamp: metrics.timestamp
      }));
      monitor.decrementActiveRequests();
      return;
    }

    // 记录请求统计
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      monitor.recordRequest({
        path: url,
        method: req.method || 'GET',
        statusCode: res.statusCode,
        responseTime,
        timestamp: Date.now()
      });
      monitor.decrementActiveRequests();
    });

    // 调用下一个中间件
    if (next) {
      next();
    }
  };

  return {
    middleware,
    monitor,
    // 导出监控器供外部使用
    getMetrics: () => monitor.getCurrentMetrics(),
    getHistory: () => monitor.getHistory()
  };
}

// ============ 导出 ============

export { SystemMonitor };
export default createPowerDashboard;
