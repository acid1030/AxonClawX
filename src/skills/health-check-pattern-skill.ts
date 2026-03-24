/**
 * Health Check Pattern Skill - ACE 健康监控工具
 * 
 * @module health-check-pattern-skill
 * @description 提供健康检查定义、执行和状态报告功能
 * @version 1.0.0
 * @author Axon
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

// ============================================================================
// 类型定义
// ============================================================================

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  value?: number | string;
  threshold?: number | string;
  timestamp: number;
  duration?: number;
}

export interface HealthReport {
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

export interface HealthCheckConfig {
  name: string;
  command?: string;
  threshold?: number;
  criticalThreshold?: number;
  timeout?: number;
  enabled?: boolean;
}

export interface SystemMetrics {
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

// ============================================================================
// 健康检查器类
// ============================================================================

export class HealthChecker {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();

  /**
   * 注册健康检查
   */
  register(config: HealthCheckConfig): void {
    if (config.enabled === false) return;
    this.checks.set(config.name, {
      timeout: config.timeout ?? 5000,
      enabled: true,
      ...config
    });
  }

  /**
   * 注销健康检查
   */
  unregister(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
  }

  /**
   * 执行单个检查
   */
  async executeCheck(config: HealthCheckConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (config.command) {
        const { stdout, stderr } = await execAsync(config.command, {
          timeout: config.timeout ?? 5000
        });
        
        const value = this.parseCommandOutput(stdout, stderr);
        const status = this.evaluateStatus(value, config.threshold, config.criticalThreshold);
        
        return {
          name: config.name,
          status,
          message: status === 'healthy' ? 'Check passed' : `Value: ${value}`,
          value,
          threshold: config.threshold,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };
      } else {
        // 内置检查
        const result = await this.executeBuiltInCheck(config.name);
        return {
          ...result,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };
      }
    } catch (error: any) {
      return {
        name: config.name,
        status: 'critical',
        message: error.message || 'Check failed',
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 执行内置检查
   */
  private async executeBuiltInCheck(name: string): Promise<HealthCheckResult> {
    switch (name) {
      case 'cpu': {
        const usage = await this.getCPUUsage();
        return {
          name,
          status: this.evaluateStatus(usage, 70, 90),
          message: `CPU usage: ${usage.toFixed(1)}%`,
          value: usage,
          threshold: 70,
          timestamp: Date.now()
        };
      }
      
      case 'memory': {
        const usage = os.totalmem() > 0 ? ((os.totalmem() - os.freemem()) / os.totalmem()) * 100 : 0;
        return {
          name,
          status: this.evaluateStatus(usage, 80, 95),
          message: `Memory usage: ${usage.toFixed(1)}%`,
          value: usage,
          threshold: 80,
          timestamp: Date.now()
        };
      }
      
      case 'disk': {
        const usage = await this.getDiskUsage();
        return {
          name,
          status: this.evaluateStatus(usage, 80, 95),
          message: `Disk usage: ${usage.toFixed(1)}%`,
          value: usage,
          threshold: 80,
          timestamp: Date.now()
        };
      }
      
      case 'uptime': {
        const uptime = os.uptime();
        const hours = uptime / 3600;
        return {
          name,
          status: hours > 720 ? 'warning' : 'healthy', // 30 days
          message: `Uptime: ${this.formatUptime(uptime)}`,
          value: uptime,
          timestamp: Date.now()
        };
      }
      
      case 'load': {
        const load = os.loadavg()[0];
        const cores = os.cpus().length;
        const loadPercent = (load / cores) * 100;
        return {
          name,
          status: this.evaluateStatus(loadPercent, 70, 90),
          message: `Load average (1m): ${load.toFixed(2)} (${cores} cores)`,
          value: load,
          timestamp: Date.now()
        };
      }
      
      default:
        return {
          name,
          status: 'unknown',
          message: `Unknown check: ${name}`,
          timestamp: Date.now()
        };
    }
  }

  /**
   * 执行所有检查
   */
  async executeAll(): Promise<HealthReport> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];
    
    // 执行注册的检查
    for (const config of this.checks.values()) {
      const result = await this.executeCheck(config);
      results.push(result);
      this.results.set(config.name, result);
    }
    
    // 计算汇总
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      warning: results.filter(r => r.status === 'warning').length,
      critical: results.filter(r => r.status === 'critical').length,
      unknown: results.filter(r => r.status === 'unknown').length
    };
    
    // 确定整体状态
    let overall: HealthStatus = 'healthy';
    if (summary.critical > 0) overall = 'critical';
    else if (summary.warning > 0) overall = 'warning';
    else if (summary.unknown > 0) overall = 'unknown';
    
    return {
      overall,
      checks: results,
      summary,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const diskUsage = await this.getDiskUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usagePercent: totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0
      },
      disk: {
        total: 0, // Will be filled by getDiskUsage
        free: 0,
        used: 0,
        usagePercent: diskUsage
      },
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };
  }

  /**
   * 获取最近的检查结果
   */
  getResults(): Map<string, HealthCheckResult> {
    return new Map(this.results);
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private parseCommandOutput(stdout: string, stderr: string): number | string {
    const output = stdout.trim() || stderr.trim();
    const num = parseFloat(output);
    return isNaN(num) ? output : num;
  }

  private evaluateStatus(
    value: number | string | undefined,
    threshold?: number,
    criticalThreshold?: number
  ): HealthStatus {
    if (typeof value !== 'number') return 'unknown';
    if (criticalThreshold !== undefined && value >= criticalThreshold) return 'critical';
    if (threshold !== undefined && value >= threshold) return 'warning';
    return 'healthy';
  }

  private async getCPUUsage(): Promise<number> {
    const start = os.cpus().map(cpu => cpu.times);
    await new Promise(resolve => setTimeout(resolve, 100));
    const end = os.cpus().map(cpu => cpu.times);
    
    const total = (time: any) => 
      time.user + time.nice + time.sys + time.idle + time.irq + time.softirq + time.steal;
    
    const diffs = end.map((endCPU, i) => {
      const startCPU = start[i];
      const endTotal = total(endCPU);
      const startTotal = total(startCPU);
      const idle = endCPU.idle - startCPU.idle;
      const totalDiff = endTotal - startTotal;
      
      if (totalDiff === 0 || isNaN(totalDiff)) return 0;
      const usage = ((totalDiff - idle) / totalDiff) * 100;
      return isNaN(usage) ? 0 : usage;
    });
    
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return isNaN(avg) ? 0 : avg;
  }

  private async getDiskUsage(): Promise<number> {
    try {
      if (os.platform() === 'darwin' || os.platform() === 'linux') {
        const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\'');
        return parseFloat(stdout.replace('%', ''));
      } else if (os.platform() === 'win32') {
        const { stdout } = await execAsync(
          'wmic logicaldisk where "DeviceID=\'C:\'" get PercentFreeSpace /value'
        );
        const match = stdout.match(/PercentFreeSpace=(\d+)/);
        return match ? 100 - parseInt(match[1]) : 0;
      }
    } catch (error) {
      console.error('Failed to get disk usage:', error);
    }
    return 0;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  }
}

