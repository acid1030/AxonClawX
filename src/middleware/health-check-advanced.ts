/**
 * Advanced Health Check Middleware
 * 
 * 提供全面的系统健康检查端点，包括:
 * 1. 数据库连接检查 (支持多种数据库)
 * 2. Redis 连接检查
 * 3. 外部 API 可达性检查
 * 4. 磁盘空间检查
 * 5. 内存使用检查
 * 6. CPU 负载检查
 * 
 * @author KAEL (Axon Engineering)
 * @version 2.0.0
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface CheckResult {
  /** 检查是否通过 */
  healthy: boolean;
  /** 状态消息 */
  message: string;
  /** 响应时间 (毫秒) */
  responseTime?: number;
  /** 错误信息 (如果有) */
  error?: string;
  /** 详细数据 */
  details?: Record<string, any>;
}

export interface DatabaseConfig {
  /** 数据库类型 */
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  /** 连接字符串或路径 */
  connectionString?: string;
  /** 数据库路径 (SQLite) */
  dbPath?: string;
  /** 连接超时 (毫秒) */
  timeout?: number;
}

export interface RedisConfig {
  /** Redis 主机 */
  host: string;
  /** Redis 端口 */
  port: number;
  /** Redis 密码 (可选) */
  password?: string;
  /** 连接超时 (毫秒) */
  timeout?: number;
}

export interface ExternalAPIConfig {
  /** API 名称 */
  name: string;
  /** API URL */
  url: string;
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'HEAD';
  /** 期望的响应状态码 */
  expectedStatus?: number;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 是否关键依赖 (影响整体健康状态) */
  critical?: boolean;
}

export interface HealthCheckConfig {
  /** 数据库配置 */
  database?: DatabaseConfig;
  /** Redis 配置 */
  redis?: RedisConfig;
  /** 外部 API 检查列表 */
  externalAPIs?: ExternalAPIConfig[];
  /** 磁盘空间警告阈值 (%) */
  diskWarningThreshold?: number;
  /** 磁盘空间严重阈值 (%) */
  diskCriticalThreshold?: number;
  /** 内存使用警告阈值 (%) */
  memoryWarningThreshold?: number;
  /** 内存使用严重阈值 (%) */
  memoryCriticalThreshold?: number;
  /** CPU 使用率警告阈值 (%) */
  cpuWarningThreshold?: number;
  /** CPU 使用率严重阈值 (%) */
  cpuCriticalThreshold?: number;
  /** 版本信息 */
  version?: string;
  /** 服务名称 */
  serviceName?: string;
}

export interface HealthReport {
  /** 整体健康状态 */
  status: HealthStatus;
  /** 检查时间戳 */
  timestamp: string;
  /** 运行时间 (秒) */
  uptime: number;
  /** 版本信息 */
  version: string;
  /** 服务名称 */
  serviceName: string;
  /** 详细检查结果 */
  checks: {
    /** 数据库状态 */
    database?: CheckResult;
    /** Redis 状态 */
    redis?: CheckResult;
    /** 外部 API 状态 */
    externalAPIs?: CheckResult[];
    /** 磁盘状态 */
    disk: CheckResult & {
      /** 总空间 (GB) */
      totalGB?: number;
      /** 可用空间 (GB) */
      freeGB?: number;
      /** 使用率 (%) */
      usagePercent?: number;
    };
    /** 内存状态 */
    memory: CheckResult & {
      /** 总内存 (GB) */
      totalGB?: number;
      /** 可用内存 (GB) */
      freeGB?: number;
      /** 使用率 (%) */
      usagePercent?: number;
    };
    /** CPU 状态 */
    cpu: CheckResult & {
      /** 使用率 (%) */
      usagePercent?: number;
      /** 核心数 */
      cores?: number;
      /** 负载 (1/5/15 分钟) */
      load?: number[];
    };
  };
  /** 摘要信息 */
  summary: {
    /** 总检查数 */
    totalChecks: number;
    /** 通过检查数 */
    passedChecks: number;
    /** 失败检查数 */
    failedChecks: number;
    /** 警告信息 */
    warnings: string[];
  };
}

// ============================================================================
// 高级健康检查类
// ============================================================================

export class AdvancedHealthChecker {
  private config: Required<Omit<HealthCheckConfig, 'database' | 'redis' | 'externalAPIs'>> & {
    database?: DatabaseConfig;
    redis?: RedisConfig;
    externalAPIs?: ExternalAPIConfig[];
  };