// ============================================================================
// 函数式 API (便捷函数)
// ============================================================================

const defaultChecker = new HealthChecker();

/**
 * 注册健康检查
 */
export function registerCheck(config: HealthCheckConfig): void {
  defaultChecker.register(config);
}

/**
 * 注销健康检查
 */
export function unregisterCheck(name: string): void {
  defaultChecker.unregister(name);
}

/**
 * 执行所有检查并生成报告
 */
export async function runHealthCheck(): Promise<HealthReport> {
  return defaultChecker.executeAll();
}

/**
 * 获取系统指标
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  return defaultChecker.getSystemMetrics();
}

/**
 * 获取最近的检查结果
 */
export function getCheckResults(): Map<string, HealthCheckResult> {
  return defaultChecker.getResults();
}

/**
 * 快速检查单个指标
 */
export async function checkCPU(): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name: 'cpu' });
}

export async function checkMemory(): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name: 'memory' });
}

export async function checkDisk(): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name: 'disk' });
}

export async function checkUptime(): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name: 'uptime' });
}

export async function checkLoad(): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name: 'load' });
}

/**
 * 自定义命令检查
 */
export async function checkCommand(
  name: string,
  command: string,
  threshold?: number,
  criticalThreshold?: number
): Promise<HealthCheckResult> {
  const checker = new HealthChecker();
  return checker.executeCheck({ name, command, threshold, criticalThreshold });
}

// ============================================================================
// 导出默认实例
// ============================================================================

export const healthChecker = defaultChecker;
export default HealthChecker;