  constructor(config: HealthCheckConfig = {}) {
    this.config = {
      database: config.database,
      redis: config.redis,
      externalAPIs: config.externalAPIs || [],
      diskWarningThreshold: config.diskWarningThreshold || 80,
      diskCriticalThreshold: config.diskCriticalThreshold || 90,
      memoryWarningThreshold: config.memoryWarningThreshold || 80,
      memoryCriticalThreshold: config.memoryCriticalThreshold || 90,
      cpuWarningThreshold: config.cpuWarningThreshold || 80,
      cpuCriticalThreshold: config.cpuCriticalThreshold || 90,
      version: config.version || '2.0.0',
      serviceName: config.serviceName || 'AxonClaw',
    };
  }

  /**
   * 执行完整健康检查
   */
  public async checkAll(): Promise<HealthReport> {
    const checks: any = {
      disk: await this.checkDisk(),
      memory: await this.checkMemory(),
      cpu: await this.checkCPU(),
    };

    // 数据库检查 (如果配置了)
    if (this.config.database) {
      checks.database = await this.checkDatabase();
    }

    // Redis 检查 (如果配置了)
    if (this.config.redis) {
      checks.redis = await this.checkRedis();
    }

    // 外部 API 检查 (如果配置了)
    if (this.config.externalAPIs && this.config.externalAPIs.length > 0) {
      checks.externalAPIs = await Promise.all(
        this.config.externalAPIs.map(api => this.checkExternalAPI(api))
      );
    }

    // 计算摘要
    const allChecks = this.flattenChecks(checks);
    const passedChecks = allChecks.filter(c => c.healthy).length;
    const failedChecks = allChecks.filter(c => !c.healthy).length;
    const warnings = this.generateWarnings(checks);

    // 确定整体状态
    const criticalChecks = [checks.database, checks.redis].filter(c => c && !c.healthy);
    const hasCriticalFailure = criticalChecks.length > 0 || 
      (checks.externalAPIs?.some(api => !api.healthy && api.details?.critical) ?? false);
    
    const status: HealthStatus = hasCriticalFailure ? 'unhealthy' : 
      failedChecks > 0 ? 'degraded' : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.config.version,
      serviceName: this.config.serviceName,
      checks,
      summary: {
        totalChecks: allChecks.length,
        passedChecks,
        failedChecks,
        warnings,
      },
    };
  }

  /**
   * 扁平化所有检查结果
   */
  private flattenChecks(checks: any): CheckResult[] {
    const results: CheckResult[] = [];
    
    if (checks.database) results.push(checks.database);
    if (checks.redis) results.push(checks.redis);
    if (checks.externalAPIs) results.push(...checks.externalAPIs);
    if (checks.disk) results.push(checks.disk);
    if (checks.memory) results.push(checks.memory);
    if (checks.cpu) results.push(checks.cpu);

    return results;
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(checks: any): string[] {
    const warnings: string[] = [];

    if (checks.disk && !checks.disk.healthy) {
      warnings.push(checks.disk.message);
    }
    if (checks.memory && !checks.memory.healthy) {
      warnings.push(checks.memory.message);
    }
    if (checks.cpu && !checks.cpu.healthy) {
      warnings.push(checks.cpu.message);
    }
    if (checks.externalAPIs) {
      checks.externalAPIs.forEach((api: CheckResult) => {
        if (!api.healthy && !api.details?.critical) {
          warnings.push(`${api.details?.name || 'External API'}: ${api.message}`);
        }
      });
    }

    return warnings;
  }

  /**
   * 数据库连接检查
   */
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    const config = this.config.database;

    if (!config) {
      return {
        healthy: true,
        message: 'Database not configured',
        responseTime: 0,
      };
    }

    try {
      switch (config.type) {
        case 'sqlite': {
          // SQLite 检查
          const dbPath = config.dbPath || path.join(process.cwd(), 'axonclaw.db');
          const exists = fs.existsSync(dbPath);
          
          if (!exists) {
            return {
              healthy: false,
              message: 'Database file not found',
              error: `Path: ${dbPath}`,
              responseTime: Date.now() - startTime,
            };
          }

          // 尝试读取文件验证完整性
          const stats = fs.statSync(dbPath);
          if (stats.size === 0) {
            return {
              healthy: false,
              message: 'Database file is empty',
              responseTime: Date.now() - startTime,
            };
          }

          return {
            healthy: true,
            message: 'SQLite database OK',
            responseTime: Date.now() - startTime,
            details: {
              type: 'sqlite',
              path: dbPath,
              size: stats.size,
            },
          };
        }

        case 'postgres':
        case 'mysql': {
          // PostgreSQL/MySQL 检查 (使用 TCP 连接测试)
          const [host, port] = (config.connectionString || '').split('@')[1]?.split(':')[0]?.split(',') || ['localhost', '5432'];
          const timeout = config.timeout || 5000;

          return await this.checkTCPConnection(host, parseInt(port), timeout, config.type);
        }

        case 'mongodb': {
          // MongoDB 检查 (使用 TCP 连接测试)
          const match = (config.connectionString || '').match(/\/\/([^:/]+)/);
          const host = match ? match[1] : 'localhost';
          const portMatch = (config.connectionString || '').match(/:([0-9]+)/);
          const port = portMatch ? parseInt(portMatch[1]) : 27017;
          const timeout = config.timeout || 5000;

          return await this.checkTCPConnection(host, port, timeout, 'MongoDB');
        }

        default:
          return {
            healthy: false,
            message: `Unsupported database type: ${config.type}`,
            responseTime: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        healthy: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * TCP 连接检查 (用于数据库)
   */
  private async checkTCPConnection(
    host: string,
    port: number,
    timeout: number,
    dbType: string
  ): Promise<CheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        socket.destroy();
        resolve({
          healthy: false,
          message: `${dbType} connection timeout`,
          error: `Timeout after ${timeout}ms`,
          responseTime: Date.now() - startTime,
        });
      }, timeout);

      socket.once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({
          healthy: true,
          message: `${dbType} connection OK`,
          responseTime: Date.now() - startTime,
          details: { host, port },
        });
      });

      socket.once('error', (error: Error) => {
        clearTimeout(timer);
        resolve({
          healthy: false,
          message: `${dbType} connection failed`,
          error: error.message,
          responseTime: Date.now() - startTime,
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * Redis 连接检查
   */
  private async checkRedis(): Promise<CheckResult> {
    const startTime = Date.now();
    const config = this.config.redis;

    if (!config) {
      return {
        healthy: true,
        message: 'Redis not configured',
        responseTime: 0,
      };
    }

    try {
      const timeout = config.timeout || 5000;

      return await new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();

        const timer = setTimeout(() => {
          socket.destroy();
          resolve({
            healthy: false,
            message: 'Redis connection timeout',
            error: `Timeout after ${timeout}ms`,
            responseTime: Date.now() - startTime,
          });
        }, timeout);

        socket.once('connect', () => {
          clearTimeout(timer);
          socket.destroy();
          resolve({
            healthy: true,
            message: 'Redis connection OK',
            responseTime: Date.now() - startTime,
            details: {
              host: config.host,
              port: config.port,
            },
          });
        });

        socket.once('error', (error: Error) => {
          clearTimeout(timer);
          resolve({
            healthy: false,
            message: 'Redis connection failed',
            error: error.message,
            responseTime: Date.now() - startTime,
          });
        });

        socket.connect(config.port, config.host);
      });
    } catch (error) {
      return {
        healthy: false,
        message: 'Redis connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 外部 API 检查
   */
  private async checkExternalAPI(apiConfig: ExternalAPIConfig): Promise<CheckResult & { details: { name: string; url: string; critical: boolean } }> {
    const startTime = Date.now();
    const timeout = apiConfig.timeout || 5000;
    const method = apiConfig.method || 'GET';
    const expectedStatus = apiConfig.expectedStatus || 200;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(apiConfig.url, {
        method,
        signal: controller.signal,
        headers: { 'User-Agent': 'AxonClaw-HealthCheck/2.0' },
      });

      clearTimeout(timer);

      const healthy = response.status === expectedStatus;
      
      return {
        healthy,
        message: healthy 
          ? `External API OK (${response.status})` 
          : `External API returned ${response.status} (expected ${expectedStatus})`,
        responseTime: Date.now() - startTime,
        details: {
          name: apiConfig.name,
          url: apiConfig.url,
          critical: apiConfig.critical ?? false,
          status: response.status,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'External API check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        details: {
          name: apiConfig.name,
          url: apiConfig.url,
          critical: apiConfig.critical ?? false,
        },
      };
    }
  }

  /**
   * 磁盘空间检查
   */
  private async checkDisk(): Promise<CheckResult & { totalGB: number; freeGB: number; usagePercent: number }> {
    try {
      const checkPath = this.config.database?.dbPath 
        ? path.dirname(this.config.database.dbPath) 
        : process.cwd();

      const stats = fs.statfsSync(checkPath);
      
      const blockSize = stats.bsize || 4096;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bfree * blockSize;
      const availableBytes = stats.bavail * blockSize;

      const totalGB = totalBytes / (1024 ** 3);
      const freeGB = availableBytes / (1024 ** 3);
      const usedGB = totalGB - freeGB;
      const usagePercent = (usedGB / totalGB) * 100;

      let healthy = true;
      let message = `Disk usage: ${usagePercent.toFixed(1)}%`;

      if (usagePercent >= this.config.diskCriticalThreshold) {
        healthy = false;
        message = `CRITICAL: Disk usage at ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= this.config.diskWarningThreshold) {
        message = `WARNING: Disk usage at ${usagePercent.toFixed(1)}%`;
      }

      return {
        healthy,
        message,
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Disk check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        totalGB: 0,
        freeGB: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * 内存使用检查
   */
  private async checkMemory(): Promise<CheckResult & { totalGB: number; freeGB: number; usagePercent: number }> {
    try {
      const totalBytes = os.totalmem();
      const freeBytes = os.freemem();
      const usedBytes = totalBytes - freeBytes;

      const totalGB = totalBytes / (1024 ** 3);
      const freeGB = freeBytes / (1024 ** 3);
      const usagePercent = (usedBytes / totalBytes) * 100;

      let healthy = true;
      let message = `Memory usage: ${usagePercent.toFixed(1)}%`;

      if (usagePercent >= this.config.memoryCriticalThreshold) {
        healthy = false;
        message = `CRITICAL: Memory usage at ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= this.config.memoryWarningThreshold) {
        message = `WARNING: Memory usage at ${usagePercent.toFixed(1)}%`;
      }

      return {
        healthy,
        message,
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Memory check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        totalGB: 0,
        freeGB: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * CPU 使用检查
   */
  private async checkCPU(): Promise<CheckResult & { usagePercent: number; cores?: number; load?: number[] }> {
    try {
      const cores = os.cpus().length;
      const load = os.loadavg();
      
      // 计算 CPU 使用率 (基于 1 分钟负载)
      const usagePercent = (load[0] / cores) * 100;

      let healthy = true;
      let message = `CPU load: ${load[0].toFixed(2)} (${usagePercent.toFixed(1)}%)`;

      if (usagePercent >= this.config.cpuCriticalThreshold) {
        healthy = false;
        message = `CRITICAL: CPU load at ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= this.config.cpuWarningThreshold) {
        message = `WARNING: CPU load at ${usagePercent.toFixed(1)}%`;
      }

      return {
        healthy,
        message,
        usagePercent: Math.round(usagePercent * 100) / 100,
        cores,
        load: load.map(l => Math.round(l * 100) / 100),
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'CPU check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        usagePercent: 0,
        cores: 0,
        load: [],
      };
    }
  }
}

// ============================================================================
// Express/Koa 中间件
// ============================================================================

/**
 * 创建高级健康检查中间件
 * 
 * @param config 健康检查配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createAdvancedHealthChecker(config: HealthCheckConfig = {}) {
  const checker = new AdvancedHealthChecker(config);

  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    const url = req.url || '';
    const pathname = url.split('?')[0];

    if (pathname !== '/health' && pathname !== '/api/health' && pathname !== '/health/advanced') {
      next();
      return;
    }

    try {
      const health = await checker.checkAll();

      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200;
      } else if (health.status === 'unhealthy') {
        statusCode = 503;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.statusCode = statusCode;
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }));
    }
  };
}

// ============================================================================
// 独立的健康检查函数
// ============================================================================

/**
 * 独立的健康检查函数
 * 
 * @param config 健康检查配置
 * @returns 健康报告对象
 */
export async function getAdvancedHealthStatus(config: HealthCheckConfig = {}): Promise<HealthReport> {
  const checker = new AdvancedHealthChecker(config);
  return await checker.checkAll();
}

// ============================================================================
// 预定义配置
// ============================================================================

export const advancedPresets = {
  /** Web 服务配置 */
  web: {
    diskWarningThreshold: 80,
    diskCriticalThreshold: 90,
    memoryWarningThreshold: 80,
    memoryCriticalThreshold: 90,
    cpuWarningThreshold: 80,
    cpuCriticalThreshold: 90,
    externalAPIs: [
      {
        name: 'Google DNS',
        url: 'https://8.8.8.8',
        method: 'HEAD',
        timeout: 3000,
        critical: false,
      },
    ],
  } as HealthCheckConfig,

  /** API 服务配置 */
  api: {
    diskWarningThreshold: 75,
    diskCriticalThreshold: 85,
    memoryWarningThreshold: 75,
    memoryCriticalThreshold: 85,
    cpuWarningThreshold: 75,
    cpuCriticalThreshold: 85,
  } as HealthCheckConfig,

  /** 数据库服务配置 */
  database: {
    diskWarningThreshold: 70,
    diskCriticalThreshold: 80,
    memoryWarningThreshold: 80,
    memoryCriticalThreshold: 90,
    cpuWarningThreshold: 70,
    cpuCriticalThreshold: 80,
  } as HealthCheckConfig,

  /** 严格配置 (用于关键服务) */
  strict: {
    diskWarningThreshold: 60,
    diskCriticalThreshold: 75,
    memoryWarningThreshold: 60,
    memoryCriticalThreshold: 75,
    cpuWarningThreshold: 60,
    cpuCriticalThreshold: 75,
  } as HealthCheckConfig,
};

export default createAdvancedHealthChecker;
